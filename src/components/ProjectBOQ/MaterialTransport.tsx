import React from 'react';
import { Project, TransportMaterial, Rate } from '../../types/boq';
import { getMaterialUnitWeight, setMaterialUnitWeight, getNorms } from '../../utils/storage';

interface NormResource {
  name: string;
  unit?: string;
  resource_type?: string;
}

interface Norm {
  id: number;
  resources?: NormResource[];
}

type ResourceType = 'Labour' | 'Material' | 'Equipment';

interface ResourceSummary {
  name: string;
  type: ResourceType;
  unit: string;
  rate: number;
  apply_vat: boolean;
  source: string;
}

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
  globalRates: Rate[];
  updateTransportMaterial: (materialName: string, field: keyof TransportMaterial, value: any) => void;
  updateTransportMaterialByIndex: (index: number, field: keyof TransportMaterial, value: any) => void;
  updateCustomRate: (resourceName: string, newRate: number, unit: string) => void;
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
  globalRates,
  updateTransportMaterial,
  updateTransportMaterialByIndex,
  updateCustomRate,
  onUpdateTransportMode,
  onUpdateTransportDistances,
  onUpdateTransportCoefficients,
}: MaterialTransportProps) {
  const [transportMode, setTransportMode] = React.useState<Exclude<TransportMode, 'Porter'>>('Tractor');
  const [transportCoefficients, setTransportCoefficients] = React.useState<TransportCoefficients>(DEFAULT_TRANSPORT_COEFFICIENTS);
  const [porterDistance, setPorterDistance] = React.useState<number>(0);
  const [gravelledDistance, setGravelledDistance] = React.useState<number>(0);
  const [metalledDistance, setMetalledDistance] = React.useState<number>(0);

  // Conversion factor: 1 kosh = 3.218 km
  const KM_TO_KOSH = 3.218;

  const norms = React.useMemo<Norm[]>(() => getNorms(), []);

  const getLinkedRate = React.useCallback((resourceName: string) => {
    const resourceKey = resourceName.trim().toLowerCase();
    const customRate = project.customRates?.find((r) => r.resourceName.trim().toLowerCase() === resourceKey);
    if (customRate) {
      return { rate: customRate.rate, apply_vat: false };
    }

    const globalRate = globalRates.find((rate) => rate.name.trim().toLowerCase() === resourceKey);
    return {
      rate: globalRate?.rate ?? 0,
      apply_vat: globalRate?.apply_vat ?? false
    };
  }, [globalRates, project.customRates]);

  const getLinkedCostFields = React.useCallback((resourceName: string) => {
    const { rate, apply_vat } = getLinkedRate(resourceName);
    return {
      original_cost: rate,
      vat: apply_vat ? parseFloat((rate * 0.13).toFixed(2)) : 0
    };
  }, [getLinkedRate]);

  const getMaterialUnit = React.useCallback((materialName: string) => {
    const unitInfo = globalRates.find((rate) => rate.name.trim().toLowerCase() === materialName.trim().toLowerCase());
    return unitInfo?.unit || 'kg';
  }, [globalRates]);

  // Load saved values from project
  React.useEffect(() => {
    const coeffsChanged = project.transportCoefficients &&
      JSON.stringify(project.transportCoefficients) !== JSON.stringify(transportCoefficients);

    if (project.transportMode && project.transportMode !== transportMode) {
      setTransportMode(project.transportMode);
    }

    if (coeffsChanged) {
      setTransportCoefficients(project.transportCoefficients);
    }

    if (project.transportDistances) {
      if ((project.transportDistances.porterDistance || 0) !== porterDistance) {
        setPorterDistance(project.transportDistances.porterDistance || 0);
      }
      if ((project.transportDistances.gravelledDistance || 0) !== gravelledDistance) {
        setGravelledDistance(project.transportDistances.gravelledDistance || 0);
      }
      if ((project.transportDistances.metalledDistance || 0) !== metalledDistance) {
        setMetalledDistance(project.transportDistances.metalledDistance || 0);
      }
    }
  }, [
    project.transportMode,
    project.transportCoefficients,
    project.transportDistances,
    transportMode,
    transportCoefficients,
    porterDistance,
    gravelledDistance,
    metalledDistance
  ]);

  // Compute transport costs based on distances, unit weight, and load category
  const computeTransportCosts = React.useCallback((
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

  // Apply saved global weight defaults when available
  React.useEffect(() => {
    transportMaterials.forEach((material) => {
      const defaultWeight = getMaterialUnitWeight(material.material_name);
      if (defaultWeight && (!material.unit_weight || material.unit_weight === 0)) {
        const costs = computeTransportCosts(
          defaultWeight,
          material.load_category,
          transportMode,
          gravelledDistance,
          metalledDistance,
          porterDistance
        );

        updateTransportMaterial(material.material_name, 'unit_weight', defaultWeight);
        updateTransportMaterial(material.material_name, 'metalled_cost_per_unit', costs.metalled_cost_per_unit);
        updateTransportMaterial(material.material_name, 'gravelled_cost_per_unit', costs.gravelled_cost_per_unit);
        updateTransportMaterial(material.material_name, 'porter_cost_per_unit', costs.porter_cost_per_unit);
        updateTransportMaterial(material.material_name, 'total_cost_per_unit', costs.total_cost_per_unit);
      }
    });
  }, [transportMaterials, transportMode, gravelledDistance, metalledDistance, porterDistance, computeTransportCosts, updateTransportMaterial]);

  React.useEffect(() => {
    transportMaterials.forEach((material, index) => {
      if (!material.material_name.trim()) return;

      const linkedCost = getLinkedCostFields(material.material_name);
      const shouldUpdateOriginal = material.original_cost !== linkedCost.original_cost;
      const shouldUpdateVat = material.vat !== linkedCost.vat;

      if (shouldUpdateOriginal || shouldUpdateVat) {
        if (shouldUpdateOriginal) {
          updateTransportMaterialByIndex(index, 'original_cost', linkedCost.original_cost);
        }
        if (shouldUpdateVat) {
          updateTransportMaterialByIndex(index, 'vat', linkedCost.vat);
        }
      }
    });
  }, [transportMaterials, getLinkedCostFields, updateTransportMaterialByIndex]);

  // Handle unit weight change
  const handleUnitWeightChange = React.useCallback((index: number, newUnitWeight: number) => {
    const material = transportMaterials[index];
    if (material) {
      const costs = computeTransportCosts(
        newUnitWeight,
        material.load_category,
        transportMode,
        gravelledDistance,
        metalledDistance,
        porterDistance
      );
      
      updateTransportMaterialByIndex(index, 'unit_weight', newUnitWeight);
      updateTransportMaterialByIndex(index, 'metalled_cost_per_unit', costs.metalled_cost_per_unit);
      updateTransportMaterialByIndex(index, 'gravelled_cost_per_unit', costs.gravelled_cost_per_unit);
      updateTransportMaterialByIndex(index, 'porter_cost_per_unit', costs.porter_cost_per_unit);
      updateTransportMaterialByIndex(index, 'total_cost_per_unit', costs.total_cost_per_unit);
      if (newUnitWeight > 0) {
        setMaterialUnitWeight(material.material_name, newUnitWeight);
      }
    }
  }, [transportMaterials, transportMode, gravelledDistance, metalledDistance, porterDistance, computeTransportCosts, updateTransportMaterialByIndex]);

  // Handle load category change
  const handleLoadCategoryChange = React.useCallback((index: number, loadCategory: LoadCategoryName) => {
    const material = transportMaterials[index];
    if (material) {
      const costs = computeTransportCosts(
        material.unit_weight,
        loadCategory,
        transportMode,
        gravelledDistance,
        metalledDistance,
        porterDistance
      );
      
      updateTransportMaterialByIndex(index, 'load_category', loadCategory);
      updateTransportMaterialByIndex(index, 'metalled_cost_per_unit', costs.metalled_cost_per_unit);
      updateTransportMaterialByIndex(index, 'gravelled_cost_per_unit', costs.gravelled_cost_per_unit);
      updateTransportMaterialByIndex(index, 'porter_cost_per_unit', costs.porter_cost_per_unit);
      updateTransportMaterialByIndex(index, 'total_cost_per_unit', costs.total_cost_per_unit);
    }
  }, [transportMaterials, transportMode, gravelledDistance, metalledDistance, porterDistance, computeTransportCosts, updateTransportMaterialByIndex]);

  const usedResources = React.useMemo<ResourceSummary[]>(() => {
    const resourcesMap = new Map<string, ResourceSummary>();
    const customRates = project.customRates || [];

    project.items?.forEach((item) => {
      const norm = norms.find((n: Norm) => n.id === item.normId);
      if (!norm || !Array.isArray(norm.resources)) return;

      norm.resources.forEach((res: NormResource) => {
        if (!res?.name || !res.name.trim()) return;
        const resourceName = res.name.trim();
        const resourceType = res.resource_type as ResourceType | undefined;
        if (resourceType !== 'Labour' && resourceType !== 'Material' && resourceType !== 'Equipment') return;

        const key = `${resourceName.toLowerCase()}|${resourceType}`;
        if (resourcesMap.has(key)) return;

        const customRate = customRates.find((r) => r.resourceName.trim().toLowerCase() === resourceName.toLowerCase());
        const globalRate = globalRates.find((rate) => rate.name.trim().toLowerCase() === resourceName.toLowerCase() && rate.resource_type === resourceType);

        const rateValue = customRate?.rate ?? globalRate?.rate ?? 0;
        const unitValue = customRate?.unit ?? globalRate?.unit ?? res.unit ?? '';
        const applyVatValue = customRate ? false : globalRate?.apply_vat ?? false;
        const source = customRate ? 'Custom' : globalRate ? 'Rates' : 'Unknown';

        resourcesMap.set(key, {
          name: resourceName,
          type: resourceType,
          unit: unitValue,
          rate: rateValue,
          apply_vat: applyVatValue,
          source
        });
      });
    });

    return Array.from(resourcesMap.values()).sort((a, b) => {
      const order = { Labour: 1, Material: 2, Equipment: 3 } as const;
      if (a.type !== b.type) return order[a.type] - order[b.type];
      return a.name.localeCompare(b.name);
    });
  }, [project.items, project.customRates, norms, globalRates]);

  type ResourceGroup = {
    type: ResourceType;
    label: string;
    colorClass: string;
    textClass: string;
    items: ResourceSummary[];
  };

  const groupedResources = React.useMemo<ResourceGroup[]>(() => {
    const groups: Record<ResourceType, ResourceSummary[]> = {
      Labour: [],
      Material: [],
      Equipment: []
    };

    usedResources.forEach((resource: ResourceSummary) => {
      groups[resource.type].push(resource);
    });

    const groupTemplates: Array<Omit<ResourceGroup, 'items'>> = [
      { type: 'Labour', label: 'Labour', colorClass: 'bg-blue-50', textClass: 'text-blue-700' },
      { type: 'Equipment', label: 'Equipment', colorClass: 'bg-emerald-50', textClass: 'text-emerald-700' }
    ];

    return groupTemplates.map((group) => ({
      ...group,
      items: groups[group.type].sort((a: ResourceSummary, b: ResourceSummary) => a.name.localeCompare(b.name))
    }));
  }, [usedResources]);

  const hasRateEditableResources = groupedResources.some((group: ResourceGroup) => group.items.length > 0);

  // Handle transport mode change
  const handleTransportModeChange = React.useCallback((mode: Exclude<TransportMode, 'Porter'>) => {
    setTransportMode(mode);
    if (onUpdateTransportMode) {
      onUpdateTransportMode(mode);
    }
  }, [onUpdateTransportMode]);

  // Handle porter distance change
  const handlePorterDistanceChange = React.useCallback((value: number) => {
    setPorterDistance(value);
    if (onUpdateTransportDistances) {
      onUpdateTransportDistances({ porterDistance: value, gravelledDistance, metalledDistance });
    }
  }, [gravelledDistance, metalledDistance, onUpdateTransportDistances]);

  // Handle gravelled distance change
  const handleGravelledDistanceChange = React.useCallback((value: number) => {
    setGravelledDistance(value);
    if (onUpdateTransportDistances) {
      onUpdateTransportDistances({ porterDistance, gravelledDistance: value, metalledDistance });
    }
  }, [porterDistance, metalledDistance, onUpdateTransportDistances]);

  // Handle metalled distance change
  const handleMetalledDistanceChange = React.useCallback((value: number) => {
    setMetalledDistance(value);
    if (onUpdateTransportDistances) {
      onUpdateTransportDistances({ porterDistance, gravelledDistance, metalledDistance: value });
    }
  }, [porterDistance, gravelledDistance, onUpdateTransportDistances]);

  // Update all materials when distances or mode change
  React.useEffect(() => {
    transportMaterials.forEach((material) => {
      const costs = computeTransportCosts(
        material.unit_weight,
        material.load_category,
        transportMode,
        gravelledDistance,
        metalledDistance,
        porterDistance
      );

      const needsUpdate =
        material.metalled_cost_per_unit !== costs.metalled_cost_per_unit ||
        material.gravelled_cost_per_unit !== costs.gravelled_cost_per_unit ||
        material.porter_cost_per_unit !== costs.porter_cost_per_unit ||
        material.total_cost_per_unit !== costs.total_cost_per_unit;

      if (needsUpdate) {
        updateTransportMaterial(material.material_name, 'metalled_cost_per_unit', costs.metalled_cost_per_unit);
        updateTransportMaterial(material.material_name, 'gravelled_cost_per_unit', costs.gravelled_cost_per_unit);
        updateTransportMaterial(material.material_name, 'porter_cost_per_unit', costs.porter_cost_per_unit);
        updateTransportMaterial(material.material_name, 'total_cost_per_unit', costs.total_cost_per_unit);
      }
    });
  }, [transportMode, gravelledDistance, metalledDistance, porterDistance, transportCoefficients, computeTransportCosts, updateTransportMaterial, transportMaterials]);

  // Handle transport coefficient update
  const updateTransportCoefficient = React.useCallback((
    mode: TransportMode, 
    category: LoadCategoryName, 
    roadType: 'metalled' | 'gravelled', 
    value: number
  ) => {
    setTransportCoefficients((prev: TransportCoefficients) => {
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
      <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#1E293B]">Resource & Transport</h3>
          <p className="text-xs text-slate-500 mt-1">Materials and labour rates are pulled from the selected BOQ and saved resource rates.</p>
        </div>
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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTransportCoefficient('Porter', category, 'gravelled', parseFloat(e.target.value) || 0)}
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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTransportCoefficient(transportMode, category, 'metalled', parseFloat(e.target.value) || 0)}
                          className="w-24 p-1 border border-black/10 rounded-lg text-sm text-right"
                          step="0.001"
                          min="0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={transportCoefficients[transportMode][category].gravelled}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTransportCoefficient(transportMode, category, 'gravelled', parseFloat(e.target.value) || 0)}
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

        {/* Used Labour & Resources */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-widest text-[#1E293B]">Used Labour & Equipment</h4>
              <p className="text-xs text-slate-500">Rates are pulled from the saved resource rates list.</p>
            </div>
          </div>
          {hasRateEditableResources ? (
            <div className="space-y-4">
              {groupedResources.map((group: ResourceGroup) =>
                group.items.length > 0 ? (
                  <div key={group.type} className="rounded-2xl overflow-hidden border border-black/5">
                    <div className={`px-4 py-3 ${group.colorClass} ${group.textClass} font-semibold`}>{group.label}</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[640px]">
                        <thead>
                          <tr className="bg-[#F5F5F0]/50 border-b border-black/5">
                            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest">Resource</th>
                            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest">Type</th>
                            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest">Unit</th>
                            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-right">Rate</th>
                            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-right">VAT</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                          {group.items.map((resource: ResourceSummary) => (
                            <tr key={`${resource.type}-${resource.name}`} className="hover:bg-black/5 transition-colors bg-white">
                              <td className="px-3 py-2 text-sm font-medium text-slate-800">{resource.name}</td>
                              <td className="px-3 py-2 text-sm text-slate-600">{resource.type}</td>
                              <td className="px-3 py-2 text-sm text-slate-600">{resource.unit || '-'}</td>
                              <td className="px-3 py-2 text-sm text-right">
                                <input
                                  type="number"
                                  value={resource.rate}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const newRate = parseFloat(e.target.value);
                                    if (!Number.isNaN(newRate)) {
                                      updateCustomRate(resource.name, newRate, resource.unit || '');
                                    }
                                  }}
                                  className="w-24 p-1 border border-black/10 rounded-lg text-sm text-right"
                                  step="0.01"
                                  min="0"
                                />
                              </td>
                              <td className="px-3 py-2 text-sm text-right">{resource.apply_vat ? 'Yes' : 'No'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-500">No labour or equipment resources detected for the current BOQ items.</div>
          )}
        </div>

        {/* Materials Table */}
        {transportMaterials.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px] bg-white rounded-lg overflow-hidden border border-black/5">
              <thead>
                <tr className="bg-[#1E293B] text-white">
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest">Material Name</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest">Unit</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest">Unit Weight (kg)</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest">Load Category</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-right">Original Cost</th>
                  {project.mode === 'USERS' && (
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-right">VAT</th>
                  )}
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-right">Metalled Cost</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-right">Gravelled Cost</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-right">Porter Cost</th>
                  <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {transportMaterials.map((material, idx) => (
                  <tr key={`${material.material_name}-${idx}`} className="hover:bg-black/5 transition-colors">
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        value={material.material_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTransportMaterialByIndex(idx, 'material_name', e.target.value)}
                        className="w-full p-2 border border-black/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Material name"
                      />
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-600 flex items-center">
                      {getMaterialUnit(material.material_name)}
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        value={material.unit_weight ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const value = e.target.value;
                          const newWeight = value === '' ? 0 : parseFloat(value);
                          handleUnitWeightChange(idx, Number.isNaN(newWeight) ? 0 : newWeight);
                        }}
                        className="w-20 p-1 border border-black/10 rounded-lg text-sm text-right"
                        step="0.1"
                        min="0"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={material.load_category}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleLoadCategoryChange(idx, e.target.value as LoadCategoryName)}
                        className="w-full p-2 border border-black/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        {LOAD_CATEGORY_OPTIONS.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        value={material.original_cost ?? 0}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const value = e.target.value;
                          const newCost = value === '' ? 0 : parseFloat(value);
                          if (!Number.isNaN(newCost)) {
                            updateTransportMaterialByIndex(idx, 'original_cost', newCost);
                            if (project.mode === 'USERS') {
                              const newVat = material.vat > 0 ? parseFloat((newCost * 0.13).toFixed(2)) : 0;
                              updateTransportMaterialByIndex(idx, 'vat', newVat);
                            }
                          }
                        }}
                        className="w-24 p-1 border border-black/10 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-200"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    {project.mode === 'USERS' && (
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          value={material.vat ?? 0}
                          readOnly
                          className="w-24 p-1 border border-black/10 rounded-lg bg-slate-100 text-sm text-right text-black/80"
                        />
                      </td>
                    )}
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
                      {(
                        (material.total_cost_per_unit || 0) +
                        (material.original_cost || 0) +
                        (project.mode === 'USERS' ? (material.vat || 0) : 0)
                      ).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#F5F5F0] border-t border-black/10 font-bold">
                  <td colSpan={project.mode === 'USERS' ? 9 : 8} className="px-3 py-3 text-sm uppercase tracking-widest text-right">Total Cost</td>
                  <td className="px-3 py-3 text-lg font-bold text-emerald-600 text-right">
                    {transportMaterials.reduce((acc, m) => acc + (m.total_cost_per_unit || 0) + (m.original_cost || 0) + (project.mode === 'USERS' ? (m.vat || 0) : 0), 0).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-black/20 bg-[#F8FAFC] rounded-lg border border-dashed border-black/10">
            <p className="text-sm">No materials to display. Add BOQ items to sync transport materials.</p>
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePorterDistanceChange(parseFloat(e.target.value) || 0)}
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleGravelledDistanceChange(parseFloat(e.target.value) || 0)}
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleMetalledDistanceChange(parseFloat(e.target.value) || 0)}
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