'use client';
import React, { useEffect, useState } from 'react';
import { suggestColumnMapping, validateMapping, DemandMapping, CostMapping, CapacityMapping } from '@/lib/importers/map';

export type ColumnOption = { label: string; index: number };

export default function ColumnMapper({
  headers,
  kind,
  onApply,
  initialData,
}: {
  headers: string[];
  kind: 'demand' | 'demand-per-year' | 'cost' | 'capacity';
  onApply: (mapping: any) => void;
  initialData?: any[][];
}) {
  const opts: ColumnOption[] = headers.map((h, i) => ({ label: `${h || '(blank)'} [${i}]`, index: i }));

  // Demand mapping state
  const [destinationCol, setDestinationCol] = useState(1);
  const [demandCol, setDemandCol] = useState(2);
  const [yearCol, setYearCol] = useState<number | undefined>(undefined);

  // Cost mapping state
  const [originCol, setOriginCol] = useState(0);
  const [costCol, setCostCol] = useState<number | undefined>(2);
  const [costPerMileCol, setCostPerMileCol] = useState<number | undefined>(undefined);
  const [distanceCol, setDistanceCol] = useState<number | undefined>(undefined);
  const [costPerCwtCol, setCostPerCwtCol] = useState<number | undefined>(undefined);
  const [weightCol, setWeightCol] = useState<number | undefined>(undefined);
  const [modeCol, setModeCol] = useState<number | undefined>(undefined);

  // Capacity mapping state
  const [facilityCol, setFacilityCol] = useState(0);
  const [capacityCol, setCapacityCol] = useState(1);
  const [utilizationCol, setUtilizationCol] = useState<number | undefined>(undefined);

  const [errors, setErrors] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Auto-suggest mappings when headers change
  useEffect(() => {
    const suggestions = suggestColumnMapping(headers);
    
    if (kind === 'demand' && suggestions.demand) {
      if (suggestions.demand.destinationCol !== undefined) setDestinationCol(suggestions.demand.destinationCol);
      if (suggestions.demand.demandCol !== undefined) setDemandCol(suggestions.demand.demandCol);
    } else if (kind === 'demand-per-year' && suggestions.demand) {
      if (suggestions.demand.destinationCol !== undefined) setDestinationCol(suggestions.demand.destinationCol);
      if (suggestions.demand.demandCol !== undefined) setDemandCol(suggestions.demand.demandCol);
      if (suggestions.demand.yearCol !== undefined) setYearCol(suggestions.demand.yearCol);
    } else if (kind === 'cost' && suggestions.cost) {
      if (suggestions.cost.originCol !== undefined) setOriginCol(suggestions.cost.originCol);
      if (suggestions.cost.destinationCol !== undefined) setDestinationCol(suggestions.cost.destinationCol);
      if (suggestions.cost.costCol !== undefined) setCostCol(suggestions.cost.costCol);
      if (suggestions.cost.costPerMileCol !== undefined) setCostPerMileCol(suggestions.cost.costPerMileCol);
      if (suggestions.cost.distanceCol !== undefined) setDistanceCol(suggestions.cost.distanceCol);
    } else if (kind === 'capacity' && suggestions.capacity) {
      if (suggestions.capacity.facilityCol !== undefined) setFacilityCol(suggestions.capacity.facilityCol);
      if (suggestions.capacity.capacityCol !== undefined) setCapacityCol(suggestions.capacity.capacityCol);
    }
  }, [headers, kind]);

  function getCurrentMapping() {
    if (kind === 'demand') {
      return { destinationCol, demandCol };
    } else if (kind === 'demand-per-year') {
      return { destinationCol, demandCol, yearCol };
    } else if (kind === 'cost') {
      return { originCol, destinationCol, costCol, costPerMileCol, distanceCol, costPerCwtCol, weightCol, modeCol };
    } else if (kind === 'capacity') {
      return { facilityCol, capacityCol, utilizationCol };
    }
    return {};
  }

  function apply() {
    const mapping = getCurrentMapping();
    const validationErrors = validateMapping(headers, mapping, kind as any);
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setErrors([]);
    onApply(mapping);
  }

  function saveMapping() {
    const mapping = getCurrentMapping();
    localStorage.setItem(`columnMapping_${kind}`, JSON.stringify(mapping));
  }

  function loadMapping() {
    const saved = localStorage.getItem(`columnMapping_${kind}`);
    if (saved) {
      try {
        const mapping = JSON.parse(saved);
        if (kind === 'demand' || kind === 'demand-per-year') {
          if (mapping.destinationCol !== undefined) setDestinationCol(mapping.destinationCol);
          if (mapping.demandCol !== undefined) setDemandCol(mapping.demandCol);
          if (mapping.yearCol !== undefined) setYearCol(mapping.yearCol);
        } else if (kind === 'cost') {
          if (mapping.originCol !== undefined) setOriginCol(mapping.originCol);
          if (mapping.destinationCol !== undefined) setDestinationCol(mapping.destinationCol);
          if (mapping.costCol !== undefined) setCostCol(mapping.costCol);
          if (mapping.costPerMileCol !== undefined) setCostPerMileCol(mapping.costPerMileCol);
          if (mapping.distanceCol !== undefined) setDistanceCol(mapping.distanceCol);
          if (mapping.costPerCwtCol !== undefined) setCostPerCwtCol(mapping.costPerCwtCol);
          if (mapping.weightCol !== undefined) setWeightCol(mapping.weightCol);
          if (mapping.modeCol !== undefined) setModeCol(mapping.modeCol);
        } else if (kind === 'capacity') {
          if (mapping.facilityCol !== undefined) setFacilityCol(mapping.facilityCol);
          if (mapping.capacityCol !== undefined) setCapacityCol(mapping.capacityCol);
          if (mapping.utilizationCol !== undefined) setUtilizationCol(mapping.utilizationCol);
        }
      } catch (e) {
        console.warn('Failed to load saved mapping:', e);
      }
    }
  }

  const getKindTitle = () => {
    switch (kind) {
      case 'demand': return 'Destination Demand (Baseline)';
      case 'demand-per-year': return 'Destination Demand (Per Year)';
      case 'cost': return 'Transportation Cost Matrix';
      case 'capacity': return 'Facility Capacity';
      default: return kind;
    }
  };

  function isColumnSelected(colIndex: number): boolean {
    const mapping = getCurrentMapping();
    return Object.values(mapping).includes(colIndex);
  }

  return (
    <div className="rounded-xl border p-4 grid gap-3 bg-gray-50">
      <div className="flex justify-between items-center">
        <div className="text-lg font-medium text-gray-900">{getKindTitle()}</div>
        <div className="flex gap-2">
          <button 
            onClick={loadMapping} 
            className="px-2 py-1 text-xs rounded border text-gray-600 hover:bg-gray-100"
          >
            Load Saved
          </button>
          <button 
            onClick={saveMapping} 
            className="px-2 py-1 text-xs rounded border text-gray-600 hover:bg-gray-100"
          >
            Save Mapping
          </button>
          <button 
            onClick={() => setShowPreview(!showPreview)} 
            className="px-2 py-1 text-xs rounded border text-gray-600 hover:bg-gray-100"
          >
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
        </div>
      </div>

      {/* Mapping Controls */}
      {(kind === 'demand' || kind === 'demand-per-year') && (
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <L label="Destination" value={destinationCol} setValue={setDestinationCol} opts={opts} />
          <L label="Demand/Volume" value={demandCol} setValue={setDemandCol} opts={opts} />
          {kind === 'demand-per-year' && (
            <L label="Year" value={yearCol} setValue={setYearCol} opts={opts} allowUndefined />
          )}
        </div>
      )}

      {kind === 'cost' && (
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <div className="md:col-span-3 grid md:grid-cols-2 gap-3">
            <L label="Origin" value={originCol} setValue={setOriginCol} opts={opts} />
            <L label="Destination" value={destinationCol} setValue={setDestinationCol} opts={opts} />
          </div>
          
          <div className="md:col-span-3 border-t pt-2">
            <div className="text-xs text-gray-600 mb-2">Cost Calculation (choose one method):</div>
            <div className="grid md:grid-cols-3 gap-3">
              <L label="Direct Cost" value={costCol} setValue={setCostCol} opts={opts} allowUndefined />
              <L label="Cost per Mile" value={costPerMileCol} setValue={setCostPerMileCol} opts={opts} allowUndefined />
              <L label="Distance (miles)" value={distanceCol} setValue={setDistanceCol} opts={opts} allowUndefined />
            </div>
            <div className="grid md:grid-cols-3 gap-3 mt-2">
              <L label="Cost per CWT" value={costPerCwtCol} setValue={setCostPerCwtCol} opts={opts} allowUndefined />
              <L label="Weight (lbs)" value={weightCol} setValue={setWeightCol} opts={opts} allowUndefined />
              <L label="Mode (optional)" value={modeCol} setValue={setModeCol} opts={opts} allowUndefined />
            </div>
          </div>
        </div>
      )}

      {kind === 'capacity' && (
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <L label="Facility/Location" value={facilityCol} setValue={setFacilityCol} opts={opts} />
          <L label="Capacity" value={capacityCol} setValue={setCapacityCol} opts={opts} />
          <L label="Max Utilization" value={utilizationCol} setValue={setUtilizationCol} opts={opts} allowUndefined />
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <div className="font-medium mb-1">Mapping Errors:</div>
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, i) => <li key={i}>{error}</li>)}
          </ul>
        </div>
      )}

      {/* Preview */}
      {showPreview && initialData && initialData.length > 1 && (
        <div className="border rounded p-2 bg-white max-h-64 overflow-auto">
          <div className="text-xs text-gray-600 mb-2">Data Preview with Current Mapping:</div>
          <table className="text-xs w-full">
            <thead>
              <tr className="border-b">
                {headers.map((h, i) => (
                  <th key={i} className={`px-2 py-1 text-left ${isColumnSelected(i) ? 'bg-blue-100' : ''}`}>
                    {h} {isColumnSelected(i) && <span className="text-blue-600">*</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initialData.slice(1, 6).map((row, i) => (
                <tr key={i} className="border-b">
                  {headers.map((_, ci) => (
                    <td key={ci} className={`px-2 py-1 ${isColumnSelected(ci) ? 'bg-blue-50' : ''}`}>
                      {String(row[ci] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2 border-t">
        <button 
          className="px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-800 disabled:opacity-50" 
          onClick={apply}
          disabled={errors.length > 0}
        >
          Apply Mapping
        </button>
        <div className="text-xs text-gray-500 flex items-center">
          Map your file columns to the required data fields
        </div>
      </div>
    </div>
  );
}

function L({ 
  label, 
  value, 
  setValue, 
  opts, 
  allowUndefined = false 
}: { 
  label: string; 
  value: any; 
  setValue: (v: any) => void; 
  opts: ColumnOption[]; 
  allowUndefined?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-600 font-medium">{label}</span>
      <select 
        className="border rounded px-2 py-1 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
        value={value ?? ''} 
        onChange={e => setValue(e.target.value === '' ? undefined : Number(e.target.value))}
      >
        {allowUndefined && <option value="">— Not Required —</option>}
        {opts.map(o => (
          <option key={o.index} value={o.index}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
