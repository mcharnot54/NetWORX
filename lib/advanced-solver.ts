/**
 * Enhanced MIP Solver for NetWORX Essentials
 * Wraps javascript-lp-solver with advanced optimization capabilities
 */

import { LpModel, LpSolveResult, LpConstraintBound } from '../types/advanced-optimization';

// Dynamic import to handle potential module loading issues
let JSLP: any = null;

try {
  JSLP = require('javascript-lp-solver');
} catch (error) {
  console.warn('javascript-lp-solver not available, using fallback optimizer');
}

export function solve(model: LpModel): LpSolveResult {
  if (!JSLP) {
    throw new Error('javascript-lp-solver not available. Install javascript-lp-solver to run MIP optimizations.');
  }

  try {
    const result = JSLP.Solve(model);
    return result;
  } catch (error) {
    console.error('MIP solver error:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

// Helper to add a coefficient on a variable for a named constraint key
export function addCoef(vars: Record<string, number>, cKey: string, val: number) {
  if (Math.abs(val) < 1e-12) return;
  vars[cKey] = (vars[cKey] ?? 0) + val;
}


// Create a constraint building helper
export function createConstraintBuilder() {
  const constraints: Record<string, LpConstraintBound> = {};
  const variables: Record<string, Record<string, number>> = {};
  const binaries: Record<string, 1> = {};
  const ints: Record<string, 1> = {};
  
  return {
    addVariable(name: string, type?: 'binary' | 'integer' | 'continuous') {
      if (!variables[name]) variables[name] = {};
      
      if (type === 'binary') binaries[name] = 1;
      else if (type === 'integer') ints[name] = 1;
    },
    
    addConstraint(name: string, bound: LpConstraintBound) {
      constraints[name] = bound;
    },
    
    setObjectiveCoef(varName: string, coef: number, objectiveKey: string = 'OBJ') {
      if (!variables[varName]) variables[varName] = {};
      variables[varName][objectiveKey] = coef;
    },
    
    setConstraintCoef(varName: string, constraintName: string, coef: number) {
      if (!variables[varName]) variables[varName] = {};
      addCoef(variables[varName], constraintName, coef);
    },
    
    buildModel(objectiveKey: string = 'OBJ', opType: 'min' | 'max' = 'min'): LpModel {
      return {
        optimize: objectiveKey,
        opType,
        constraints,
        variables,
        binaries: Object.keys(binaries).length > 0 ? binaries : undefined,
        ints: Object.keys(ints).length > 0 ? ints : undefined
      };
    },
    
    getVariables: () => variables,
    getConstraints: () => constraints
  };
}

// Validation helper
export function validateModel(model: LpModel): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check that objective variable exists in at least one variable
  const hasObjective = Object.values(model.variables).some(varCoefs => 
    model.optimize in varCoefs
  );
  
  if (!hasObjective) {
    errors.push(`Objective variable '${model.optimize}' not found in any variable definition`);
  }
  
  // Check constraint references
  for (const [constraintName] of Object.entries(model.constraints)) {
    const hasVarForConstraint = Object.values(model.variables).some(varCoefs =>
      constraintName in varCoefs
    );
    
    if (!hasVarForConstraint) {
      errors.push(`Constraint '${constraintName}' has no variables referencing it`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
