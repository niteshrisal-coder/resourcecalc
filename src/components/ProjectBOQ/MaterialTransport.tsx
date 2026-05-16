import React, { ChangeEvent, useEffect, useState, useCallback } from 'react';
import { Project, TransportMaterial } from '../../types/boq';

// Define load categories
const LOAD_CATEGORY_OPTIONS = ['Easy', 'Difficult', 'Very Difficult', 'High Volume'] as const;
type LoadCategoryName = typeof LOAD_CATEGORY_OPTIONS[number];
type TransportMode = 'Porter' | 'Tractor' | 'Truck';

const isValidLoadCategory = (value: unknown): value is LoadCategoryName =>
  typeof value === 'string' && (LOAD_CATEGORY_OPTIONS as readonly string[]).includes(value);

const safeLoadCategory = (value: unknown): LoadCategoryName =>
  isValidLoadCategory(value) ? value : 'Easy';

interface TransportCoefficients {
  [mode: string]: {
    [category in LoadCategoryName]: {
      metalled: number;
      gravelled: number;
    };
  };
}

interface MaterialTransportProps {
  project: Project;
  transportMaterials: TransportMaterial[];
  updateTransportMaterial: (materialName: string, field: keyof TransportMaterial, value: any) => void;
  updateTransportMaterialByIndex: (index: number, field: keyof TransportMaterial, value: any) => void;
  addTransportMaterial: () => void;
  removeTransportMaterial: (materialName: string) => void;
  onUpdateTransportMode?: (mode: 'Tractor' | 'Truck') => void;
  onUpdateTransportDistances?: (distances: { porterDistance: number; gravelledDistance: number; metalledDistance: number }) => void;
  onUpdateTransportCoefficients?: (coefficients: TransportCoefficients) => void;
}

const DEFAULT_TRANSPORT_COEFFICIENTS: TransportCoefficients = {
  Porter: {
    Easy: { metalled: 2.2, gravelled: 2.5 },
    Difficult: { metalled: 3.3, gravelled: 3.6 },
    'Very Difficult': { metalled: 5.2, gravelled: 6.1 },
    'High Volume': { metalled: 4.5, gravelled: 4.9 }
  },
  Tractor: {
    Easy: { metalled: 0.074, gravelled: 0.075 },
    Difficult: { metalled: 0.074, gravelled: 0.075 },
    'Very Difficult': { metalled: 0.074, gravelled: 0.075 },
    'High Volume': { metalled: 0.074, gravelled: 0.075 }
  },
  Truck: {
    Easy: { metalled: 0.020, gravelled: 0.049 },
    Difficult: { metalled: 0.020, gravelled: 0.063 },
    'Very Difficult': { metalled: 0.022, gravelled: 0.063 },
    'High Volume': { metalled: 0.022, gravelled: 0.025 }
  }
};

export default function MaterialTransport({
  project,
  transportMaterials,
  updateTransportMaterial,
  updateTransportMaterialByIndex,
  addTransportMaterial,
  removeTransportMaterial,
  onUpdateTransportMode,
  onUpdateTransportDistances,
  onUpdateTransportCoefficients
}: MaterialTransportProps) {
  const [transportMode, setTransportMode] = useState<Exclude<TransportMode, 'Porter'>>('Tractor');
  const [transportCoefficients, setTransportCoefficients] = useState<TransportCoefficients>(DEFAULT_TRANSPORT_COEFFICIENTS);
  const [porterDistance, setPorterDistance] = useState<number>(0);
  const [gravelledDistance, setGravelledDistance] = useState<number>(0);
  const [metalledDistance, setMetalledDistance] = useState<number>(0);

  // Conversion factor: 1 kosh = 3.218 km
  const KM_TO_KOSH = 3.218;

  // Load saved values from project
  useEffect(() => {
    if (project.transportMode) {
      setTransportMode(project.transportMode);
    }
    if (project.transportCoefficients) {
      setTransportCoefficients(project.transportCoefficients);
    }
    if (project.transportDistances) {
      setPorterDistance(project.transportDistances.porterDistance || 0);
      setGravelledDistance(project.transportDistances.gravelledDistance || 0);
      setMetalledDistance(project.transportDistances.metalledDistance || 0);
    }
  }, [project]);

  // Compute transport costs based on distances, unit weight, and load category
  const computeTransportCosts = useCallback((
    unitWeight: number,
    loadCategory: unknown,
    mode: Exclude<TransportMode, 'Porter'>,
    gravelledDist: number,
    metalledDist: number,
    porterDist: number
  ) => {
    const category = safeLoadCategory(loadCategory);
    const rates = transportCoefficients[mode]?.[category] ?? DEFAULT_TRANSPORT_COEFFICIENTS[mode][category];
    const porterRate = transportCoefficients.Porter?.[category]?.gravelled ?? DEFAULT_TRANSPORT_COEFFICIENTS.Porter[category].gravelled;
    const porterDistanceKosh = porterDist / KM_TO_KOSH;
    
    // For Tractor, use km directly; for Truck, convert km to kosh
    const gravelledDistForCalculation = mode === 'Truck' ? gravelledDist / KM_TO_KOSH : gravelledDist;
    const metalledDistForCalculation = mode === 'Truck' ? metalledDist / KM_TO_KOSH : metalledDist;
    
    const metalled_cost_per_unit = metalledDistForCalculation * unitWeight * rates.metalled;
    const gravelled_cost_per_unit = gravelledDistForCalculation * unitWeight * rates.gravelled;
    const porter_cost_per_unit = unitWeight * porterDistanceKosh * porterRate;
    const total_cost_per_unit = metalled_cost_per_unit + gravelled_cost_per_unit + porter_cost_per_unit;
    
    return {
      metalled_cost_per_unit,
      gravelled_cost_per_unit,
      porter_cost_per_unit,
      total_cost_per_unit
    };
  }, [transportCoefficients, KM_TO_KOSH]);

  // Handle unit weight change
  const handleUnitWeightChange = useCallback((materialName: string, newUnitWeight: number) => {
    const material = transportMaterials.find(m => m.material_name === materialName);
    if (material) {
      const costs = computeTransportCosts(
        newUnitWeight,
        material.load_category,
        transportMode,
        gravelledDistance,
        metalledDistance,
        porterDistance
      );
      
      updateTransportMaterial(materialName, 'unit_weight', newUnitWeight);
      updateTransportMaterial(materialName, 'metalled_cost_per_unit', costs.metalled_cost_per_unit);
      updateTransportMaterial(materialName, 'gravelled_cost_per_unit', costs.gravelled_cost_per_unit);
      updateTransportMaterial(materialName, 'porter_cost_per_unit', costs.porter_cost_per_unit);
      updateTransportMaterial(materialName, 'total_cost_per_unit', costs.total_cost_per_unit);
    }
  }, [transportMaterials, transportMode, gravelledDistance, metalledDistance, porterDistance, computeTransportCosts, updateTransportMaterial]);

  // Handle load category change
  const handleLoadCategoryChange = useCallback((materialName: string, loadCategory: LoadCategoryName) => {
    const material = transportMaterials.find(m => m.material_name === materialName);
    if (material) {
      const costs = computeTransportCosts(
        material.unit_weight,
        loadCategory,
        transportMode,
        gravelledDistance,
        metalledDistance,
        porterDistance
      );
      
      updateTransportMaterial(materialName, 'load_category', loadCategory);
      updateTransportMaterial(materialName, 'metalled_cost_per_unit', costs.metalled_cost_per_unit);
      updateTransportMaterial(materialName, 'gravelled_cost_per_unit', costs.gravelled_cost_per_unit);
      updateTransportMaterial(materialName, 'porter_cost_per_unit', costs.porter_cost_per_unit);
      updateTransportMaterial(materialName, 'total_cost_per_unit', costs.total_cost_per_unit);
    }
  }, [transportMaterials, transportMode, gravelledDistance, metalledDistance, porterDistance, computeTransportCosts, updateTransportMaterial]);

  // Handle transport mode change
  const handleTransportModeChange = useCallback((mode: Exclude<TransportMode, 'Porter'>) => {
    setTransportMode(mode);
    if (onUpdateTransportMode) {
      onUpdateTransportMode(mode);
    }
  }, [onUpdateTransportMode]);

  // Handle porter distance change
  const handlePorterDistanceChange = useCallback((value: number) => {
    setPorterDistance(value);
    if (onUpdateTransportDistances) {
      onUpdateTransportDistances({ porterDistance: value, gravelledDistance, metalledDistance });
    }
  }, [gravelledDistance, metalledDistance, onUpdateTransportDistances]);

  // Handle gravelled distance change
  const handleGravelledDistanceChange = useCallback((value: number) => {
    setGravelledDistance(value);
    if (onUpdateTransportDistances) {
      onUpdateTransportDistances({ porterDistance, gravelledDistance: value, metalledDistance });
    }
  }, [porterDistance, metalledDistance, onUpdateTransportDistances]);

  // Handle metalled distance change
  const handleMetalledDistanceChange = useCallback((value: number) => {
    setMetalledDistance(value);
    if (onUpdateTransportDistances) {
      onUpdateTransportDistances({ porterDistance, gravelledDistance, metalledDistance: value });
    }
  }, [porterDistance, gravelledDistance, onUpdateTransportDistances]);

  // Update all materials when distances or mode change
  useEffect(() => {
    transportMaterials.forEach((material) => {
      const costs = computeTransportCosts(
        material.unit_weight,
        material.load_category,
        transportMode,
        gravelledDistance,
        metalledDistance,
        porterDistance
      );
      
      updateTransportMaterial(material.material_name, 'metalled_cost_per_unit', costs.metalled_cost_per_unit);
      updateTransportMaterial(material.material_name, 'gravelled_cost_per_unit', costs.gravelled_cost_per_unit);
      updateTransportMaterial(material.material_name, 'porter_cost_per_unit', costs.porter_cost_per_unit);
      updateTransportMaterial(material.material_name, 'total_cost_per_unit', costs.total_cost_per_unit);
    });
  }, [transportMode, gravelledDistance, metalledDistance, porterDistance, transportCoefficients, computeTransportCosts, updateTransportMaterial, transportMaterials]);

  // Handle transport coefficient update
  const updateTransportCoefficient = useCallback((
    mode: TransportMode, 
    category: LoadCategoryName, 
    roadType: 'metalled' | 'gravelled', 
    value: number
  ) => {
    setTransportCoefficients((prev) => {
      const newCoefficients = {
        ...prev,
        [mode]: {
          ...prev[mode],
          [category]: {
            ...prev[mode][category],
            [roadType]: value
          }
        }
      };
      if (onUpdateTransportCoefficients) {
        onUpdateTransportCoefficients(newCoefficients);
      }
      return newCoefficients;
    });
  }, [onUpdateTransportCoefficients]);

  return (
    <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-black/5 overflow-hidden">
      <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[#1E293B]">Material & Transportation</h3>
        <button
          onClick={addTransportMaterial}
          className="px-3 py-1 bg-[#1E293B] text-white rounded-lg text-xs font-semibold hover:bg-[#2D3748] transition-colors"
        >
          + Add Material
        </button>
      </div>
      <div className="p-4 space-y-4">
        {/* Project Info */}
        <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div><span className="font-semibold">Project:</span> {project.name}</div>
            <div><span className="font-semibold">Location:</span> {project.location || 'N/A'}</div>
          </div>
        </div>

        {/* Transport Mode Selection */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
          <label className="block text-sm font-semibold text-black/70 mb-2">Transport Mode</label>
          <div className="flex gap-2">
            <button
              onClick={() => handleTransportModeChange('Tractor')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                transportMode === 'Tractor'
                  ? 'bg-[#1E293B] text-white'
                  : 'bg-[#F8FAFC] text-black/60 hover:bg-[#E2E8F0]'
              }`}
            >
              Tractor
            </button>
            <button
              onClick={() => handleTransportModeChange('Truck')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                transportMode === 'Truck'
                  ? 'bg-[#1E293B] text-white'
                  : 'bg-[#F8FAFC] text-black/60 hover:bg-[#E2E8F0]'
              }`}
            >
              Truck
            </button>
          </div>
          <p className="text-xs text-black/40 mt-2">
            {transportMode === 'Tractor' 
              ? 'Tractor: Distances used directly in km' 
              : 'Truck: Distances converted from km to kosh (1 kosh = 3.218 km)'}
          </p>
        </div>

        {/* Transport Coefficients Editor */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
          <h4 className="text-sm font-bold uppercase tracking-widest text-[#1E293B] mb-3">Transport Coefficients (Rs./kg)</h4>
          
          {/* Porter Coefficients */}
          <div className="mb-6">
            <h5 className="text-sm font-bold text-[#1E293B] mb-2">Porter Transport</h5>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5F5F0]/50 border-b border-black/5">
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest">Load Category</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-right">Gravelled (Rs./kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {LOAD_CATEGORY_OPTIONS.map((category) => (
                    <tr key={category}>
                      <td className="px-3 py-2 text-sm font-bold">{category}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={transportCoefficients.Porter[category].gravelled}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => updateTransportCoefficient('Porter', category, 'gravelled', parseFloat(e.target.value) || 0)}
                          className="w-24 p-1 border border-black/10 rounded-lg text-sm text-right"
                          step="0.1"
                          min="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tractor/Truck Coefficients */}
          <div>
            <h5 className="text-sm font-bold text-[#1E293B] mb-2">{transportMode} Transport</h5>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5F5F0]/50 border-b border-black/5">
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest">Load Category</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-right">Metalled (Rs./kg)</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-right">Gravelled (Rs./kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {LOAD_CATEGORY_OPTIONS.map((category) => (
                    <tr key={category}>
                      <td className="px-3 py-2 text-sm font-bold">{category}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={transportCoefficients[transportMode][category].metalled}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => updateTransportCoefficient(transportMode, category, 'metalled', parseFloat(e.target.value) || 0)}
                          className="w-24 p-1 border border-black/10 rounded-lg text-sm text-right"
                          step="0.001"
                          min="0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={transportCoefficients[transportMode][category].gravelled}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => updateTransportCoefficient(transportMode, category, 'gravelled', parseFloat(e.target.value) || 0)}
                          className="w-24 p-1 border border-black/10 rounded-lg text-sm text-right"
                          step="0.001"
                          min="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Materials Table */}
        {transportMaterials.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px] bg-white rounded-lg overflow-hidden border border-black/5">
              <thead>
                <tr className="bg-[#1E293B] text-white">
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest">Material Name</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest">Unit Weight (kg)</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest">Load Category</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-right">Metalled Cost</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-right">Gravelled Cost</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-right">Porter Cost</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-right">Total Cost</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {transportMaterials.map((material, idx) => (
                  <tr key={idx} className="hover:bg-black/5 transition-colors">
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        value={material.material_name}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => updateTransportMaterial(material.material_name, 'material_name', e.target.value)}
                        className="w-full p-2 border border-black/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Material name"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        value={material.unit_weight || 0}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => 
                          handleUnitWeightChange(material.material_name, parseFloat(e.target.value) || 0)
                        }
                        className="w-20 p-1 border border-black/10 rounded-lg text-sm text-right"
                        step="0.1"
                        min="0"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={material.load_category}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => handleLoadCategoryChange(material.material_name, e.target.value as LoadCategoryName)}
                        className="w-full p-2 border border-black/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        {LOAD_CATEGORY_OPTIONS.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-mono">
                      {material.metalled_cost_per_unit.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-mono">
                      {material.gravelled_cost_per_unit.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-mono">
                      {material.porter_cost_per_unit.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-bold text-emerald-600">
                      {material.total_cost_per_unit.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => removeTransportMaterial(material.material_name)}
                        className="text-red-400 p-2 rounded-full hover:bg-red-50 transition-colors"
                        title="Remove material"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#F5F5F0] border-t border-black/10 font-bold">
                  <td colSpan={6} className="px-3 py-3 text-sm uppercase tracking-widest text-right">Total Transportation Cost</td>
                  <td className="px-3 py-3 text-lg font-bold text-emerald-600 text-right">
                    {transportMaterials.reduce((acc, m) => acc + m.total_cost_per_unit, 0).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-black/20 bg-[#F8FAFC] rounded-lg border border-dashed border-black/10">
            <p className="text-sm">No materials added yet. Click "Add Material" to get started.</p>
          </div>
        )}

        {/* Distance Information */}
        <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
          <h4 className="text-sm font-bold uppercase tracking-widest text-[#1E293B] mb-3">Transportation Distances</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-black/60 uppercase tracking-widest">Porter Distance</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={porterDistance}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handlePorterDistanceChange(parseFloat(e.target.value) || 0)}
                  className="flex-1 p-2 border border-black/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="0"
                  step="0.1"
                  min="0"
                />
                <span className="text-sm text-black/60">km</span>
                <span className="text-sm text-black/40">({(porterDistance / KM_TO_KOSH).toFixed(2)} kosh)</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-black/60 uppercase tracking-widest">Gravelled Distance</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={gravelledDistance}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleGravelledDistanceChange(parseFloat(e.target.value) || 0)}
                  className="flex-1 p-2 border border-black/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="0"
                  step="0.1"
                  min="0"
                />
                <span className="text-sm text-black/60">km</span>
                <span className="text-sm text-black/40">
                  ({transportMode === 'Truck' ? (gravelledDistance / KM_TO_KOSH).toFixed(2) : gravelledDistance} {transportMode === 'Truck' ? 'kosh' : 'km'})
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-black/60 uppercase tracking-widest">Metalled Distance</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={metalledDistance}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleMetalledDistanceChange(parseFloat(e.target.value) || 0)}
                  className="flex-1 p-2 border border-black/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="0"
                  step="0.1"
                  min="0"
                />
                <span className="text-sm text-black/60">km</span>
                <span className="text-sm text-black/40">
                  ({transportMode === 'Truck' ? (metalledDistance / KM_TO_KOSH).toFixed(2) : metalledDistance} {transportMode === 'Truck' ? 'kosh' : 'km'})
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-black/40">
            Note: 1 kosh = {KM_TO_KOSH} km (traditional Nepali unit of distance)
            {transportMode === 'Truck' 
              ? ' • Truck: distances converted to kosh for calculation' 
              : ' • Tractor: distances used directly in km'}
          </div>
        </div>

        {/* Load Category Legend */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs font-semibold text-blue-800 mb-1">Load Categories:</p>
          <div className="flex flex-wrap gap-2">
            {LOAD_CATEGORY_OPTIONS.map((cat) => (
              <span key={cat} className="text-xs px-2 py-1 bg-white rounded-md border border-blue-200 text-blue-700">
                {cat}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}