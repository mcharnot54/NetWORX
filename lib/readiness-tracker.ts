/**
 * Automatic Readiness Tracking Service
 *
 * Monitors file uploads, data validation, and system configuration
 * to automatically update the Network Optimization Readiness checklist
 */

import { safeFetchJson, safeAsync } from './error-utils';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  page: string;
  category: "data" | "warehouse" | "transport" | "inventory" | "config";
}

interface FileUploadStatus {
  forecast: boolean;
  sku: boolean;
  network: boolean;
  cost?: boolean;
  capacity?: boolean;
}

interface ValidationStatus {
  forecast: boolean;
  sku: boolean;
  network: boolean;
  allValidated: boolean;
}

interface SystemStatus {
  databaseConnected: boolean;
  projectSelected: boolean;
  scenarioSelected: boolean;
}

export class ReadinessTracker {
  
  /**
   * Check file upload status for a scenario
   */
  static async checkFileUploadStatus(scenarioId?: number): Promise<FileUploadStatus> {
    if (!scenarioId) {
      return {
        forecast: false,
        sku: false,
        network: false,
        cost: false,
        capacity: false
      };
    }

    try {
      const data = await safeFetchJson(`/api/files?scenarioId=${scenarioId}`, {
        timeout: 5000,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!data) {
        return {
          forecast: false,
          sku: false,
          network: false,
          cost: false,
          capacity: false
        };
      }
      const files = data.data || [];

      // Check which data types have been uploaded and completed processing
      const uploadStatus: FileUploadStatus = {
        forecast: files.some((f: any) => 
          f.data_type === 'forecast' && f.processing_status === 'completed'
        ),
        sku: files.some((f: any) => 
          f.data_type === 'sku' && f.processing_status === 'completed'
        ),
        network: files.some((f: any) => 
          f.data_type === 'network' && f.processing_status === 'completed'
        ),
        cost: files.some((f: any) => 
          f.data_type === 'cost' && f.processing_status === 'completed'
        ),
        capacity: files.some((f: any) => 
          f.data_type === 'capacity' && f.processing_status === 'completed'
        )
      };

      return uploadStatus;
    } catch (error) {
      // Handle different types of errors quietly
      if (error instanceof Error &&
          (error.name === 'AbortError' || error.message.includes('aborted'))) {
        console.debug('File status check timed out');
      } else if (error instanceof Error && error.message.includes('fetch')) {
        console.debug('Network error checking file status');
      } else {
        console.debug('Error checking file upload status:', error);
      }
      return {
        forecast: false,
        sku: false,
        network: false,
        cost: false,
        capacity: false
      };
    }
  }

  /**
   * Check data validation status
   */
  static async checkValidationStatus(scenarioId?: number): Promise<ValidationStatus> {
    if (!scenarioId) {
      return {
        forecast: false,
        sku: false,
        network: false,
        allValidated: false
      };
    }

    try {
      const data = await safeFetchJson(`/api/files?scenarioId=${scenarioId}`, {
        timeout: 5000,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!data) {
        return {
          forecast: false,
          sku: false,
          network: false,
          allValidated: false
        };
      }
      const files = data.data || [];

      // Check validation results for each required data type
      const validationStatus: ValidationStatus = {
        forecast: files.some((f: any) => 
          f.data_type === 'forecast' && 
          f.processing_status === 'completed' &&
          f.validation_result?.success === true
        ),
        sku: files.some((f: any) => 
          f.data_type === 'sku' && 
          f.processing_status === 'completed' &&
          f.validation_result?.success === true
        ),
        network: files.some((f: any) => 
          f.data_type === 'network' && 
          f.processing_status === 'completed' &&
          f.validation_result?.success === true
        ),
        allValidated: false
      };

      // All required data types validated
      validationStatus.allValidated = validationStatus.forecast && 
                                      validationStatus.sku && 
                                      validationStatus.network;

      return validationStatus;
    } catch (error) {
      if (error instanceof Error &&
          (error.name === 'AbortError' || error.message.includes('aborted'))) {
        console.debug('Validation status check timed out');
      } else {
        console.debug('Error checking validation status');
      }
      return {
        forecast: false,
        sku: false,
        network: false,
        allValidated: false
      };
    }
  }

  /**
   * Check configuration status (warehouse, transport, inventory settings)
   */
  static async checkConfigurationStatus(scenarioId?: number): Promise<{
    warehouseConfig: boolean;
    warehouseCosts: boolean;
    warehouseConstraints: boolean;
    transportLanes: boolean;
    transportRates: boolean;
    transportModes: boolean;
    transportConstraints: boolean;
    inventoryStratification: boolean;
    inventoryServiceLevels: boolean;
    inventoryLeadTimes: boolean;
  }> {
    if (!scenarioId) {
      return {
        warehouseConfig: false,
        warehouseCosts: false,
        warehouseConstraints: false,
        transportLanes: false,
        transportRates: false,
        transportModes: false,
        transportConstraints: false,
        inventoryStratification: false,
        inventoryServiceLevels: false,
        inventoryLeadTimes: false
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Check if warehouse configurations exist
      const hasWarehouseConfig = await safeAsync(async () => {
        const warehouseData = await safeFetchJson(`/api/scenarios/${scenarioId}/warehouses`, {
          timeout: 3000,
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        return warehouseData?.data && warehouseData.data.length > 0;
      }, false);

      // Check if transport configurations exist
      const hasTransportConfig = await safeAsync(async () => {
        const transportData = await safeFetchJson(`/api/scenarios/${scenarioId}/transport`, {
          timeout: 3000,
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        return transportData?.data && transportData.data.length > 0;
      }, false);

      // Check capacity analysis completion
      const hasCapacityAnalysis = await safeAsync(async () => {
        const capacityData = await safeFetchJson(`/api/scenarios/${scenarioId}/capacity-analysis`, {
          timeout: 3000,
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        return capacityData && capacityData.success;
      }, false);

      return {
        warehouseConfig: hasWarehouseConfig,
        warehouseCosts: hasWarehouseConfig, // Assume costs are included in warehouse config
        warehouseConstraints: hasCapacityAnalysis,
        transportLanes: hasTransportConfig,
        transportRates: hasTransportConfig, // Assume rates are included in transport config
        transportModes: hasTransportConfig, // Assume modes are included in transport config
        transportConstraints: hasTransportConfig,
        inventoryStratification: hasCapacityAnalysis, // Part of capacity analysis
        inventoryServiceLevels: hasCapacityAnalysis,
        inventoryLeadTimes: hasCapacityAnalysis
      };
    } catch (error) {
      if (error instanceof Error &&
          (error.name === 'AbortError' || error.message.includes('aborted'))) {
        console.debug('Configuration status check timed out');
      } else {
        console.debug('Error checking configuration status');
      }
      return {
        warehouseConfig: false,
        warehouseCosts: false,
        warehouseConstraints: false,
        transportLanes: false,
        transportRates: false,
        transportModes: false,
        transportConstraints: false,
        inventoryStratification: false,
        inventoryServiceLevels: false,
        inventoryLeadTimes: false
      };
    }
  }

  /**
   * Check system status (database, project/scenario selection)
   */
  static async checkSystemStatus(): Promise<SystemStatus> {
    try {
      // Check database connection with shorter timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const dbData = await safeAsync(async () => {
        const data = await safeFetchJson('/api/health', {
          timeout: 3000,
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        return data || { connected: false, status: 'unknown' };
      }, { connected: false, status: 'unknown' });
      
      // Check if project/scenario are selected (from localStorage)
      const selectedProject = localStorage.getItem('selectedProject');
      const selectedScenario = localStorage.getItem('selectedScenario');

      return {
        databaseConnected: dbData.connected || dbData.status === 'ok',
        projectSelected: !!selectedProject,
        scenarioSelected: !!selectedScenario
      };
    } catch (error) {
      // Handle abort errors and other errors gracefully
      if (error instanceof Error &&
          (error.name === 'AbortError' || error.message.includes('aborted'))) {
        console.debug('System status check timed out');
      } else {
        console.debug('Error in system status check');
      }
      return {
        databaseConnected: false,
        projectSelected: false,
        scenarioSelected: false
      };
    }
  }

  /**
   * Get the current selected scenario ID from localStorage or context
   */
  static getSelectedScenarioId(): number | null {
    try {
      const selectedScenario = localStorage.getItem('selectedScenario');
      if (selectedScenario) {
        const scenario = JSON.parse(selectedScenario);
        return scenario.id || null;
      }
      return null;
    } catch (error) {
      console.warn('Error getting selected scenario ID:', error);
      return null;
    }
  }

  /**
   * Automatically update checklist items based on current system status
   */
  static async updateChecklistItems(currentItems: ChecklistItem[]): Promise<ChecklistItem[]> {
    const scenarioId = this.getSelectedScenarioId();
    
    // Get current status from various sources
    const [fileStatus, validationStatus, configStatus, systemStatus] = await Promise.all([
      this.checkFileUploadStatus(scenarioId || undefined),
      this.checkValidationStatus(scenarioId || undefined),
      this.checkConfigurationStatus(scenarioId || undefined),
      this.checkSystemStatus()
    ]);

    // Create updated checklist items
    const updatedItems = currentItems.map(item => {
      let completed = item.completed; // Keep existing manual completions

      // Automatically mark items as completed based on system status
      switch (item.id) {
        // Data Processing Requirements
        case 'data-forecast':
          completed = fileStatus.forecast;
          break;
        case 'data-sku':
          completed = fileStatus.sku;
          break;
        case 'data-network':
          completed = fileStatus.network;
          break;
        case 'data-validation':
          completed = validationStatus.allValidated;
          break;

        // Configuration Requirements  
        case 'config-constraints':
          completed = configStatus.warehouseConstraints && configStatus.transportConstraints;
          break;
        case 'config-optimization':
          completed = systemStatus.databaseConnected && systemStatus.scenarioSelected;
          break;

        // Warehouse Optimization Requirements
        case 'warehouse-facilities':
          completed = configStatus.warehouseConfig;
          break;
        case 'warehouse-costs':
          completed = configStatus.warehouseCosts;
          break;
        case 'warehouse-constraints':
          completed = configStatus.warehouseConstraints;
          break;

        // Transportation Requirements
        case 'transport-lanes':
          completed = configStatus.transportLanes;
          break;
        case 'transport-rates':
          completed = configStatus.transportRates;
          break;
        case 'transport-modes':
          completed = configStatus.transportModes;
          break;
        case 'transport-constraints':
          completed = configStatus.transportConstraints;
          break;

        // Inventory Optimization Requirements
        case 'inventory-stratification':
          completed = configStatus.inventoryStratification;
          break;
        case 'inventory-service-levels':
          completed = configStatus.inventoryServiceLevels;
          break;
        case 'inventory-lead-times':
          completed = configStatus.inventoryLeadTimes;
          break;

        // Keep existing completion status for other items
        default:
          // Don't override manually set completions
          break;
      }

      return { ...item, completed };
    });

    return updatedItems;
  }

  /**
   * Save updated checklist to localStorage
   */
  static saveChecklistToStorage(items: ChecklistItem[]): void {
    try {
      localStorage.setItem('optimization-checklist', JSON.stringify(items));
    } catch (error) {
      console.error('Error saving checklist to storage:', error);
    }
  }

  /**
   * Load checklist from localStorage
   */
  static loadChecklistFromStorage(): ChecklistItem[] | null {
    try {
      const saved = localStorage.getItem('optimization-checklist');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Error loading checklist from storage:', error);
      return null;
    }
  }

  /**
   * Complete automatic readiness update cycle
   */
  static async performAutomaticUpdate(currentItems: ChecklistItem[]): Promise<ChecklistItem[]> {
    console.log('Performing automatic readiness update...');
    
    const updatedItems = await this.updateChecklistItems(currentItems);
    this.saveChecklistToStorage(updatedItems);
    
    // Log the changes for debugging
    const changedItems = updatedItems.filter((item, index) => 
      item.completed !== currentItems[index].completed
    );
    
    if (changedItems.length > 0) {
      console.log('Readiness checklist updated automatically:', 
        changedItems.map(item => `${item.title}: ${item.completed ? 'completed' : 'pending'}`)
      );
    }
    
    return updatedItems;
  }
}

// Note: React hooks removed to avoid import issues
// Use the ReadinessTracker.performAutomaticUpdate() method directly in components
