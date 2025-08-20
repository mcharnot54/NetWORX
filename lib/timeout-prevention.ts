// Timeout prevention and monitoring utilities

interface TimeoutMonitor {
  start: () => void;
  stop: () => void;
  reset: () => void;
  isActive: () => boolean;
}

interface RequestMetrics {
  endpoint: string;
  duration: number;
  status: 'success' | 'timeout' | 'error';
  timestamp: Date;
}

class TimeoutPreventionService {
  private activeRequests = new Map<string, TimeoutMonitor>();
  private requestMetrics: RequestMetrics[] = [];
  private maxMetricsHistory = 100;

  /**
   * Create a timeout monitor for a request
   */
  createMonitor(requestId: string, timeoutMs: number = 30000): TimeoutMonitor {
    let timeoutHandle: NodeJS.Timeout | null = null;
    let isActiveFlag = false;

    const monitor: TimeoutMonitor = {
      start: () => {
        if (isActiveFlag) return;
        
        isActiveFlag = true;
        timeoutHandle = setTimeout(() => {
          console.warn(`Request ${requestId} exceeded timeout of ${timeoutMs}ms`);
          this.recordMetric(requestId, timeoutMs, 'timeout');
          isActiveFlag = false;
        }, timeoutMs);
        
        this.activeRequests.set(requestId, monitor);
      },

      stop: () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
        isActiveFlag = false;
        this.activeRequests.delete(requestId);
      },

      reset: () => {
        monitor.stop();
        monitor.start();
      },

      isActive: () => isActiveFlag
    };

    return monitor;
  }

  /**
   * Wrap a request with timeout monitoring
   */
  async monitorRequest<T>(
    requestId: string,
    request: () => Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T> {
    const monitor = this.createMonitor(requestId, timeoutMs);
    const startTime = Date.now();
    
    try {
      monitor.start();
      const result = await request();
      
      const duration = Date.now() - startTime;
      this.recordMetric(requestId, duration, 'success');
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordMetric(requestId, duration, 'error');
      throw error;
    } finally {
      monitor.stop();
    }
  }

  /**
   * Record request metrics
   */
  private recordMetric(endpoint: string, duration: number, status: RequestMetrics['status']) {
    this.requestMetrics.push({
      endpoint,
      duration,
      status,
      timestamp: new Date()
    });

    // Keep only recent metrics
    if (this.requestMetrics.length > this.maxMetricsHistory) {
      this.requestMetrics = this.requestMetrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * Get timeout statistics
   */
  getTimeoutStats() {
    const now = Date.now();
    const recentMetrics = this.requestMetrics.filter(
      m => now - m.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    );

    const total = recentMetrics.length;
    const timeouts = recentMetrics.filter(m => m.status === 'timeout').length;
    const errors = recentMetrics.filter(m => m.status === 'error').length;
    const success = recentMetrics.filter(m => m.status === 'success').length;

    const avgDuration = total > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / total 
      : 0;

    return {
      total,
      success,
      timeouts,
      errors,
      successRate: total > 0 ? (success / total) * 100 : 100,
      timeoutRate: total > 0 ? (timeouts / total) * 100 : 0,
      avgDuration: Math.round(avgDuration),
      activeRequests: this.activeRequests.size
    };
  }

  /**
   * Cleanup old requests
   */
  cleanup() {
    // Force stop any requests that might be stuck
    for (const [requestId, monitor] of this.activeRequests.entries()) {
      if (monitor.isActive()) {
        console.warn(`Force stopping stuck request: ${requestId}`);
        monitor.stop();
      }
    }
    this.activeRequests.clear();
  }

  /**
   * Get slow requests (above threshold)
   */
  getSlowRequests(thresholdMs: number = 5000) {
    return this.requestMetrics
      .filter(m => m.duration > thresholdMs && m.status === 'success')
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
  }
}

// Global instance
export const timeoutPrevention = new TimeoutPreventionService();

// Enhanced fetch wrapper with timeout monitoring
export async function timeoutAwareFetch(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 30000, ...fetchOptions } = options;
  const requestId = `${fetchOptions.method || 'GET'} ${url}`;
  
  return timeoutPrevention.monitorRequest(
    requestId,
    async () => {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal
        });
        
        clearTimeout(timeoutHandle);
        return response;
      } catch (error) {
        clearTimeout(timeoutHandle);
        throw error;
      }
    },
    timeoutMs
  );
}

// Cleanup function for server environments
if (typeof window === 'undefined') {
  // Cleanup every 10 minutes
  setInterval(() => {
    timeoutPrevention.cleanup();
  }, 10 * 60 * 1000);
}
