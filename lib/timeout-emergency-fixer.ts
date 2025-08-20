// Emergency timeout fixer - immediate resolution for timeout issues
import { timeoutPrevention } from './timeout-prevention';

interface TimeoutEmergencyReport {
  criticalIssues: string[];
  fixes: string[];
  systemHealth: 'critical' | 'degraded' | 'healthy';
  recommendations: string[];
  timestamp: string;
}

class TimeoutEmergencyFixer {
  private emergencyMode = false;
  private lastEmergencyFix = 0;

  /**
   * Emergency timeout reset - immediate action for timeout issues
   */
  async emergencyFix(): Promise<TimeoutEmergencyReport> {
    const now = Date.now();
    this.emergencyMode = true;
    this.lastEmergencyFix = now;

    const report: TimeoutEmergencyReport = {
      criticalIssues: [],
      fixes: [],
      systemHealth: 'healthy',
      recommendations: [],
      timestamp: new Date().toISOString()
    };

    try {
      // 1. Clear all pending timeouts
      this.clearAllTimeouts();
      report.fixes.push('✅ Cleared all pending timeouts');

      // 2. Reset request monitoring
      timeoutPrevention.cleanup();
      report.fixes.push('✅ Reset request monitoring');

      // 3. Check system memory and clear caches if needed
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      
      if (heapUsedMB > 512) { // More than 512MB
        if (global.gc) {
          global.gc();
          report.fixes.push('✅ Forced garbage collection');
        }
        report.criticalIssues.push(`High memory usage: ${heapUsedMB}MB`);
        report.systemHealth = 'degraded';
      }

      // 4. Check for stuck processes
      const uptime = process.uptime();
      if (uptime > 3600) { // More than 1 hour
        report.recommendations.push('Consider restarting the development server');
      }

      // 5. Emergency timeout configurations
      this.applyEmergencyTimeouts();
      report.fixes.push('✅ Applied emergency timeout configurations');

      // 6. Health assessment
      if (report.criticalIssues.length > 0) {
        report.systemHealth = 'critical';
      } else if (heapUsedMB > 256 || uptime > 1800) {
        report.systemHealth = 'degraded';
      }

      // 7. Add recommendations based on findings
      if (report.systemHealth === 'critical') {
        report.recommendations.push('Restart development server immediately');
        report.recommendations.push('Check for memory leaks in long-running operations');
      } else if (report.systemHealth === 'degraded') {
        report.recommendations.push('Monitor system performance closely');
        report.recommendations.push('Consider restarting if issues persist');
      }

      return report;

    } catch (error) {
      report.criticalIssues.push(`Emergency fix failed: ${error}`);
      report.systemHealth = 'critical';
      return report;
    } finally {
      this.emergencyMode = false;
    }
  }

  /**
   * Clear all timeouts and intervals
   */
  private clearAllTimeouts(): void {
    try {
      // Get the highest timeout ID by creating a dummy timeout
      const highestId = setTimeout(() => {}, 1);
      
      // Clear all timeouts and intervals up to the highest ID
      for (let i = 0; i < highestId; i++) {
        clearTimeout(i);
        clearInterval(i);
      }
      
      // Clear the dummy timeout we created
      clearTimeout(highestId);
      
      console.log(`Cleared ${highestId} timeout/interval handles`);
    } catch (error) {
      console.error('Error clearing timeouts:', error);
    }
  }

  /**
   * Apply emergency timeout configurations
   */
  private applyEmergencyTimeouts(): void {
    // Set process-level timeout handling
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      // Set uncaught exception handler
      process.removeAllListeners('uncaughtException');
      process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception (timeout handler):', error);
        
        if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
          console.log('Timeout-related uncaught exception detected, attempting recovery...');
          this.emergencyFix();
        }
      });

      // Set unhandled rejection handler
      process.removeAllListeners('unhandledRejection');
      process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection (timeout handler):', reason);
        
        if (reason && typeof reason === 'object' && 'message' in reason) {
          const message = (reason as Error).message;
          if (message.includes('timeout') || message.includes('TIMEOUT')) {
            console.log('Timeout-related unhandled rejection detected, attempting recovery...');
            this.emergencyFix();
          }
        }
      });
    }
  }

  /**
   * Check if emergency mode is active
   */
  isEmergencyMode(): boolean {
    return this.emergencyMode;
  }

  /**
   * Get time since last emergency fix
   */
  timeSinceLastEmergencyFix(): number {
    return this.lastEmergencyFix > 0 ? Date.now() - this.lastEmergencyFix : -1;
  }

  /**
   * Quick health check for timeout issues
   */
  async quickHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    uptime: number;
    memory: string;
  }> {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const uptime = process.uptime();
    
    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

    if (heapUsedMB > 512) {
      issues.push(`High memory usage: ${heapUsedMB}MB`);
      status = 'critical';
    } else if (heapUsedMB > 256) {
      issues.push(`Elevated memory usage: ${heapUsedMB}MB`);
      status = 'degraded';
    }

    if (uptime > 3600) {
      issues.push(`Long uptime: ${Math.round(uptime / 60)} minutes`);
      if (status === 'healthy') status = 'degraded';
    }

    // Check timeout prevention stats
    const stats = timeoutPrevention.getTimeoutStats();
    if (stats.timeoutRate > 10) {
      issues.push(`High timeout rate: ${stats.timeoutRate}%`);
      status = 'critical';
    } else if (stats.timeoutRate > 5) {
      issues.push(`Elevated timeout rate: ${stats.timeoutRate}%`);
      if (status === 'healthy') status = 'degraded';
    }

    return {
      status,
      issues,
      uptime,
      memory: `${heapUsedMB}MB`
    };
  }
}

// Global emergency fixer instance
export const timeoutEmergencyFixer = new TimeoutEmergencyFixer();

// Convenience functions
export async function emergencyTimeoutFix() {
  return await timeoutEmergencyFixer.emergencyFix();
}

export async function quickTimeoutHealthCheck() {
  return await timeoutEmergencyFixer.quickHealthCheck();
}

// Auto-recovery system - monitors and fixes timeout issues automatically
let autoRecoveryEnabled = true;
let lastAutoRecovery = 0;

export function enableAutoRecovery() {
  autoRecoveryEnabled = true;
  
  // Set up automatic monitoring every 30 seconds
  setInterval(async () => {
    if (!autoRecoveryEnabled) return;
    
    const now = Date.now();
    if (now - lastAutoRecovery < 60000) return; // Don't run more than once per minute

    try {
      const health = await quickTimeoutHealthCheck();
      
      if (health.status === 'critical') {
        console.log('Critical timeout issues detected, running emergency fix...');
        lastAutoRecovery = now;
        const report = await emergencyTimeoutFix();
        console.log('Emergency fix completed:', report);
      }
    } catch (error) {
      console.error('Auto-recovery check failed:', error);
    }
  }, 30000);
}

export function disableAutoRecovery() {
  autoRecoveryEnabled = false;
}

// Initialize auto-recovery in development
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  enableAutoRecovery();
}
