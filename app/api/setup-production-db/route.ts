import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    // Create table for storing processed scenario data
    await sql`
      CREATE TABLE IF NOT EXISTS processed_scenario_data (
        id SERIAL PRIMARY KEY,
        scenario_id INTEGER NOT NULL,
        processed_data JSONB NOT NULL,
        metadata JSONB DEFAULT '{}',
        processed_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(scenario_id)
      )
    `;

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_processed_scenario_data_scenario_id 
      ON processed_scenario_data(scenario_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_processed_scenario_data_processed_at 
      ON processed_scenario_data(processed_at)
    `;

    // Create table for calculation rules
    await sql`
      CREATE TABLE IF NOT EXISTS calculation_rules (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        rule_name VARCHAR(255) NOT NULL,
        target_field VARCHAR(255) NOT NULL,
        formula TEXT NOT NULL,
        source_fields JSONB NOT NULL,
        condition_clause TEXT,
        description TEXT,
        data_type VARCHAR(50) DEFAULT 'number',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create table for imputation history
    await sql`
      CREATE TABLE IF NOT EXISTS imputation_history (
        id SERIAL PRIMARY KEY,
        scenario_id INTEGER NOT NULL,
        field_name VARCHAR(255) NOT NULL,
        imputation_method VARCHAR(100) NOT NULL,
        values_imputed INTEGER NOT NULL,
        average_confidence DECIMAL(5,4) NOT NULL,
        quality_before DECIMAL(5,2) NOT NULL,
        quality_after DECIMAL(5,2) NOT NULL,
        processed_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create table for data quality metrics
    await sql`
      CREATE TABLE IF NOT EXISTS data_quality_metrics (
        id SERIAL PRIMARY KEY,
        scenario_id INTEGER NOT NULL,
        original_data_percentage DECIMAL(5,2) NOT NULL,
        imputed_data_percentage DECIMAL(5,2) NOT NULL,
        calculated_data_percentage DECIMAL(5,2) NOT NULL,
        overall_completeness DECIMAL(5,2) NOT NULL,
        quality_level VARCHAR(50) NOT NULL,
        proceed_recommendation VARCHAR(50) NOT NULL,
        total_records INTEGER NOT NULL,
        valid_records INTEGER NOT NULL,
        fields_analyzed INTEGER NOT NULL,
        measured_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Add foreign key constraints if they don't exist
    try {
      await sql`
        ALTER TABLE processed_scenario_data 
        ADD CONSTRAINT fk_processed_scenario_data_scenario_id 
        FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
      `;
    } catch (error) {
      // Constraint might already exist
    }

    try {
      await sql`
        ALTER TABLE calculation_rules 
        ADD CONSTRAINT fk_calculation_rules_project_id 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      `;
    } catch (error) {
      // Constraint might already exist
    }

    try {
      await sql`
        ALTER TABLE imputation_history 
        ADD CONSTRAINT fk_imputation_history_scenario_id 
        FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
      `;
    } catch (error) {
      // Constraint might already exist
    }

    try {
      await sql`
        ALTER TABLE data_quality_metrics 
        ADD CONSTRAINT fk_data_quality_metrics_scenario_id 
        FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
      `;
    } catch (error) {
      // Constraint might already exist
    }

    // Insert default calculation rules
    await sql`
      INSERT INTO calculation_rules (project_id, rule_name, target_field, formula, source_fields, description, data_type)
      VALUES 
        (0, 'Units per Pallet', 'units_per_pallet', 'units_per_carton * cartons_per_pallet', '["units_per_carton", "cartons_per_pallet"]', 'Calculate total units per pallet', 'number'),
        (0, 'Total Value', 'total_value', 'unit_price * quantity', '["unit_price", "quantity"]', 'Calculate total value from price and quantity', 'number'),
        (0, 'Pallets Needed', 'pallets_needed', 'Math.ceil(total_units / units_per_pallet)', '["total_units", "units_per_pallet"]', 'Calculate number of pallets needed', 'number'),
        (0, 'Cost per Unit', 'cost_per_unit', 'total_cost / total_units', '["total_cost", "total_units"]', 'Calculate cost per unit', 'number'),
        (0, 'Capacity Utilization', 'capacity_utilization', '(current_capacity / max_capacity) * 100', '["current_capacity", "max_capacity"]', 'Calculate capacity utilization percentage', 'number')
      ON CONFLICT DO NOTHING
    `;

    return NextResponse.json({
      success: true,
      message: 'Production database setup completed successfully',
      tables_created: [
        'processed_scenario_data',
        'calculation_rules', 
        'imputation_history',
        'data_quality_metrics'
      ]
    });

  } catch (error) {
    console.error('Database setup error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to setup production database',
        details: String(error)
      },
      { status: 500 }
    );
  }
}
