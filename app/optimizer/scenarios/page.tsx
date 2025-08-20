'use client';
import React from 'react';
import Navigation from '@/components/Navigation';
import ScenarioSweep from '@/components/ScenarioSweep';

export default function ScenariosPage() {
  return (
    <>
      <Navigation />
      <main className="content-area">
        <div className="p-6 grid gap-6">
          <h1 className="text-2xl font-bold">Scenario Sweep – Nodes</h1>
          <p className="text-sm text-gray-600">Evaluate single-node up to N-node configurations and pick the recommended network by cost/service.</p>
          <ScenarioSweep />
        </div>
      </main>
    </>
  );
}
