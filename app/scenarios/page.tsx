'use client';
import React from 'react';
import ScenarioSweep from '@/components/ScenarioSweep';
import BatchScenario from '@/components/BatchScenario';

export default function ScenariosPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Scenario Optimization Analysis
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl">
            Run comprehensive network optimization scenarios to evaluate different facility configurations. 
            Compare costs, service levels, and operational efficiency across multiple node configurations 
            to identify the optimal network design for your supply chain.
          </p>
        </div>

        {/* Feature Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="text-blue-600 text-2xl mb-3">🎯</div>
            <h3 className="font-semibold text-gray-900 mb-2">Multi-Criteria Optimization</h3>
            <p className="text-sm text-gray-600">
              Optimize for total cost, service level, or balanced multi-objective criteria 
              to find the best network configuration.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="text-green-600 text-2xl mb-3">📊</div>
            <h3 className="font-semibold text-gray-900 mb-2">Comprehensive Analysis</h3>
            <p className="text-sm text-gray-600">
              Includes transport, warehouse, and inventory costs with service level 
              constraints and facility utilization metrics.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="text-purple-600 text-2xl mb-3">📈</div>
            <h3 className="font-semibold text-gray-900 mb-2">Export & Reporting</h3>
            <p className="text-sm text-gray-600">
              Export detailed results to Excel with multiple sheets for scenario 
              comparison and executive reporting.
            </p>
          </div>
        </div>

        {/* Main Analysis Tools */}
        <div className="space-y-8">
          {/* Advanced Scenario Sweep */}
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                Advanced Scenario Sweep
              </h2>
              <p className="text-sm text-gray-600">
                Comprehensive analysis with detailed cost breakdowns, service level optimization, 
                and facility selection recommendations.
              </p>
            </div>
            <ScenarioSweep />
          </div>

          {/* Quick Batch Runner */}
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                Quick Batch Runner
              </h2>
              <p className="text-sm text-gray-600">
                Fast batch optimization for rapid scenario comparison and initial network sizing.
              </p>
            </div>
            <BatchScenario />
          </div>
        </div>

        {/* Key Features */}
        <div className="mt-12 bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🔧 Optimization Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Transportation Optimization</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Mixed Integer Programming (MIP) solver</li>
                <li>• 630+ North American cities database</li>
                <li>• Distance-based cost modeling</li>
                <li>• Service level constraints</li>
                <li>• Facility capacity optimization</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Warehouse & Inventory</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Safety stock optimization</li>
                <li>• Cycle stock calculations</li>
                <li>• Facility design and sizing</li>
                <li>• Operating cost modeling</li>
                <li>• Multi-year forecasting</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-8 flex gap-4">
          <a 
            href="/transport-optimizer" 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🚛 Transport Optimizer
          </a>
          <a 
            href="/warehouse-optimizer" 
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            🏭 Warehouse Optimizer
          </a>
          <a 
            href="/capacity-optimizer" 
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            📦 Capacity Optimizer
          </a>
          <a 
            href="/config" 
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ⚙️ Configuration
          </a>
        </div>
      </div>
    </div>
  );
}
