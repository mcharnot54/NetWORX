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
    console.warn('Using fallback solver - install javascript-lp-solver for optimal results');
    return fallbackSolver(model);
  }
  
  try {
    const result = JSLP.Solve(model);
    return result;
  } catch (error) {
    console.error('MIP solver error:', error);
    console.warn('Falling back to heuristic solver');
    return fallbackSolver(model);
  }
}

// Helper to add a coefficient on a variable for a named constraint key
export function addCoef(vars: Record<string, number>, cKey: string, val: number) {
  if (Math.abs(val) < 1e-12) return;
  vars[cKey] = (vars[cKey] ?? 0) + val;
}

// Fallback heuristic solver for when javascript-lp-solver is not available
function fallbackSolver(model: LpModel): LpSolveResult {
  console.log('Using NetWORX fallback optimization heuristics...');
  
  const variables = Object.keys(model.variables);
  const constraints = model.constraints;
  const isMinimization = model.opType === 'min';
  
  // Simple greedy heuristic approach
  const solution: Record<string, number> = {};
  
  // Initialize all variables to 0
  for (const varName of variables) {
    if (model.binaries && model.binaries[varName]) {
      solution[varName] = 0; // Binary variables start at 0
    } else if (model.ints && model.ints[varName]) {
      solution[varName] = 0; // Integer variables start at 0
    } else {
      solution[varName] = 0; // Continuous variables start at 0
    }
  }
  
  // Simple heuristic: try to satisfy constraints while optimizing objective
  let bestObjective = isMinimization ? Infinity : -Infinity;
  let bestSolution = { ...solution };
  
  // Try multiple random configurations
  for (let attempt = 0; attempt < 100; attempt++) {
    const currentSolution: Record<string, number> = {};
    
    // Generate feasible solution
    for (const varName of variables) {
      if (model.binaries && model.binaries[varName]) {
        currentSolution[varName] = Math.random() > 0.5 ? 1 : 0;
      } else if (model.ints && model.ints[varName]) {
        currentSolution[varName] = Math.floor(Math.random() * 10);
      } else {
        currentSolution[varName] = Math.random() * 1000;
      }
    }
    
    // Check if solution satisfies constraints
    let feasible = true;
    for (const [constraintName, bound] of Object.entries(constraints)) {
      let value = 0;
      
      for (const varName of variables) {
        const coef = model.variables[varName][constraintName] || 0;
        value += coef * currentSolution[varName];
      }
      
      if (bound.max !== undefined && value > bound.max + 1e-6) {
        feasible = false;
        break;
      }
      if (bound.min !== undefined && value < bound.min - 1e-6) {
        feasible = false;
        break;
      }
      if (bound.equal !== undefined && Math.abs(value - bound.equal) > 1e-6) {
        feasible = false;
        break;
      }
    }
    
    if (feasible) {
      // Calculate objective value
      let objective = 0;
      for (const varName of variables) {
        const coef = model.variables[varName][model.optimize] || 0;
        objective += coef * currentSolution[varName];
      }
      
      // Check if this is better
      const isBetter = isMinimization ? 
        objective < bestObjective : 
        objective > bestObjective;
        
      if (isBetter) {
        bestObjective = objective;
        bestSolution = { ...currentSolution };
      }
    }
  }
  
  return {
    feasible: bestObjective !== (isMinimization ? Infinity : -Infinity),
    result: bestObjective,
    bounded: true,
    ...bestSolution
  };
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
