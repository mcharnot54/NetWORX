/**
 * Automatic Readiness Tracking Service
 * 
 * Monitors file uploads, data validation, and system configuration
 * to automatically update the Network Optimization Readiness checklist
 */

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
      const response = await fetch(`/api/files?scenarioId=${scenarioId}`);
      if (!response.ok) {
        console.warn('Failed to fetch file status');
        return {
          forecast: false,
          sku: false,
          network: false,
          cost: false,
          capacity: false
        };
      }

      const data = await response.json();
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
      console.error('Error checking file upload status:', error);
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
      const response = await fetch(`/api/files?scenarioId=${scenarioId}`);
      if (!response.ok) {
        return {
          forecast: false,
          sku: false,
          network: false,
          allValidated: false
        };
      }

      const data = await response.json();
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
      console.error('Error checking validation status:', error);
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
      // Check if warehouse configurations exist
      const warehouseResponse = await fetch(`/api/scenarios/${scenarioId}/warehouses`);
      const warehouseData = warehouseResponse.ok ? await warehouseResponse.json() : { data: [] };
      const hasWarehouseConfig = warehouseData.data && warehouseData.data.length > 0;

      // Check if transport configurations exist
      const transportResponse = await fetch(`/api/scenarios/${scenarioId}/transport`);
      const transportData = transportResponse.ok ? await transportResponse.json() : { data: [] };
      const hasTransportConfig = transportData.data && transportData.data.length > 0;

      // Check capacity analysis completion
      const capacityResponse = await fetch(`/api/scenarios/${scenarioId}/capacity-analysis`);
      const capacityData = capacityResponse.ok ? await capacityResponse.json() : null;
      const hasCapacityAnalysis = capacityData && capacityData.success;

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
      console.error('Error checking configuration status:', error);
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
      // Check database connection with timeout and abort handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const dbResponse = await fetch('/api/health', {
        signal: controller.signal,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      clearTimeout(timeoutId);

      const dbData = dbResponse.ok ? await dbResponse.json() : { connected: false };
      
      // Check if project/scenario are selected (from localStorage)
      const selectedProject = localStorage.getItem('selectedProject');
      const selectedScenario = localStorage.getItem('selectedScenario');

      return {
        databaseConnected: dbData.connected || dbData.status === 'ok',
        projectSelected: !!selectedProject,
        scenarioSelected: !!selectedScenario
      };
    } catch (error) {
      console.error('Error checking system status:', error);
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
