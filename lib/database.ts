import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(process.env.DATABASE_URL);

// Type definitions for database entities
export interface Project {
  id: number;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
  status: 'active' | 'archived' | 'completed';
  owner_id?: string;
  project_duration_years: number;
  base_year: number;
}

export interface Scenario {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  scenario_type: 'warehouse' | 'transport' | 'combined';
  status: 'draft' | 'running' | 'completed' | 'failed';
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  metadata: any;
}

export interface DataFile {
  id: number;
  scenario_id: number;
  file_name: string;
  file_type: string;
  file_size?: number;
  data_type: 'forecast' | 'sku' | 'network' | 'cost' | 'capacity';
  upload_date: Date;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  validation_result: any;
  processed_data?: any;
  original_columns?: string[];
  mapped_columns: any;
}

export interface WarehouseConfiguration {
  id: number;
  scenario_id: number;
  warehouse_name: string;
  max_capacity: number;
  fixed_costs: number;
  variable_cost_per_unit: number;
  location_latitude?: number;
  location_longitude?: number;
  warehouse_type: 'distribution' | 'fulfillment' | 'cross-dock';
  automation_level: 'manual' | 'semi-automated' | 'fully-automated';
  created_at: Date;
  configuration_data: any;
}

export interface TransportConfiguration {
  id: number;
  scenario_id: number;
  route_name?: string;
  origin: string;
  destination: string;
  distance?: number;
  base_freight_cost?: number;
  fuel_cost_per_km?: number;
  transit_time?: number;
  vehicle_type: 'truck' | 'rail' | 'air' | 'sea';
  capacity?: number;
  created_at: Date;
  route_data: any;
}

export interface OptimizationSettings {
  id: number;
  scenario_id: number;
  setting_type: 'warehouse' | 'transport' | 'general';
  objective?: string;
  time_horizon?: number;
  constraints: any;
  parameters: any;
  created_at: Date;
}

export interface OptimizationResult {
  id: number;
  scenario_id: number;
  result_type: 'warehouse' | 'transport' | 'combined';
  optimization_run_id: string;
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed';
  started_at: Date;
  completed_at?: Date;
  execution_time_seconds?: number;
  total_cost?: number;
  cost_savings?: number;
  efficiency_score?: number;
  results_data: any;
  performance_metrics: any;
  recommendations: any;
}

// Extended interface for API responses that includes computed properties
export interface OptimizationResultResponse extends OptimizationResult {
  optimization_results: any; // Alias for results_data
  success: boolean; // Computed from status
  job_status?: {
    id: string;
    status: string;
    progress_percentage: number;
    current_step: string;
    estimated_completion_minutes: number;
    error_message?: string;
  } | null;
}

export interface ScenarioIteration {
  id: number;
  parent_scenario_id: number;
  iteration_name: string;
  iteration_number: number;
  changes_description?: string;
  created_at: Date;
  configuration_changes: any;
  results_comparison: any;
}

export interface VisualizationConfig {
  id: number;
  scenario_id: number;
  config_name: string;
  chart_type: string;
  data_source?: string;
  chart_config: any;
  filters: any;
  created_at: Date;
  is_default: boolean;
}

export interface AuditLog {
  id: number;
  scenario_id?: number;
  action: string;
  entity_type?: string;
  entity_id?: number;
  user_id?: string;
  timestamp: Date;
  details: any;
  ip_address?: string;
}

// Database operations for projects
export class ProjectService {
  static async createProject(data: {
    name: string;
    description?: string;
    owner_id?: string;
    project_duration_years?: number;
    base_year?: number;
    status?: 'active' | 'archived' | 'completed';
  }): Promise<Project> {
    const [project] = await sql`
      INSERT INTO projects (name, description, owner_id, project_duration_years, base_year, status)
      VALUES (${data.name}, ${data.description || null}, ${data.owner_id || null},
              ${data.project_duration_years || 5}, ${data.base_year || new Date().getFullYear()},
              ${data.status || 'active'})
      RETURNING *
    `;
    return project as Project;
  }

  static async getProjects(): Promise<Project[]> {
    return await sql`
      SELECT * FROM projects
      ORDER BY created_at DESC
    ` as Project[];
  }

  static async getProject(id: number): Promise<Project | null> {
    const [project] = await sql`
      SELECT * FROM projects WHERE id = ${id}
    `;
    return project as Project || null;
  }

  static async updateProject(id: number, data: Partial<Project>): Promise<Project> {
    const [project] = await sql`
      UPDATE projects
      SET name = COALESCE(${data.name}, name),
          description = COALESCE(${data.description}, description),
          status = COALESCE(${data.status}, status),
          project_duration_years = COALESCE(${data.project_duration_years}, project_duration_years),
          base_year = COALESCE(${data.base_year}, base_year),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;
    return project as Project;
  }

  static async deleteProject(id: number): Promise<void> {
    await sql`DELETE FROM projects WHERE id = ${id}`;
  }
}

// Database operations for scenarios
export class ScenarioService {
  static async createScenario(data: {
    name: string;
    description?: string;
    scenario_type: 'warehouse' | 'transport' | 'combined';
    created_by?: string;
    metadata?: any;
  }): Promise<Scenario> {
    // Extract project_id from metadata if present
    const project_id = data.metadata?.project_id;
    if (!project_id) {
      throw new Error('project_id is required in metadata');
    }

    const [scenario] = await sql`
      INSERT INTO scenarios (project_id, name, description, scenario_type, created_by, metadata)
      VALUES (${project_id}, ${data.name}, ${data.description || null}, ${data.scenario_type}, ${data.created_by || null}, ${JSON.stringify(data.metadata || {})})
      RETURNING *
    `;
    return scenario as Scenario;
  }

  static async getScenarios(type?: string): Promise<Scenario[]> {
    if (type) {
      return await sql`
        SELECT * FROM scenarios 
        WHERE scenario_type = ${type}
        ORDER BY created_at DESC
      ` as Scenario[];
    }
    return await sql`
      SELECT * FROM scenarios 
      ORDER BY created_at DESC
    ` as Scenario[];
  }

  static async getScenario(id: number): Promise<Scenario | null> {
    const [scenario] = await sql`
      SELECT * FROM scenarios WHERE id = ${id}
    `;
    return scenario as Scenario || null;
  }

  static async updateScenario(id: number, data: Partial<Scenario>): Promise<Scenario> {
    const [scenario] = await sql`
      UPDATE scenarios 
      SET name = COALESCE(${data.name}, name),
          description = COALESCE(${data.description}, description),
          status = COALESCE(${data.status}, status),
          metadata = COALESCE(${JSON.stringify(data.metadata)}, metadata),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;
    return scenario as Scenario;
  }

  static async deleteScenario(id: number): Promise<void> {
    await sql`DELETE FROM scenarios WHERE id = ${id}`;
  }
}

// Database operations for warehouse configurations
export class WarehouseConfigService {
  static async createWarehouseConfig(data: Omit<WarehouseConfiguration, 'id' | 'created_at'>): Promise<WarehouseConfiguration> {
    const [config] = await sql`
      INSERT INTO warehouse_configurations (
        scenario_id, warehouse_name, max_capacity, fixed_costs, variable_cost_per_unit,
        location_latitude, location_longitude, warehouse_type, automation_level, configuration_data
      )
      VALUES (
        ${data.scenario_id}, ${data.warehouse_name}, ${data.max_capacity}, ${data.fixed_costs},
        ${data.variable_cost_per_unit}, ${data.location_latitude || null}, ${data.location_longitude || null},
        ${data.warehouse_type}, ${data.automation_level}, ${JSON.stringify(data.configuration_data)}
      )
      RETURNING *
    `;
    return config as WarehouseConfiguration;
  }

  static async getWarehouseConfigs(scenarioId: number): Promise<WarehouseConfiguration[]> {
    return await sql`
      SELECT * FROM warehouse_configurations 
      WHERE scenario_id = ${scenarioId}
      ORDER BY created_at
    ` as WarehouseConfiguration[];
  }

  static async updateWarehouseConfig(id: number, data: Partial<WarehouseConfiguration>): Promise<WarehouseConfiguration> {
    const [config] = await sql`
      UPDATE warehouse_configurations 
      SET warehouse_name = COALESCE(${data.warehouse_name}, warehouse_name),
          max_capacity = COALESCE(${data.max_capacity}, max_capacity),
          fixed_costs = COALESCE(${data.fixed_costs}, fixed_costs),
          variable_cost_per_unit = COALESCE(${data.variable_cost_per_unit}, variable_cost_per_unit),
          location_latitude = COALESCE(${data.location_latitude}, location_latitude),
          location_longitude = COALESCE(${data.location_longitude}, location_longitude),
          warehouse_type = COALESCE(${data.warehouse_type}, warehouse_type),
          automation_level = COALESCE(${data.automation_level}, automation_level),
          configuration_data = COALESCE(${JSON.stringify(data.configuration_data)}, configuration_data)
      WHERE id = ${id}
      RETURNING *
    `;
    return config as WarehouseConfiguration;
  }

  static async deleteWarehouseConfig(id: number): Promise<void> {
    await sql`DELETE FROM warehouse_configurations WHERE id = ${id}`;
  }
}

// Database operations for transport configurations
export class TransportConfigService {
  static async createTransportConfig(data: Omit<TransportConfiguration, 'id' | 'created_at'>): Promise<TransportConfiguration> {
    const [config] = await sql`
      INSERT INTO transport_configurations (
        scenario_id, route_name, origin, destination, distance, base_freight_cost,
        fuel_cost_per_km, transit_time, vehicle_type, capacity, route_data
      )
      VALUES (
        ${data.scenario_id}, ${data.route_name || null}, ${data.origin}, ${data.destination},
        ${data.distance || null}, ${data.base_freight_cost || null}, ${data.fuel_cost_per_km || null},
        ${data.transit_time || null}, ${data.vehicle_type}, ${data.capacity || null},
        ${JSON.stringify(data.route_data)}
      )
      RETURNING *
    `;
    return config as TransportConfiguration;
  }

  static async getTransportConfigs(scenarioId: number): Promise<TransportConfiguration[]> {
    return await sql`
      SELECT * FROM transport_configurations 
      WHERE scenario_id = ${scenarioId}
      ORDER BY created_at
    ` as TransportConfiguration[];
  }

  static async updateTransportConfig(id: number, data: Partial<TransportConfiguration>): Promise<TransportConfiguration> {
    const [config] = await sql`
      UPDATE transport_configurations 
      SET route_name = COALESCE(${data.route_name}, route_name),
          origin = COALESCE(${data.origin}, origin),
          destination = COALESCE(${data.destination}, destination),
          distance = COALESCE(${data.distance}, distance),
          base_freight_cost = COALESCE(${data.base_freight_cost}, base_freight_cost),
          fuel_cost_per_km = COALESCE(${data.fuel_cost_per_km}, fuel_cost_per_km),
          transit_time = COALESCE(${data.transit_time}, transit_time),
          vehicle_type = COALESCE(${data.vehicle_type}, vehicle_type),
          capacity = COALESCE(${data.capacity}, capacity),
          route_data = COALESCE(${JSON.stringify(data.route_data)}, route_data)
      WHERE id = ${id}
      RETURNING *
    `;
    return config as TransportConfiguration;
  }

  static async deleteTransportConfig(id: number): Promise<void> {
    await sql`DELETE FROM transport_configurations WHERE id = ${id}`;
  }
}

// Database operations for optimization results
export class OptimizationResultService {
  static async createOptimizationResult(data: Omit<OptimizationResult, 'id' | 'started_at'>): Promise<OptimizationResult> {
    const [result] = await sql`
      INSERT INTO optimization_results (
        scenario_id, result_type, optimization_run_id, status, started_at, completed_at,
        execution_time_seconds, total_cost, cost_savings, efficiency_score,
        results_data, performance_metrics, recommendations
      )
      VALUES (
        ${data.scenario_id}, ${data.result_type}, ${data.optimization_run_id}, ${data.status},
        NOW(), ${data.completed_at || null}, ${data.execution_time_seconds || null}, ${data.total_cost || null},
        ${data.cost_savings || null}, ${data.efficiency_score || null}, ${JSON.stringify(data.results_data)},
        ${JSON.stringify(data.performance_metrics)}, ${JSON.stringify(data.recommendations)}
      )
      RETURNING *
    `;
    return result as OptimizationResult;
  }

  static async getOptimizationResults(scenarioId: number): Promise<OptimizationResult[]> {
    return await sql`
      SELECT * FROM optimization_results 
      WHERE scenario_id = ${scenarioId}
      ORDER BY started_at DESC
    ` as OptimizationResult[];
  }

  static async updateOptimizationResult(id: number, data: Partial<OptimizationResult>): Promise<OptimizationResult> {
    const [result] = await sql`
      UPDATE optimization_results
      SET status = COALESCE(${data.status}, status),
          completed_at = COALESCE(${data.completed_at}, completed_at),
          execution_time_seconds = COALESCE(${data.execution_time_seconds}, execution_time_seconds),
          total_cost = COALESCE(${data.total_cost}, total_cost),
          cost_savings = COALESCE(${data.cost_savings}, cost_savings),
          efficiency_score = COALESCE(${data.efficiency_score}, efficiency_score),
          results_data = COALESCE(${JSON.stringify(data.results_data)}, results_data),
          performance_metrics = COALESCE(${JSON.stringify(data.performance_metrics)}, performance_metrics),
          recommendations = COALESCE(${JSON.stringify(data.recommendations)}, recommendations)
      WHERE id = ${id}
      RETURNING *
    `;
    return result as OptimizationResult;
  }

  static async updateOptimizationResultByRunId(optimizationRunId: string, data: Partial<OptimizationResult>): Promise<OptimizationResult> {
    const [result] = await sql`
      UPDATE optimization_results
      SET status = COALESCE(${data.status}, status),
          completed_at = COALESCE(${data.completed_at}, completed_at),
          execution_time_seconds = COALESCE(${data.execution_time_seconds}, execution_time_seconds),
          total_cost = COALESCE(${data.total_cost}, total_cost),
          cost_savings = COALESCE(${data.cost_savings}, cost_savings),
          efficiency_score = COALESCE(${data.efficiency_score}, efficiency_score),
          results_data = COALESCE(${JSON.stringify(data.results_data)}, results_data),
          performance_metrics = COALESCE(${JSON.stringify(data.performance_metrics)}, performance_metrics),
          recommendations = COALESCE(${JSON.stringify(data.recommendations)}, recommendations)
      WHERE optimization_run_id = ${optimizationRunId}
      RETURNING *
    `;
    return result as OptimizationResult;
  }
}

// Database operations for data files
export class DataFileService {
  static async createDataFile(data: Omit<DataFile, 'id' | 'upload_date'>): Promise<DataFile> {
    const [file] = await sql`
      INSERT INTO data_files (
        scenario_id, file_name, file_type, file_size, data_type, processing_status,
        validation_result, processed_data, original_columns, mapped_columns
      )
      VALUES (
        ${data.scenario_id}, ${data.file_name}, ${data.file_type}, ${data.file_size || null},
        ${data.data_type}, ${data.processing_status}, ${JSON.stringify(data.validation_result)},
        ${JSON.stringify(data.processed_data || null)}, ${data.original_columns || null},
        ${JSON.stringify(data.mapped_columns)}
      )
      RETURNING *
    `;
    return file as DataFile;
  }

  static async getDataFiles(scenarioId: number, limit: number = 50): Promise<DataFile[]> {
    // Limit the number of files returned and exclude large processed_data when listing
    return await sql`
      SELECT
        id, scenario_id, file_name, file_type, file_size, data_type,
        processing_status, upload_date, original_columns, mapped_columns,
        validation_result,
        -- Only include small portions of processed_data for listing
        CASE
          WHEN processed_data IS NOT NULL THEN
            jsonb_build_object(
              'file_content', processed_data->'file_content',
              'excel_preserved', processed_data->'excel_preserved',
              'reprocessed', processed_data->'reprocessed'
            )
          ELSE NULL
        END as processed_data
      FROM data_files
      WHERE scenario_id = ${scenarioId}
      ORDER BY upload_date DESC
      LIMIT ${limit}
    ` as DataFile[];
  }

  static async updateDataFile(id: number, data: Partial<DataFile>): Promise<DataFile> {
    // Build dynamic update query only for provided fields
    const updates = [];
    const values: any[] = [];

    if (data.processing_status !== undefined) {
      updates.push(`processing_status = $${updates.length + 1}`);
      values.push(data.processing_status);
    }

    if (data.validation_result !== undefined) {
      updates.push(`validation_result = $${updates.length + 1}`);
      values.push(JSON.stringify(data.validation_result));
    }

    if (data.processed_data !== undefined) {
      updates.push(`processed_data = $${updates.length + 1}`);
      values.push(JSON.stringify(data.processed_data));
    }

    if (data.file_name !== undefined) {
      updates.push(`file_name = $${updates.length + 1}`);
      values.push(data.file_name);
    }

    if (data.file_type !== undefined) {
      updates.push(`file_type = $${updates.length + 1}`);
      values.push(data.file_type);
    }

    if (data.data_type !== undefined) {
      updates.push(`data_type = $${updates.length + 1}`);
      values.push(data.data_type);
    }

    if (updates.length === 0) {
      // No updates provided, just return the current file
      const [file] = await sql`SELECT * FROM data_files WHERE id = ${id}`;
      return file as DataFile;
    }

    // Add id for WHERE clause
    values.push(id);

    const query = `
      UPDATE data_files
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
      RETURNING *
    `;

    const [file] = await sql.unsafe(query, values);
    return file as DataFile;
  }

  static async getDataFile(id: number): Promise<DataFile | null> {
    const [file] = await sql`
      SELECT * FROM data_files WHERE id = ${id}
    `;
    return file as DataFile || null;
  }

  static async getDataFileWithFullData(id: number): Promise<DataFile | null> {
    // Get complete file data including all processed_data
    const [file] = await sql`
      SELECT * FROM data_files WHERE id = ${id}
    `;
    return file as DataFile || null;
  }

  static async deleteDataFile(id: number): Promise<void> {
    await sql`DELETE FROM data_files WHERE id = ${id}`;
  }
}

// Database operations for scenario iterations
export class ScenarioIterationService {
  static async createIteration(data: Omit<ScenarioIteration, 'id' | 'created_at'>): Promise<ScenarioIteration> {
    const [iteration] = await sql`
      INSERT INTO scenario_iterations (
        parent_scenario_id, iteration_name, iteration_number, changes_description,
        configuration_changes, results_comparison
      )
      VALUES (
        ${data.parent_scenario_id}, ${data.iteration_name}, ${data.iteration_number},
        ${data.changes_description || null}, ${JSON.stringify(data.configuration_changes)},
        ${JSON.stringify(data.results_comparison)}
      )
      RETURNING *
    `;
    return iteration as ScenarioIteration;
  }

  static async getIterations(parentScenarioId: number): Promise<ScenarioIteration[]> {
    return await sql`
      SELECT * FROM scenario_iterations 
      WHERE parent_scenario_id = ${parentScenarioId}
      ORDER BY iteration_number
    ` as ScenarioIteration[];
  }
}

// Audit logging
export class AuditLogService {
  static async logAction(data: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    await sql`
      INSERT INTO audit_log (scenario_id, action, entity_type, entity_id, user_id, details, ip_address)
      VALUES (
        ${data.scenario_id || null}, ${data.action}, ${data.entity_type || null},
        ${data.entity_id || null}, ${data.user_id || null}, ${JSON.stringify(data.details)},
        ${data.ip_address || null}
      )
    `;
  }
}

export { sql };
