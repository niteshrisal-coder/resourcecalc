import React from 'react';
import ProjectBOQComponent from './ProjectBOQ/ProjectBOQ';
import { Project } from '../types/boq';
import { Norm } from '../types';

interface ProjectBOQProps {
  project: Project;
  norms: Norm[];
  onBack: () => void;
}

export default function ProjectBOQ(props: ProjectBOQProps) {
  return <ProjectBOQComponent {...props} />;
}

type TransportMode = 'Porter' | 'Tractor' | 'Truck';

interface TransportMaterial {
  material_name: string;
  unit_weight: number;
  load_category: LoadCategoryName;
  metalled_cost_per_unit: number;
  gravelled_cost_per_unit: number;
  porter_cost_per_unit: number;
  total_cost_per_unit: number;
}

type TransportCoefficients = {
  [mode in TransportMode]: Record<LoadCategoryName, { metalled: number; gravelled: number }>;
};

const LOAD_CATEGORY_OPTIONS = ['Easy', 'Difficult', 'Very Difficult', 'High Volume'] as const;

type LoadCategoryName = (typeof LOAD_CATEGORY_OPTIONS)[number];

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

export default function ProjectBOQ({ projectId, onBack }: { projectId: number; onBack: () => void }) {
  const [project, setProject] = useState<Project | null>(null);
  const [norms, setNorms] = useState<Norm[]>([]);
  const [globalRates, setGlobalRates] = useState<Rate[]>([]);
  const [activeTab, setActiveTab] = useState<'boq' | 'breakdown' | 'analysis' | 'materials'>('boq');
  const [isAdding, setIsAdding] = useState(true);
  const [sharedMode, setSharedMode] = useState<'estimate' | 'measurement'>('estimate');
  const [breakdownSubView, setBreakdownSubView] = useState<'summary' | 'detailed' | 'tabulation'>('summary');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ quantity: 0 });
  const [editingMeasurementId, setEditingMeasurementId] = useState<string | null>(null);
  const [editMeasurementForm, setEditMeasurementForm] = useState({ quantity: 0 });
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [editRateForm, setEditRateForm] = useState({ rate: 0 });
  const [editingBillRate, setEditingBillRate] = useState<string | null>(null);
  const [editBillRateForm, setEditBillRateForm] = useState({ qty: 0, rate: 0 });
  const [transportMode, setTransportMode] = useState<'Tractor' | 'Truck'>('Tractor');
  const [transportMaterials, setTransportMaterials] = useState<TransportMaterial[]>([]);
  const [transportCoefficients, setTransportCoefficients] = useState<TransportCoefficients>(DEFAULT_TRANSPORT_COEFFICIENTS);
  const [editingUnitWeight, setEditingUnitWeight] = useState<string | null>(null);
  const [tempUnitWeight, setTempUnitWeight] = useState(0);
  const [porterDistance, setPorterDistance] = useState(0);
  const [gravelledDistance, setGravelledDistance] = useState(0);
  const [metalledDistance, setMetalledDistance] = useState(0);
  const { isMobile } = useDeviceType();

  // Safe helper functions
  const safeItems = (items: any): BOQItem[] => Array.isArray(items) ? items : [];
  const safeResources = (resources: any): any[] => {
    if (!Array.isArray(resources)) return [];
    return resources.filter(res => 
      res && 
      typeof res === 'object' && 
      typeof res.name === 'string' && 
      res.name.trim() !== '' &&
      typeof res.quantity === 'number' &&
      !isNaN(res.quantity)
    );
  };

  const formatNumber = (value: number): number => Number.isFinite(value) ? value : 0;

  const computeTransportCosts = (unitWeight: number, loadCategory: LoadCategoryName, mode: 'Tractor' | 'Truck', gravelledDist: number, metalledDist: number) => {
    const rates = transportCoefficients[mode][loadCategory];
    const porterRate = transportCoefficients.Porter[loadCategory].gravelled;
    const porterDistanceKosh = porterDistance / 3.218;
    
    // For Tractor, use km directly; for Truck, convert km to kosh
    const gravelledDistForCalculation = mode === 'Truck' ? gravelledDist / 3.218 : gravelledDist;
    const metalledDistForCalculation = mode === 'Truck' ? metalledDist / 3.218 : metalledDist;
    
    const metalled_cost_per_unit = metalledDistForCalculation * unitWeight * rates.metalled;
    const gravelled_cost_per_unit = gravelledDistForCalculation * unitWeight * rates.gravelled;
    const porter_cost_per_unit = unitWeight * porterDistanceKosh * porterRate;
    const total_cost_per_unit = metalled_cost_per_unit + gravelled_cost_per_unit + porter_cost_per_unit;
    return { metalled_cost_per_unit, gravelled_cost_per_unit, porter_cost_per_unit, total_cost_per_unit };
  };

  useEffect(() => {
    setTransportMaterials((prev) =>
      prev.map((item) => ({
        ...item,
        ...computeTransportCosts(item.unit_weight, item.load_category, transportMode, gravelledDistance, metalledDistance)
      }))
    );
  }, [transportMode, transportCoefficients, porterDistance, gravelledDistance, metalledDistance]);

  const updateUnitWeight = (material_name: string, unit_weight: number) => {
    setTransportMaterials((prev) =>
      prev.map((item) =>
        item.material_name === material_name
          ? { ...item, unit_weight, ...computeTransportCosts(unit_weight, item.load_category, transportMode, gravelledDistance, metalledDistance) }
          : item
      )
    );
  };

  const updateLoadCategory = (material_name: string, load_category: LoadCategoryName) => {
    setTransportMaterials((prev) =>
      prev.map((item) =>
        item.material_name === material_name
          ? { ...item, load_category, ...computeTransportCosts(item.unit_weight, load_category, transportMode, gravelledDistance, metalledDistance) }
          : item
      )
    );
  };

  const updateTransportCoefficient = (mode: TransportMode, category: LoadCategoryName, roadType: 'metalled' | 'gravelled', value: number) => {
    setTransportCoefficients((prev) => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [category]: {
          ...prev[mode][category],
          [roadType]: value
        }
      }
    }));
  };

  const saveTransportSettings = () => {
    if (!project) return;
    const updated = { ...project, transportMode, transportMaterials, transportCoefficients };
    updateProject(updated);
  };

  // Auto-save transport settings whenever they change
  useEffect(() => {
    if (!project) return;
    saveTransportSettings();
  }, [transportMode, transportMaterials, transportCoefficients]);

  useEffect(() => {
    const stored = localStorage.getItem('resourcecalc_projects');
    const projects: Project[] = stored ? JSON.parse(stored) : [];
    const foundProject = projects.find((p: Project) => p.id === projectId);
    
    if (foundProject) {
      setProject(foundProject);
      setIsAdding(!(foundProject.boqSaved ?? false));
    }

    setNorms(getNorms());
    setGlobalRates(getRates());
  }, [projectId]);

  const updateProject = (updatedProject: Project) => {
    const stored = localStorage.getItem('resourcecalc_projects');
    const projects: Project[] = stored ? JSON.parse(stored) : [];
    const index = projects.findIndex((p: Project) => p.id === projectId);
    
    if (index >= 0) {
      projects[index] = updatedProject;
    }
    
    localStorage.setItem('resourcecalc_projects', JSON.stringify(projects));
    setProject(updatedProject);
  };

  const handleSaveBOQ = () => {
    if (!project) return;
    const updated = { ...project, boqSaved: true };
    updateProject(updated);
    setIsAdding(false);
    setSearchTerm('');
    setEditingItemId(null);
  };

  const getResourceRate = (resourceName: string): { rate: number; unit: string; apply_vat: boolean } => {
    if (!project) return { rate: 0, unit: '', apply_vat: false };
    
    const customRate = project.customRates?.find((r: CustomRate) => r.resourceName === resourceName);
    if (customRate) {
      return { rate: customRate.rate, unit: customRate.unit, apply_vat: false };
    }
    
    const globalRate = globalRates.find((r: Rate) => r.name.toLowerCase() === resourceName.toLowerCase());
    return { 
      rate: globalRate?.rate || 1000, 
      unit: globalRate?.unit || '-', 
      apply_vat: globalRate?.apply_vat || false 
    };
  };

  const updateCustomRate = (resourceName: string, newRate: number, unit: string) => {
    if (!project) return;
    
    const existingCustomRates = project.customRates || [];
    const existingIndex = existingCustomRates.findIndex((r: CustomRate) => r.resourceName === resourceName);
    
    let updatedRates: CustomRate[];
    if (existingIndex >= 0) {
      updatedRates = [...existingCustomRates];
      updatedRates[existingIndex] = { ...updatedRates[existingIndex], rate: newRate, unit };
    } else {
      updatedRates = [...existingCustomRates, { resourceName, rate: newRate, unit }];
    }
    
    const updated = { ...project, customRates: updatedRates };
    updateProject(updated);
  };

  const getCustomResourceQuantity = (normId: number, resourceName: string): number | null => {
    if (!project || !project.customResources) return null;
    const custom = project.customResources.find((r: CustomResource) => r.normId === normId && r.resourceName === resourceName);
    return custom ? custom.quantity : null;
  };

  const updateCustomResourceQuantity = (normId: number, resourceName: string, newQuantity: number, unit: string, resource_type: string) => {
    if (!project) return;
    
    const existingCustom = project.customResources || [];
    const existingIndex = existingCustom.findIndex((r: CustomResource) => r.normId === normId && r.resourceName === resourceName);
    
    let updatedResources: CustomResource[];
    if (existingIndex >= 0) {
      updatedResources = [...existingCustom];
      updatedResources[existingIndex] = { ...updatedResources[existingIndex], quantity: newQuantity };
    } else {
      updatedResources = [...existingCustom, { normId, resourceName, quantity: newQuantity, unit, resource_type }];
    }
    
    const updated = { ...project, customResources: updatedResources };
    updateProject(updated);
  };

  const addItem = (norm: Norm) => {
    if (!project) return;

    const newItem: BOQItem = {
      id: Date.now().toString(),
      normId: norm.id,
      estimate_quantity: 1,
      measurement_quantity: 0,
    };

    const updated = {
      ...project,
      items: [...safeItems(project.items), newItem]
    };

    updateProject(updated);
  };

  const removeItem = (itemId: string) => {
    if (!project || !window.confirm('Delete this item?')) return;

    const updated = {
      ...project,
      items: safeItems(project.items).filter((i: BOQItem) => i.id !== itemId)
    };

    updateProject(updated);
    if (editingItemId === itemId) {
      setEditingItemId(null);
    }
  };

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (!project) return;

    const updated = {
      ...project,
      items: safeItems(project.items).map((item: BOQItem) =>
        item.id === itemId
          ? { ...item, estimate_quantity: newQuantity > 0 ? newQuantity : 0 }
          : item
      )
    };

    updateProject(updated);
  };

  const updateMeasurementQuantity = (itemId: string, newQuantity: number) => {
    if (!project) return;

    const updated = {
      ...project,
      items: safeItems(project.items).map((item: BOQItem) =>
        item.id === itemId
          ? { ...item, measurement_quantity: newQuantity >= 0 ? newQuantity : 0 }
          : item
      )
    };

    updateProject(updated);
  };

  const calculateMeasurementTotal = (): number => {
    if (!project) return 0;
    return safeItems(project.items).reduce((total: number, item: BOQItem) => {
      const rate = calculateItemRate(item.normId);
      return total + (rate * item.measurement_quantity);
    }, 0);
  };

  const calculateItemRate = (normId: number): number => {
    const norm = norms.find((n: Norm) => n.id === normId);
    if (!norm || !project) return 0;

    let total = 0;
    safeResources(norm.resources).forEach((res: any) => {
      if (!res.is_percentage) {
        const customQty = getCustomResourceQuantity(normId, res.name);
        const quantity = customQty !== null ? customQty : res.quantity;
        const rateInfo = getResourceRate(res.name);
        let rate = rateInfo.rate;
        
        if (project.mode === 'USERS' && rateInfo.apply_vat) {
          rate = rate * 1.13;
        }
        
        total += quantity * rate;
      }
    });

    const basis = norm.basis_quantity || 1;
    let unitRate = total / basis;

    if (project.mode === 'CONTRACTOR') {
      unitRate = unitRate * 1.15;
    }
    
    return isNaN(unitRate) || !isFinite(unitRate) ? 0 : unitRate;
  };

  const calculateTotalBOQ = (): number => {
    if (!project) return 0;
    
    return safeItems(project.items).reduce((total: number, item: BOQItem) => {
      const rate = calculateItemRate(item.normId);
      return total + (rate * item.estimate_quantity);
    }, 0);
  };

  const calculateMeasurementBOQ = (): number => {
    if (!project) return 0;

    return safeItems(project.items).reduce((total: number, item: BOQItem) => {
      const rate = calculateItemRate(item.normId);
      return total + (rate * item.measurement_quantity);
    }, 0);
  };

  const calculateCurrentBOQTotal = (): number => {
    return sharedMode === 'estimate' ? calculateTotalBOQ() : calculateMeasurementBOQ();
  };

  const resourceBreakdownEstimate = React.useMemo((): ResourceBreakdownItem[] => {
    if (!project) return [];

    const breakdown: Record<string, ResourceBreakdownItem> = {};

    safeItems(project.items).forEach((item: BOQItem) => {
      const norm = norms.find((n: Norm) => n.id === item.normId);
      if (!norm) return;

      const basis = norm.basis_quantity || 1;

      safeResources(norm.resources).forEach((res: any) => {
        if (!res.is_percentage) {
          const key = `${res.resource_type}-${res.name}`;
          const rateInfo = getResourceRate(res.name);
          const customQty = getCustomResourceQuantity(item.normId, res.name);
          const quantity = customQty !== null ? customQty : res.quantity;

          if (!breakdown[key]) {
            breakdown[key] = {
              name: res.name,
              type: res.resource_type,
              unit: res.unit || rateInfo.unit || '-',
              quantity: 0,
              rate: rateInfo.rate,
              apply_vat: rateInfo.apply_vat,
              totalAmount: 0,
              normId: item.normId,
              originalQuantity: res.quantity,
              isCustomized: customQty !== null
            };
          }

          breakdown[key].quantity += (quantity / basis) * item.estimate_quantity;
        }
      });
    });

    Object.values(breakdown).forEach((item: ResourceBreakdownItem) => {
      let rate = item.rate;
      if (project.mode === 'USERS' && item.apply_vat) {
        rate = rate * 1.13;
      }
      item.totalAmount = item.quantity * rate;
    });

    return Object.values(breakdown);
  }, [project, norms, globalRates, project?.customRates, project?.customResources]);

  const resourceBreakdownMeasurement = React.useMemo((): ResourceBreakdownItem[] => {
    if (!project) return [];

    const breakdown: Record<string, ResourceBreakdownItem> = {};

    safeItems(project.items).forEach((item: BOQItem) => {
      const norm = norms.find((n: Norm) => n.id === item.normId);
      if (!norm) return;

      const basis = norm.basis_quantity || 1;

      safeResources(norm.resources).forEach((res: any) => {
        if (!res.is_percentage) {
          const key = `${res.resource_type}-${res.name}`;
          const rateInfo = getResourceRate(res.name);
          const customQty = getCustomResourceQuantity(item.normId, res.name);
          const quantity = customQty !== null ? customQty : res.quantity;

          if (!breakdown[key]) {
            breakdown[key] = {
              name: res.name,
              type: res.resource_type,
              unit: res.unit || rateInfo.unit || '-',
              quantity: 0,
              rate: rateInfo.rate,
              apply_vat: rateInfo.apply_vat,
              totalAmount: 0,
              normId: item.normId,
              originalQuantity: res.quantity,
              isCustomized: customQty !== null
            };
          }

          breakdown[key].quantity += (quantity / basis) * item.measurement_quantity;
        }
      });
    });

    Object.values(breakdown).forEach((item: ResourceBreakdownItem) => {
      let rate = item.rate;
      if (project.mode === 'USERS' && item.apply_vat) {
        rate = rate * 1.13;
      }
      item.totalAmount = item.quantity * rate;
    });

    return Object.values(breakdown);
  }, [project, norms, globalRates, project?.customRates, project?.customResources]);

  useEffect(() => {
    if (!project) return;

    const savedMaterials = project.transportMaterials ?? [];
    const currentMaterials = (sharedMode === 'estimate' ? resourceBreakdownEstimate : resourceBreakdownMeasurement)
      .filter((item: ResourceBreakdownItem) => item.type === 'Material')
      .map((item: ResourceBreakdownItem) => {
        const saved = savedMaterials.find((m: TransportMaterial) => m.material_name === item.name);
        const load_category = saved?.load_category ?? 'Easy';
        const unit_weight = saved?.unit_weight ?? 0;
        return {
          material_name: item.name,
          unit_weight,
          load_category,
          ...computeTransportCosts(unit_weight, load_category, project.transportMode ?? transportMode, gravelledDistance, metalledDistance)
        };
      });

    setTransportMode(project.transportMode ?? transportMode);
    setTransportCoefficients(project.transportCoefficients ?? DEFAULT_TRANSPORT_COEFFICIENTS);
    setTransportMaterials(currentMaterials);
  }, [project, sharedMode, resourceBreakdownEstimate, resourceBreakdownMeasurement]);

  // Rate Analysis data (per work item, based on norm basis quantity)
  const rateAnalysisData = React.useMemo((): RateAnalysisItem[] => {
    if (!project || !norms.length) return [];

    const result: RateAnalysisItem[] = [];

    safeItems(project.items).forEach((item: BOQItem) => {
      const norm = norms.find((n: Norm) => n.id === item.normId);
      if (!norm) return;

      const basis = norm.basis_quantity || 1;
      let labourTotal = 0;
      let materialTotal = 0;
      let equipmentTotal = 0;

      const resources: RateAnalysisResource[] = safeResources(norm.resources)
        .filter((res: any) => !res.is_percentage)
        .map((res: any) => {
          const customQty = getCustomResourceQuantity(item.normId, res.name);
          const quantity = customQty !== null ? customQty : res.quantity;
          const rateInfo = getResourceRate(res.name);
          let rate = rateInfo.rate;
          
          if (project.mode === 'USERS' && rateInfo.apply_vat) {
            rate = rate * 1.13;
          }
          
          const amount = quantity * rate;

          if (res.resource_type === 'Labour') labourTotal += amount;
          else if (res.resource_type === 'Material') materialTotal += amount;
          else if (res.resource_type === 'Equipment') equipmentTotal += amount;

          return {
            resourceName: res.name,
            resourceType: res.resource_type,
            unit: res.unit || rateInfo.unit,
            quantity: quantity,
            rate: rate,
            amount: amount,
            isCustomizedRate: project.customRates?.some((cr: CustomRate) => cr.resourceName === res.name) || false,
            isCustomizedQuantity: customQty !== null
          };
        });

      const subtotal = labourTotal + materialTotal + equipmentTotal;
      let unitRate = subtotal;
      
      if (project.mode === 'CONTRACTOR') {
        unitRate = subtotal * 1.15;
      }

      result.push({
        itemId: item.id,
        normId: item.normId,
        normDescription: norm.description,
        refSs: norm.ref_ss || '',
        sNo: norm.sNo || '',
        unit: norm.unit || '-',
        basisQuantity: basis,
        userQuantity: item.estimate_quantity,
        labourTotal,
        materialTotal,
        equipmentTotal,
        subtotal,
        unitRate,
        resources
      });
    });

    return result;
  }, [project, norms, globalRates, project?.customRates, project?.customResources]);

  // Resource Breakdown - Matrix format for Detailed View
  const resourceMatrixData = React.useMemo((): MatrixData => {
    if (!project || !norms.length) return { rows: [], columns: [], totals: {} };

    const allResources = new Map<string, { unit: string, type: string }>();
    const rows: MatrixRow[] = [];

    safeItems(project.items).forEach((item: BOQItem, idx: number) => {
      const norm = norms.find((n: Norm) => n.id === item.normId);
      if (!norm) return;
      const userQuantity = item.estimate_quantity;
      const basis = norm.basis_quantity || 1;

      const row: MatrixRow = {
        sNo: idx + 1,
        workItem: `${norm.ref_ss || ''} ${norm.sNo || ''} - ${norm.description}`.trim(),
        unit: norm.unit || '-',
        quantity: userQuantity,
        resources: {}
      };

      safeResources(norm.resources).forEach((res: any) => {
        if (!res.is_percentage) {
          const customQty = getCustomResourceQuantity(item.normId, res.name);
          const resourceQty = customQty !== null ? customQty : res.quantity;
          const quantity = (resourceQty * userQuantity) / basis;
          row.resources[res.name] = quantity;
          allResources.set(res.name, { unit: res.unit || '-', type: res.resource_type });
        }
      });

      rows.push(row);
    });

    const columns = Array.from(allResources.keys()).sort((a, b) => {
      const typeOrder = { Labour: 1, Material: 2, Equipment: 3 };
      return (typeOrder[allResources.get(a)?.type as keyof typeof typeOrder] || 99) - (typeOrder[allResources.get(b)?.type as keyof typeof typeOrder] || 99) || a.localeCompare(b);
    });
    const totals: Record<string, number> = {};
    columns.forEach((col: string) => { totals[col] = 0; });

    rows.forEach((row: MatrixRow) => {
      columns.forEach((col: string) => {
        if (row.resources[col]) {
          totals[col] += row.resources[col];
        }
      });
    });

    return { rows, columns, totals };
  }, [project, norms, project?.customResources]);

  // Resource Matrix - Measurement quantities
  const resourceMatrixMeasurementData = React.useMemo((): MatrixData => {
    if (!project || !norms.length) return { rows: [], columns: [], totals: {} };

    const allResources = new Map<string, { unit: string, type: string }>();
    const rows: MatrixRow[] = [];

    safeItems(project.items).forEach((item: BOQItem, idx: number) => {
      const norm = norms.find((n: Norm) => n.id === item.normId);
      if (!norm) return;
      const userQuantity = item.measurement_quantity;
      const basis = norm.basis_quantity || 1;

      const row: MatrixRow = {
        sNo: idx + 1,
        workItem: `${norm.ref_ss || ''} ${norm.sNo || ''} - ${norm.description}`.trim(),
        unit: norm.unit || '-',
        quantity: userQuantity,
        resources: {}
      };

      safeResources(norm.resources).forEach((res: any) => {
        if (!res.is_percentage) {
          const customQty = getCustomResourceQuantity(item.normId, res.name);
          const resourceQty = customQty !== null ? customQty : res.quantity;
          const quantity = (resourceQty * userQuantity) / basis;
          row.resources[res.name] = quantity;
          allResources.set(res.name, { unit: res.unit || '-', type: res.resource_type });
        }
      });

      rows.push(row);
    });

    const columns = Array.from(allResources.keys()).sort((a, b) => {
      const typeOrder = { Labour: 1, Material: 2, Equipment: 3 };
      return (typeOrder[allResources.get(a)?.type as keyof typeof typeOrder] || 99) - (typeOrder[allResources.get(b)?.type as keyof typeof typeOrder] || 99) || a.localeCompare(b);
    });
    const totals: Record<string, number> = {};
    columns.forEach((col: string) => { totals[col] = 0; });

    rows.forEach((row: MatrixRow) => {
      columns.forEach((col: string) => {
        if (row.resources[col]) {
          totals[col] += row.resources[col];
        }
      });
    });

    return { rows, columns, totals };
  }, [project, norms, project?.customResources]);

  // Tabulation Data - Updated with actual quantity and rate using min logic
  const tabulationData = React.useMemo((): TabulationRow[] => {
    const matrix = sharedMode === 'estimate' ? resourceMatrixData : resourceMatrixMeasurementData;
    if (!matrix.rows.length) return [];

    const resourceMap = new Map<string, {
      unit: string,
      measurementQty: number,
      measurementRate: number,
      applyVat: boolean,
      billRate: number,
      billQty: number,
      remarks: string
    }>();

    matrix.rows.forEach((row: MatrixRow) => {
      matrix.columns.forEach((resourceName: string) => {
        const quantity = row.resources[resourceName];
        if (quantity === undefined) return;
        const rateInfo = getResourceRate(resourceName);
        const savedData = project?.tabulationData?.find((d: TabulationData) => d.resourceName === resourceName);
        const existing = resourceMap.get(resourceName);
        const addQty = quantity;

        if (existing) {
          existing.measurementQty += addQty;
        } else {
          resourceMap.set(resourceName, {
            unit: rateInfo.unit || '-',
            measurementQty: addQty,
            measurementRate: rateInfo.rate,
            applyVat: rateInfo.apply_vat,
            billRate: savedData?.billRate || 0,
            billQty: addQty,
            remarks: savedData?.remarks || ''
          });
        }
      });
    });

    return Array.from(resourceMap.entries()).map(([name, data], idx: number) => {
      // Calculate Actual values using min logic
      const actualQty = Math.min(data.measurementQty, data.billQty);
      const actualRate = Math.min(data.measurementRate, data.billRate);
      const actualAmount = actualQty * actualRate;
      const actualVat = data.applyVat ? actualAmount * 0.13 : 0;
      
      const measurementAmount = data.measurementQty * data.measurementRate;
      const measurementVat = data.applyVat ? measurementAmount * 0.13 : 0;
      
      const billAmount = data.billQty * data.billRate;
      const billVat = data.applyVat ? billAmount * 0.13 : 0;

      return {
        sn: idx + 1,
        resourceName: name,
        unit: data.unit,
        measurementQty: data.measurementQty,
        measurementRate: data.measurementRate,
        measurementAmount,
        measurementVat,
        billQty: data.billQty,
        billRate: data.billRate,
        billAmount,
        billVat,
        actualQty,
        actualRate,
        actualAmount,
        actualVat,
        remarks: data.remarks
      };
    });
  }, [sharedMode, resourceMatrixData, resourceMatrixMeasurementData, project?.tabulationData, getResourceRate]);

  const updateTabulationBillRate = (resourceName: string, newRate: number) => {
    if (!project) return;
    
    const existingTabData = project.tabulationData || [];
    const existingIndex = existingTabData.findIndex((d: TabulationData) => d.resourceName === resourceName);
    
    let updatedData: TabulationData[];
    if (existingIndex >= 0) {
      updatedData = [...existingTabData];
      updatedData[existingIndex] = { ...updatedData[existingIndex], billRate: newRate };
    } else {
      updatedData = [...existingTabData, { resourceName, billRate: newRate, billQty: 0, remarks: '' }];
    }
    
    const updated = { ...project, tabulationData: updatedData };
    updateProject(updated);
  };

  const updateTabulationBillQty = (resourceName: string, newQty: number) => {
    if (!project) return;
    
    const existingTabData = project.tabulationData || [];
    const existingIndex = existingTabData.findIndex((d: TabulationData) => d.resourceName === resourceName);
    
    let updatedData: TabulationData[];
    if (existingIndex >= 0) {
      updatedData = [...existingTabData];
      updatedData[existingIndex] = { ...updatedData[existingIndex], billQty: newQty };
    } else {
      updatedData = [...existingTabData, { resourceName, billQty: newQty, billRate: 0, remarks: '' }];
    }
    
    const updated = { ...project, tabulationData: updatedData };
    updateProject(updated);
  };

  const updateTabulationRemarks = (resourceName: string, remarks: string) => {
    if (!project) return;
    
    const existingTabData = project.tabulationData || [];
    const existingIndex = existingTabData.findIndex((d: TabulationData) => d.resourceName === resourceName);
    
    let updatedData: TabulationData[];
    if (existingIndex >= 0) {
      updatedData = [...existingTabData];
      updatedData[existingIndex] = { ...updatedData[existingIndex], remarks };
    } else {
      updatedData = [...existingTabData, { resourceName, billRate: 0, billQty: 0, remarks }];
    }
    
    const updated = { ...project, tabulationData: updatedData };
    updateProject(updated);
  };

const filteredNorms = norms.filter((norm: Norm) =>
  (norm.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
  (norm.type?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
  (norm.ref_ss?.toLowerCase() || '').includes(searchTerm.toLowerCase())
);
  const exportToExcel = () => {
    if (!project) return;

    const wb = XLSX.utils.book_new();

    if (activeTab === 'boq') {
      // BOQ Export with styling
      const ws: XLSX.WorkSheet = {};
      ws['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
      
      let currentRow = 0;
      
      // Header styling
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1E293B' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
      
      const cellStyle = {
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
      
      const cellStyleRight = {
        alignment: { horizontal: 'right', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
      
      // Headers
      const headers = ['S.N.', 'Work Item (Description)', 'Unit', 'Quantity', 'Rate (Rs.)', 'Amount (Rs.)', 'Ref to SS'];
      headers.forEach((header, colIndex) => {
        const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
        ws[cell] = {
          v: header,
          t: 's',
          s: headerStyle
        };
      });
      currentRow++;
      
      // Data rows
      safeItems(project.items).forEach((item: BOQItem, idx: number) => {
        const norm = norms.find((n: Norm) => n.id === item.normId);
        const rate = calculateItemRate(item.normId);
        const total = rate * item.estimate_quantity;
        
        const rowData = [
          idx + 1,
          norm?.description || '',
          norm?.unit || '',
          item.estimate_quantity,
          parseFloat((isNaN(rate) || !isFinite(rate) ? 0 : rate).toFixed(2)),
          parseFloat((isNaN(total) || !isFinite(total) ? 0 : total).toFixed(2)),
          norm?.ref_ss || ''
        ];
        
        rowData.forEach((value, colIndex) => {
          const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
          const isNumeric = colIndex > 2;
          ws[cell] = {
            v: value,
            t: typeof value === 'number' ? 'n' : 's',
            s: {
              ...cellStyle,
              alignment: {
                ...cellStyle.alignment,
                horizontal: isNumeric ? 'right' : 'left',
                wrapText: colIndex === 1
              }
            }
          };
        });
        currentRow++;
      });
      
      // Total row styling
      const totalStyle = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'F1F5F9' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
      
      // Total BOQ row
      const totalData = ['', 'Total Amount:', '', '', '', parseFloat(calculateTotalBOQ().toFixed(2)), ''];
      totalData.forEach((value, colIndex) => {
        const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
        ws[cell] = {
          v: value,
          t: typeof value === 'number' ? 'n' : 's',
          s: totalStyle
        };
      });
      
      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: currentRow, c: 6 } });
      XLSX.utils.book_append_sheet(wb, ws, 'BOQ_Items');
    } 
    else if (activeTab === 'breakdown') {
      if (breakdownSubView === 'summary') {
        // Summary Export - Without Customized column
        const data = (sharedMode === 'estimate' ? resourceBreakdownEstimate : resourceBreakdownMeasurement)
          .map((item: ResourceBreakdownItem) => ({
            ...item,
            totalAmount: item.quantity * (project.mode === 'USERS' && item.apply_vat ? item.rate * 1.13 : item.rate)
          }));
        
        const ws: XLSX.WorkSheet = {};
        ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        
        let currentRow = 0;
        
        const headerStyle = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1E293B' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
        
        const cellStyle = {
          alignment: { horizontal: 'left', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
        
        const cellStyleRight = {
          alignment: { horizontal: 'right', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
        
        // Headers
        const headers = ['Type', 'Resource Name', 'Unit', 'Total Quantity', 'Rate (Rs.)', 'Total Amount (Rs.)'];
        headers.forEach((header, colIndex) => {
          const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
          ws[cell] = {
            v: header,
            t: 's',
            s: headerStyle
          };
        });
        currentRow++;
        
        // Data rows
        data.forEach((res: ResourceBreakdownItem) => {
          const rowData = [
            res.type,
            res.name,
            res.unit,
            parseFloat(res.quantity.toFixed(3)),
            parseFloat(res.rate.toFixed(2)),
            parseFloat(res.totalAmount.toFixed(2))
          ];
          
          rowData.forEach((value, colIndex) => {
            const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
            const isNumeric = colIndex > 1;
            ws[cell] = {
              v: value,
              t: typeof value === 'number' ? 'n' : 's',
              s: {
                ...cellStyle,
                alignment: { ...cellStyle.alignment, horizontal: isNumeric ? 'right' : 'left' }
              }
            };
          });
          currentRow++;
        });
        
        // Empty row
        currentRow++;
        
        // Total row
        const totalStyle = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'F1F5F9' } },
          alignment: { horizontal: 'right', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
        
        const totalData = ['Total:', '', '', '', '', parseFloat(data.reduce((acc: number, r: ResourceBreakdownItem) => acc + r.totalAmount, 0).toFixed(2))];
        totalData.forEach((value, colIndex) => {
          const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
          ws[cell] = {
            v: value,
            t: typeof value === 'number' ? 'n' : 's',
            s: totalStyle
          };
        });
        
        ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: currentRow, c: 5 } });
        XLSX.utils.book_append_sheet(wb, ws, 'Resource_Summary');
      } 
      else if (breakdownSubView === 'detailed') {
        // Detailed Matrix Export with styling
        const matrix = sharedMode === 'estimate' ? resourceMatrixData : resourceMatrixMeasurementData;
        const ws: XLSX.WorkSheet = {};
        ws['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 10 }, { wch: 12 }, ...matrix.columns.map(() => ({ wch: 12 }))];
        
        let currentRow = 0;
        
        const headerStyle = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1E293B' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
        
        const cellStyle = {
          alignment: { horizontal: 'left', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
        
        const cellStyleRight = {
          alignment: { horizontal: 'right', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
        
        // Headers
        const headers = ['S.N.', 'Work Item', 'Unit', 'Qty', ...matrix.columns];
        headers.forEach((header, colIndex) => {
          const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
          ws[cell] = {
            v: header,
            t: 's',
            s: headerStyle
          };
        });
        currentRow++;
        
        // Data rows
        matrix.rows.forEach((row: MatrixRow) => {
          const rowData: any[] = [row.sNo, row.workItem, row.unit, row.quantity];
          matrix.columns.forEach((col: string) => {
            rowData.push(row.resources[col]?.toFixed(3) || '-');
          });
          
          rowData.forEach((value, colIndex) => {
            const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
            const isNumeric = colIndex > 2;
            ws[cell] = {
              v: value,
              t: typeof value === 'number' ? 'n' : 's',
              s: {
                ...cellStyle,
                alignment: { ...cellStyle.alignment, horizontal: isNumeric ? 'right' : 'left' }
              }
            };
          });
          currentRow++;
        });
        
        // Total row
        const totalStyle = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'F1F5F9' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
        
        const totalRow: any[] = ['', 'TOTAL', '', ''];
        matrix.columns.forEach((col: string) => {
          totalRow.push(matrix.totals[col]?.toFixed(3) || '-');
        });
        
        totalRow.forEach((value, colIndex) => {
          const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
          ws[cell] = {
            v: value,
            t: typeof value === 'number' ? 'n' : 's',
            s: totalStyle
          };
        });
        
        ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: currentRow, c: 3 + matrix.columns.length } });
        XLSX.utils.book_append_sheet(wb, ws, 'Resource_Detailed');
      } 
      else if (breakdownSubView === 'tabulation') {
        // Tabulation Export - Updated with new structure and styling
        const ws: XLSX.WorkSheet = {};
        ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 8 }, 
                       { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
                       { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
                       { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
                       { wch: 20 }];
        
        let currentRow = 0;
        
        const headerStyle = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1E293B' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
        
        const subHeaderStyle = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '334155' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
        
        const cellStyle = {
          alignment: { horizontal: 'left', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
        
        const cellStyleRight = {
          alignment: { horizontal: 'right', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
        
        // First header row
        const headers1 = ['SN', 'Materials & Labours', 'Unit', 
                         'As Per Measurement', '', '', '',
                         'As Per Bill', '', '', '',
                         'Actual Cost', '', '', '',
                         'Remarks'];
        
        headers1.forEach((header, colIndex) => {
          const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
          ws[cell] = {
            v: header,
            t: 's',
            s: headerStyle
          };
        });
        currentRow++;
        
        // Second header row
        const headers2 = ['', '', '',
                         'Quantity', 'Rate W/O VAT', 'Amount', 'VAT Amount',
                         'Quantity', 'Rate W/O VAT', 'Amount', 'VAT Amount',
                         'Quantity', 'Rate W/O VAT', 'Amount', 'VAT Amount',
                         ''];
        
        headers2.forEach((header, colIndex) => {
          const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
          ws[cell] = {
            v: header,
            t: 's',
            s: subHeaderStyle
          };
        });
        currentRow++;
        
        // Data rows
        tabulationData.forEach((item: TabulationRow) => {
          const rowData = [
            item.sn, item.resourceName, item.unit,
            parseFloat(item.measurementQty.toFixed(3)), parseFloat(item.measurementRate.toFixed(2)), parseFloat(item.measurementAmount.toFixed(2)), parseFloat(item.measurementVat.toFixed(2)),
            parseFloat(item.billQty.toFixed(3)), parseFloat(item.billRate.toFixed(2)), parseFloat(item.billAmount.toFixed(2)), parseFloat(item.billVat.toFixed(2)),
            parseFloat(item.actualQty.toFixed(3)), parseFloat(item.actualRate.toFixed(2)), parseFloat(item.actualAmount.toFixed(2)), parseFloat(item.actualVat.toFixed(2)),
            item.remarks
          ];
          
          rowData.forEach((value, colIndex) => {
            const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
            const isNumeric = colIndex > 2;
            ws[cell] = {
              v: value,
              t: typeof value === 'number' ? 'n' : 's',
              s: {
                ...cellStyle,
                alignment: { ...cellStyle.alignment, horizontal: isNumeric ? 'right' : 'left' }
              }
            };
          });
          currentRow++;
        });
        
        // Total row
        const totalMeasurementAmount = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.measurementAmount, 0);
        const totalMeasurementVat = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.measurementVat, 0);
        const totalBillAmount = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.billAmount, 0);
        const totalBillVat = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.billVat, 0);
        const totalActualAmount = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.actualAmount, 0);
        const totalActualVat = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.actualVat, 0);
        
        const totalStyle = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'F1F5F9' } },
          alignment: { horizontal: 'right', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
        
        const totalData = ['Total', '', '', 
          '', '', parseFloat(totalMeasurementAmount.toFixed(2)), parseFloat(totalMeasurementVat.toFixed(2)),
          '', '', parseFloat(totalBillAmount.toFixed(2)), parseFloat(totalBillVat.toFixed(2)),
          '', '', parseFloat(totalActualAmount.toFixed(2)), parseFloat(totalActualVat.toFixed(2)),
          ''];
        
        totalData.forEach((value, colIndex) => {
          const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
          ws[cell] = {
            v: value,
            t: typeof value === 'number' ? 'n' : 's',
            s: totalStyle
          };
        });
        
        // Merge header rows for main categories
        if (!ws['!merges']) ws['!merges'] = [];
        // Row 0 (first header) - merge cells for category headers
        ws['!merges'].push({ s: { r: 0, c: 3 }, e: { r: 0, c: 6 } });   // As Per Measurement
        ws['!merges'].push({ s: { r: 0, c: 7 }, e: { r: 0, c: 10 } });  // As Per Bill
        ws['!merges'].push({ s: { r: 0, c: 11 }, e: { r: 0, c: 14 } }); // Actual Cost
        
        ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: currentRow, c: 15 } });
        XLSX.utils.book_append_sheet(wb, ws, 'Tabulation_Chart');
      }
    } 
    else if (activeTab === 'analysis') {
      // RATE ANALYSIS EXPORT - Single Sheet for All Work Items
      const ws: XLSX.WorkSheet = {};
      
      // Set column widths
      ws['!cols'] = [
        { wch: 35 }, // Resource
        { wch: 12 }, // Type
        { wch: 10 }, // Unit
        { wch: 12 }, // Quantity
        { wch: 14 }, // Rate
        { wch: 16 }, // Amount
        { wch: 16 }  // Sub Total
      ];
      
      let currentRow = 0;
      
      rateAnalysisData.forEach((item: RateAnalysisItem, itemIndex: number) => {
        // Group resources by type
        const labourResources = item.resources.filter(r => r.resourceType === 'Labour');
        const materialResources = item.resources.filter(r => r.resourceType === 'Material');
        const equipmentResources = item.resources.filter(r => r.resourceType === 'Equipment');
        
        const labourSubtotal = labourResources.reduce((sum, r) => sum + r.amount, 0);
        const materialSubtotal = materialResources.reduce((sum, r) => sum + r.amount, 0);
        const equipmentSubtotal = equipmentResources.reduce((sum, r) => sum + r.amount, 0);
        const totalSubtotal = labourSubtotal + materialSubtotal + equipmentSubtotal;
        
        // HEADER ROW - Work Item with Basis Quantity on right
        const workItemText = `${item.refSs || ''} ${item.sNo || ''} - ${item.normDescription}`;
        const headerText = `${workItemText}\nBasis Qty: ${item.basisQuantity} ${item.unit}`;
        
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = {
          v: headerText,
          t: 's',
          s: {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '1E293B' } },
            alignment: { horizontal: 'left', vertical: 'center', wrapText: true }
          }
        };
        
        // Merge header across all 7 columns
        if (!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 6 } });
        
        // Set row height for header to allow wrapped text
        if (!ws['!rows']) ws['!rows'] = [];
        ws['!rows'][currentRow] = { hpt: 40 }; // Height in points
        
        currentRow++;
        
        // Column Headers
        const headers = ['Resource', 'Type', 'Unit', 'Quantity', 'Rate (Rs.)', 'Amount (Rs.)', 'Sub Total'];
        headers.forEach((header, colIndex) => {
          ws[XLSX.utils.encode_cell({ r: currentRow, c: colIndex })] = {
            v: header,
            t: 's',
            s: {
              font: { bold: true },
              fill: { fgColor: { rgb: 'F1F5F9' } },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            }
          };
        });
        currentRow++;
        
        const groupStartRows: { type: string; start: number; end: number }[] = [];
        
        // LABOUR SECTION
        if (labourResources.length > 0) {
          const labourStartRow = currentRow;
          
          labourResources.forEach((resource) => {
            const rowData = [
              resource.resourceName + (resource.isCustomizedRate ? ' *' : '') + (resource.isCustomizedQuantity ? ' **' : ''),
              resource.resourceType,
              resource.unit,
              resource.quantity,
              resource.rate,
              resource.amount
            ];
            
            rowData.forEach((value, colIndex) => {
              const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
              ws[cell] = {
                v: value,
                t: typeof value === 'number' ? 'n' : 's',
                s: {
                  fill: { fgColor: { rgb: 'DBEAFE' } },
                  alignment: { horizontal: colIndex > 2 ? 'right' : 'left', vertical: 'center' },
                  border: {
                    top: { style: 'thin', color: { rgb: '000000' } },
                    bottom: { style: 'thin', color: { rgb: '000000' } },
                    left: { style: 'thin', color: { rgb: '000000' } },
                    right: { style: 'thin', color: { rgb: '000000' } }
                  }
                }
              };
              if (colIndex === 3 || colIndex === 4 || colIndex === 5) {
                ws[cell].t = 'n';
              }
              if (colIndex === 5) {
                ws[cell] = {
                  f: `${XLSX.utils.encode_col(3)}${currentRow + 1}*${XLSX.utils.encode_col(4)}${currentRow + 1}`,
                  t: 'n',
                  s: ws[cell].s
                };
              }
            });
            
            // Add empty cell with borders in Sub Total column
            const subtotalCell = XLSX.utils.encode_cell({ r: currentRow, c: 6 });
            ws[subtotalCell] = {
              v: '',
              t: 's',
              s: {
                fill: { fgColor: { rgb: 'DBEAFE' } },
                border: {
                  top: { style: 'thin', color: { rgb: '000000' } },
                  bottom: { style: 'thin', color: { rgb: '000000' } },
                  left: { style: 'thin', color: { rgb: '000000' } },
                  right: { style: 'thin', color: { rgb: '000000' } }
                }
              }
            };
            currentRow++;
          });
          
          const labourEndRow = currentRow - 1;
          groupStartRows.push({ type: 'Labour', start: labourStartRow, end: labourEndRow });
          
          // Add Labour Subtotal in Sub Total column (merged)
          const subtotalCell = XLSX.utils.encode_cell({ r: labourStartRow, c: 6 });
          ws[subtotalCell] = {
            f: `SUM(F${labourStartRow + 1}:F${labourEndRow + 1})`,
            t: 'n',
            s: {
              font: { bold: true },
              fill: { fgColor: { rgb: 'BFDBFE' } },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            }
          };
          
          // Merge Sub Total column for Labour group
          if (labourStartRow !== labourEndRow) {
            ws['!merges'].push({ s: { r: labourStartRow, c: 6 }, e: { r: labourEndRow, c: 6 } });
          }
        }
        
        // MATERIAL SECTION
        if (materialResources.length > 0) {
          const materialStartRow = currentRow;
          
          materialResources.forEach((resource) => {
            const rowData = [
              resource.resourceName + (resource.isCustomizedRate ? ' *' : '') + (resource.isCustomizedQuantity ? ' **' : ''),
              resource.resourceType,
              resource.unit,
              resource.quantity,
              resource.rate,
              resource.amount
            ];
            
            rowData.forEach((value, colIndex) => {
              const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
              ws[cell] = {
                v: value,
                t: typeof value === 'number' ? 'n' : 's',
                s: {
                  fill: { fgColor: { rgb: 'D1FAE5' } },
                  alignment: { horizontal: colIndex > 2 ? 'right' : 'left', vertical: 'center' },
                  border: {
                    top: { style: 'thin', color: { rgb: '000000' } },
                    bottom: { style: 'thin', color: { rgb: '000000' } },
                    left: { style: 'thin', color: { rgb: '000000' } },
                    right: { style: 'thin', color: { rgb: '000000' } }
                  }
                }
              };
              if (colIndex === 3 || colIndex === 4 || colIndex === 5) {
                ws[cell].t = 'n';
              }
              if (colIndex === 5) {
                ws[cell] = {
                  f: `${XLSX.utils.encode_col(3)}${currentRow + 1}*${XLSX.utils.encode_col(4)}${currentRow + 1}`,
                  t: 'n',
                  s: ws[cell].s
                };
              }
            });
            
            // Add empty cell with borders in Sub Total column
            const subtotalCell = XLSX.utils.encode_cell({ r: currentRow, c: 6 });
            ws[subtotalCell] = {
              v: '',
              t: 's',
              s: {
                fill: { fgColor: { rgb: 'D1FAE5' } },
                border: {
                  top: { style: 'thin', color: { rgb: '000000' } },
                  bottom: { style: 'thin', color: { rgb: '000000' } },
                  left: { style: 'thin', color: { rgb: '000000' } },
                  right: { style: 'thin', color: { rgb: '000000' } }
                }
              }
            };
            currentRow++;
          });
          
          const materialEndRow = currentRow - 1;
          groupStartRows.push({ type: 'Material', start: materialStartRow, end: materialEndRow });
          
          // Add Material Subtotal in Sub Total column (merged)
          const subtotalCell = XLSX.utils.encode_cell({ r: materialStartRow, c: 6 });
          ws[subtotalCell] = {
            f: `SUM(F${materialStartRow + 1}:F${materialEndRow + 1})`,
            t: 'n',
            s: {
              font: { bold: true },
              fill: { fgColor: { rgb: 'A7F3D0' } },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            }
          };
          
          // Merge Sub Total column for Material group
          if (materialStartRow !== materialEndRow) {
            ws['!merges'].push({ s: { r: materialStartRow, c: 6 }, e: { r: materialEndRow, c: 6 } });
          }
        }
        
        // EQUIPMENT SECTION
        if (equipmentResources.length > 0) {
          const equipmentStartRow = currentRow;
          
          equipmentResources.forEach((resource) => {
            const rowData = [
              resource.resourceName + (resource.isCustomizedRate ? ' *' : '') + (resource.isCustomizedQuantity ? ' **' : ''),
              resource.resourceType,
              resource.unit,
              resource.quantity,
              resource.rate,
              resource.amount
            ];
            
            rowData.forEach((value, colIndex) => {
              const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
              ws[cell] = {
                v: value,
                t: typeof value === 'number' ? 'n' : 's',
                s: {
                  fill: { fgColor: { rgb: 'FFEDD5' } },
                  alignment: { horizontal: colIndex > 2 ? 'right' : 'left', vertical: 'center' },
                  border: {
                    top: { style: 'thin', color: { rgb: '000000' } },
                    bottom: { style: 'thin', color: { rgb: '000000' } },
                    left: { style: 'thin', color: { rgb: '000000' } },
                    right: { style: 'thin', color: { rgb: '000000' } }
                  }
                }
              };
              if (colIndex === 3 || colIndex === 4 || colIndex === 5) {
                ws[cell].t = 'n';
              }
              if (colIndex === 5) {
                ws[cell] = {
                  f: `${XLSX.utils.encode_col(3)}${currentRow + 1}*${XLSX.utils.encode_col(4)}${currentRow + 1}`,
                  t: 'n',
                  s: ws[cell].s
                };
              }
            });
            
            // Add empty cell with borders in Sub Total column
            const subtotalCell = XLSX.utils.encode_cell({ r: currentRow, c: 6 });
            ws[subtotalCell] = {
              v: '',
              t: 's',
              s: {
                fill: { fgColor: { rgb: 'FFEDD5' } },
                border: {
                  top: { style: 'thin', color: { rgb: '000000' } },
                  bottom: { style: 'thin', color: { rgb: '000000' } },
                  left: { style: 'thin', color: { rgb: '000000' } },
                  right: { style: 'thin', color: { rgb: '000000' } }
                }
              }
            };
            currentRow++;
          });
          
          const equipmentEndRow = currentRow - 1;
          groupStartRows.push({ type: 'Equipment', start: equipmentStartRow, end: equipmentEndRow });
          
          // Add Equipment Subtotal in Sub Total column (merged)
          const subtotalCell = XLSX.utils.encode_cell({ r: equipmentStartRow, c: 6 });
          ws[subtotalCell] = {
            f: `SUM(F${equipmentStartRow + 1}:F${equipmentEndRow + 1})`,
            t: 'n',
            s: {
              font: { bold: true },
              fill: { fgColor: { rgb: 'FED7AA' } },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            }
          };
          
          // Merge Sub Total column for Equipment group
          if (equipmentStartRow !== equipmentEndRow) {
            ws['!merges'].push({ s: { r: equipmentStartRow, c: 6 }, e: { r: equipmentEndRow, c: 6 } });
          }
        }
        
        // TOTAL ROW - Sum of all Sub Totals
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = {
          v: 'TOTAL:',
          t: 's',
          s: {
            font: { bold: true },
            fill: { fgColor: { rgb: 'F1F5F9' } },
            alignment: { horizontal: 'right', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          }
        };
        
        // Total in Sub Total column (sum of all group subtotals)
        const totalFormulaParts: string[] = [];
        groupStartRows.forEach(group => {
          totalFormulaParts.push(`G${group.start + 1}`);
        });
        
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 6 })] = {
          f: totalFormulaParts.join('+'),
          t: 'n',
          s: {
            font: { bold: true },
            fill: { fgColor: { rgb: 'F1F5F9' } },
            alignment: { horizontal: 'right', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          }
        };
        currentRow++;
        
        // Unit Rate Row
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = {
          v: `Unit Rate (Total ÷ ${item.basisQuantity} ${item.unit}):`,
          t: 's',
          s: {
            font: { bold: true },
            fill: { fgColor: { rgb: 'F8FAFC' } },
            alignment: { horizontal: 'right', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          }
        };
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 6 })] = {
          f: `G${currentRow} / ${item.basisQuantity}`,
          t: 'n',
          s: {
            font: { bold: true },
            fill: { fgColor: { rgb: 'F8FAFC' } },
            alignment: { horizontal: 'right', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          }
        };
        currentRow++;
        
        // Contractor Overhead (if applicable)
        if (project.mode === 'CONTRACTOR') {
          ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = {
            v: '+15% Contractor Overhead:',
            t: 's',
            s: {
              font: { bold: true },
              fill: { fgColor: { rgb: 'FEF3C7' } },
              alignment: { horizontal: 'right', vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            }
          };
          ws[XLSX.utils.encode_cell({ r: currentRow, c: 6 })] = {
            f: `G${currentRow - 1}*0.15`,
            t: 'n',
            s: {
              font: { bold: true },
              fill: { fgColor: { rgb: 'FEF3C7' } },
              alignment: { horizontal: 'right', vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            }
          };
          currentRow++;
          
          // Final Total for Contractor
          ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = {
            v: 'FINAL UNIT RATE:',
            t: 's',
            s: {
              font: { bold: true, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '1E293B' } },
              alignment: { horizontal: 'right', vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            }
          };
          ws[XLSX.utils.encode_cell({ r: currentRow, c: 6 })] = {
            f: `G${currentRow - 2}+G${currentRow - 1}`,
            t: 'n',
            s: {
              font: { bold: true, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '1E293B' } },
              alignment: { horizontal: 'right', vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            }
          };
          currentRow++;
        }
        
        // Legend for custom indicators
        if (item.resources.some(r => r.isCustomizedRate || r.isCustomizedQuantity)) {
          currentRow++;
          ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = {
            v: '* Custom Rate Applied    ** Custom Quantity Applied',
            t: 's',
            s: { font: { italic: true, color: { rgb: '666666' } } }
          };
        }
        
        // Add some spacing between work items
        currentRow += 2;
      });
      
      // Set worksheet range
      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: currentRow - 1, c: 6 } });
      
      XLSX.utils.book_append_sheet(wb, ws, 'Rate_Analysis');
    }

    if (activeTab === 'materials') {
      const materials = transportMaterials
        .map((item, idx) => ({
          sn: idx + 1,
          description: item.material_name,
          category: item.load_category,
          unit: 'kg',
          originalCost: 0,
          vat: 0,
          gravelledCost: item.gravelled_cost_per_unit,
          metalledCost: item.metalled_cost_per_unit,
          porterCost: item.porter_cost_per_unit,
          loadUnloadCost: 0,
          totalCost: item.total_cost_per_unit,
          unitWeight: item.unit_weight,
          remarks: ''
        }))
        .sort((a, b) => a.description.localeCompare(b.description));

      const ws: XLSX.WorkSheet = {};
      ws['!cols'] = [
        { wch: 5 },
        { wch: 30 },
        { wch: 20 },
        { wch: 10 },
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 20 },
        { wch: 20 }
      ];

      let currentRow = 0;

      // Project Info
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { v: 'Name of Project:', t: 's', s: { font: { bold: true } } };
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 1 })] = { v: project.name, t: 's' };
      currentRow++;
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { v: 'Location:', t: 's', s: { font: { bold: true } } };
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 1 })] = { v: project.location || 'N/A', t: 's' };
      currentRow += 2;

      // Header styling
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1E293B' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };

      const cellStyle = {
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };

      const cellStyleRight = {
        alignment: { horizontal: 'right', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };

      const cellStyleCenter = {
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };

      // Headers
      const headers = ['SN', 'Description', 'Load Category', 'Unit', 'Original Cost', 'VAT', 'Gravelled Cost', 'Metalled Cost', 'Porter Cost', 'Load/Unload Cost', 'Total Cost', 'Unit Weight', 'Remarks'];
      headers.forEach((header, colIndex) => {
        const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
        ws[cell] = {
          v: header,
          t: 's',
          s: headerStyle
        };
      });
      currentRow++;

      // Data rows
      materials.forEach((res) => {
        // SN
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = {
          v: res.sn,
          t: 'n',
          s: cellStyleCenter
        };
        // Description
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 1 })] = {
          v: res.description,
          t: 's',
          s: cellStyle
        };
        // Load Category
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 2 })] = {
          v: res.category,
          t: 's',
          s: cellStyle
        };
        // Unit
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 3 })] = {
          v: res.unit,
          t: 's',
          s: cellStyle
        };
        // Original Cost
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 4 })] = {
          v: res.originalCost,
          t: 'n',
          s: cellStyleRight
        };
        // VAT
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = {
          v: res.vat,
          t: 'n',
          s: cellStyleRight
        };
        // Gravelled Cost
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 6 })] = {
          v: res.gravelledCost,
          t: 'n',
          s: cellStyleRight
        };
        // Metalled Cost
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 7 })] = {
          v: res.metalledCost,
          t: 'n',
          s: cellStyleRight
        };
        // Porter Cost
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 8 })] = {
          v: res.porterCost,
          t: 'n',
          s: cellStyleRight
        };
        // Load/Unload Cost
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 9 })] = {
          v: res.loadUnloadCost,
          t: 'n',
          s: cellStyleRight
        };
        // Total Cost
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 10 })] = {
          v: res.totalCost,
          t: 'n',
          s: cellStyleRight
        };
        // Unit Weight
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 11 })] = {
          v: res.unitWeight,
          t: 's',
          s: cellStyle
        };
        // Remarks
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 12 })] = {
          v: res.remarks,
          t: 's',
          s: cellStyle
        };
        currentRow++;
      });

      // Total row
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 9 })] = {
        v: 'Total',
        t: 's',
        s: { font: { bold: true }, alignment: { horizontal: 'right' } }
      };
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 10 })] = {
        v: materials.reduce((acc, r) => acc + r.totalCost, 0),
        t: 'n',
        s: { font: { bold: true }, alignment: { horizontal: 'right' } }
      };

      // Distances
      currentRow += 2;
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { v: 'Porter Distance (km):', t: 's', s: { font: { bold: true } } };
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 1 })] = { v: porterDistance, t: 'n' };
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 2 })] = { v: `${(porterDistance / 3.218).toFixed(2)} kosh`, t: 's' };
      currentRow++;
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { v: 'Gravelled Distance (km):', t: 's', s: { font: { bold: true } } };
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 1 })] = { v: gravelledDistance, t: 'n' };
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 2 })] = { v: `${(gravelledDistance / 3.218).toFixed(2)} kosh`, t: 's' };
      currentRow++;
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { v: 'Metalled Distance (km):', t: 's', s: { font: { bold: true } } };
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 1 })] = { v: metalledDistance, t: 'n' };
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 2 })] = { v: `${(metalledDistance / 3.218).toFixed(2)} kosh`, t: 's' };

      // Set worksheet range
      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: currentRow, c: 12 } });

      XLSX.utils.book_append_sheet(wb, ws, 'Materials_Transportation');
    }

    // Save the file
    XLSX.writeFile(wb, `${project.name}_${activeTab}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`);
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-bold">Project not found</p>
        </div>
      </div>
    );
  }

  const totalAmount = calculateCurrentBOQTotal();

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={onBack}
            className="p-2 md:p-3 bg-white hover:bg-black/5 rounded-xl md:rounded-2xl transition-colors border border-black/5"
          >
            <ArrowLeft size={isMobile ? 18 : 20} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-xs md:text-sm text-black/40">{project.location || 'Location not set'}</p>
            <p className="text-xs font-bold mt-1">
              Mode: {project.mode === 'CONTRACTOR' ? 'Contractor (15% overhead applied to unit rates)' : 'Users Committee (VAT applied where applicable)'}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          {isAdding ? (
            <button
              onClick={handleSaveBOQ}
              className="bg-[#141414] text-white px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg shadow-black/10"
            >
              <Save size={isMobile ? 16 : 20} />
              Save BOQ
            </button>
          ) : (
            <button
              onClick={() => {
                const updated = { ...project, boqSaved: false };
                updateProject(updated);
                setIsAdding(true);
              }}
              className="bg-[#3B82F6] text-white px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-[#2563EB] transition-all shadow-lg shadow-black/10"
            >
              <Plus size={isMobile ? 16 : 20} />
              Add Item
            </button>
          )}
          <button 
            onClick={exportToExcel}
            className="bg-emerald-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-black/10"
          >
            <FileSpreadsheet size={isMobile ? 16 : 20} />
            Export Excel
          </button>
        </div>
      </div>

      <div className="flex bg-white rounded-xl p-1 border border-[#E2E8F0]">
        <button
          onClick={() => setSharedMode('estimate')}
          className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
            sharedMode === 'estimate'
              ? 'bg-[#1E293B] text-white shadow-sm'
              : 'text-[#333333]/60 hover:text-[#1E293B]'
          }`}
        >
          As per Estimate
        </button>
        <button
          onClick={() => setSharedMode('measurement')}
          className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
            sharedMode === 'measurement'
              ? 'bg-[#1E293B] text-white shadow-sm'
              : 'text-[#333333]/60 hover:text-[#1E293B]'
          }`}
        >
          As per Measurement
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl p-1 border border-[#E2E8F0]">
        <button
          onClick={() => setActiveTab('boq')}
          className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
            activeTab === 'boq'
              ? 'bg-[#1E293B] text-white shadow-sm'
              : 'text-[#333333]/60 hover:text-[#1E293B]'
          }`}
        >
          BOQ Items
        </button>
        <button
          onClick={() => setActiveTab('breakdown')}
          className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
            activeTab === 'breakdown'
              ? 'bg-[#1E293B] text-white shadow-sm'
              : 'text-[#333333]/60 hover:text-[#1E293B]'
          }`}
        >
          Resource Breakdown
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
            activeTab === 'analysis'
              ? 'bg-[#1E293B] text-white shadow-sm'
              : 'text-[#333333]/60 hover:text-[#1E293B]'
          }`}
        >
          Rate Analysis
        </button>
        <button
          onClick={() => setActiveTab('materials')}
          className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
            activeTab === 'materials'
              ? 'bg-[#1E293B] text-white shadow-sm'
              : 'text-[#333333]/60 hover:text-[#1E293B]'
          }`}
        >
          Material and Transportation
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'boq' && (
        <>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-black/5 shadow-sm">
              <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">
                {sharedMode === 'estimate' ? 'Total BOQ (Estimate)' : 'Total BOQ (Measurement)'}
              </p>
              <p className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tighter">
                {sharedMode === 'estimate'
                  ? (isNaN(totalAmount) || !isFinite(totalAmount) ? '0.00' : totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                  : (isNaN(calculateMeasurementTotal()) || !isFinite(calculateMeasurementTotal()) ? '0.00' : calculateMeasurementTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
              </p>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-black/5 shadow-sm">
              <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">Items</p>
              <p className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tighter">{project.items.length}</p>
            </div>
          </div>

          {isAdding && sharedMode === 'estimate' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#1E293B]">Available Norms (Tap to add)</h3>
                <span className="text-[9px] text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-0.5 rounded-full">Tap to add</span>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#333333]/40" size={14} />
                <input
                  type="text"
                  placeholder="Search norms..."
                  className="w-full pl-9 pr-8 py-2 bg-white rounded-xl border border-[#E2E8F0] text-sm text-[#333333] placeholder:text-[#333333]/30 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
                  value={searchTerm}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#333333]/40 hover:text-[#333333] transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {filteredNorms.slice(0, 30).map((norm: Norm) => (
                  <motion.div
                    key={norm.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => addItem(norm)}
                    className="cursor-pointer p-3 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#3B82F6] active:bg-[#F8FAFC] transition-all duration-150 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase bg-[#1E293B] text-white`}>
                            {norm.type}
                          </span>
                          <span className="text-[9px] font-mono text-[#333333]/50">
                            {norm.ref_ss} {norm.sNo || ''}
                          </span>
                        </div>
                        <p className="font-bold text-xs leading-tight text-[#333333] line-clamp-2">{norm.description}</p>
                        <p className="text-[9px] text-[#333333]/40 mt-1">Unit: {norm.unit} • Basis: {norm.basis_quantity}</p>
                      </div>
                      <div className="text-[10px] text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-1 rounded-full">
                        Add
                      </div>
                    </div>
                  </motion.div>
                ))}
                {filteredNorms.length === 0 && (
                  <div className="text-center text-[#333333]/40 py-8">
                    No norms found
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-black/5 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#1E293B]">BOQ Saved</p>
              <p className="text-xs text-black/40">Use "Add Item" (top) to continue adding.</p>
            </div>
          )}

          {/* BOQ Table — As per Estimate */}
          {sharedMode === 'estimate' && (
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-black/5 overflow-hidden">
              <div className="px-3 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#1E293B]">
                  BOQ Items — As per Estimate ({project.items.length})
                </h3>
              </div>
              {project.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-[#F5F5F0]/50 border-b border-black/5">
                        <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40">S.N.</th>
                        <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40">Work Item (Description)</th>
                        <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40">Unit</th>
                        <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40 text-center w-24">Qty (Est.)</th>
                        <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40 text-right w-28">Rate (Rs.)</th>
                        <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40 text-right w-32">Amount (Rs.)</th>
                        <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40">Ref to SS</th>
                        <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40 text-center w-20">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {project.items.map((item: BOQItem, idx: number) => {
                        const norm = norms.find((n: Norm) => n.id === item.normId);
                        const rate = calculateItemRate(item.normId);
                        const total = rate * item.estimate_quantity;
                        const isEditing = editingItemId === item.id;

                        return (
                          <tr key={item.id} className="hover:bg-black/5 transition-colors group">
                            <td className="px-3 py-3 text-[11px] text-[#333333]/50">{idx + 1}</td>
                            <td className="px-3 py-3">
                              <p className="text-xs font-bold line-clamp-2">{norm?.description || 'Unknown'}</p>
                              <span className="text-[8px] font-bold uppercase tracking-tighter text-black/30">{norm?.type}</span>
                            </td>
                            <td className="px-3 py-3 text-xs">{norm?.unit || '-'}</td>
                            <td className="px-3 py-3 text-center">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editForm.quantity}
                                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({ quantity: parseFloat(e.target.value) || 0 })}
                                  className="w-20 p-1 border border-black/10 rounded-lg text-sm text-center"
                                  step="0.01"
                                  min="0"
                                  onBlur={() => {
                                    updateItemQuantity(item.id, editForm.quantity);
                                    setEditingItemId(null);
                                  }}
                                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                    if (e.key === 'Enter') {
                                      updateItemQuantity(item.id, editForm.quantity);
                                      setEditingItemId(null);
                                    }
                                    if (e.key === 'Escape') setEditingItemId(null);
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingItemId(item.id);
                                    setEditForm({ quantity: item.estimate_quantity });
                                  }}
                                  className="text-sm font-bold hover:bg-black/5 px-2 py-1 rounded-lg transition-colors"
                                >
                                  {item.estimate_quantity}
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right text-sm font-mono"> {(isNaN(rate) || !isFinite(rate) ? '0.00' : rate.toLocaleString(undefined, { minimumFractionDigits: 2 }))}</td>
                            <td className="px-3 py-3 text-right text-sm font-bold"> {(isNaN(total) || !isFinite(total) ? '0.00' : total.toLocaleString(undefined, { minimumFractionDigits: 2 }))}</td>
                            <td className="px-3 py-3 text-xs text-black/50 font-mono">{norm?.ref_ss || '-'}</td>
                            <td className="px-3 py-3 text-center">
                              <button onClick={() => removeItem(item.id)} className="text-red-400 p-1 rounded-full hover:bg-red-50">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#F5F5F0] border-t border-black/10 font-bold">
                        <td colSpan={5} className="px-3 py-3 text-xs uppercase tracking-widest text-right">Total</td>
                        <td className="px-3 py-3 text-sm font-bold text-right">
                           {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-black/20">
                  <p className="text-sm">No items in BOQ. Tap on a norm above to add.</p>
                </div>
              )}
            </div>
          )}

          {/* BOQ Table — As per Measurement */}
          {sharedMode === 'measurement' && (
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-black/5 overflow-hidden">
              <div className="px-3 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#1E293B]">
                  BOQ Items — As per Measurement ({project.items.length})
                </h3>
                <span className="text-[9px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Click qty to edit</span>
              </div>
              {project.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-[#F5F5F0]/50 border-b border-black/5">
                        <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40">S.N.</th>
                        <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40">Work Item (Description)</th>
                        <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40">Unit</th>
                        <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40 text-center w-28">Qty (Meas.)</th>
                        <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40 text-right w-28">Rate (Rs.)</th>
                        <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40 text-right w-32">Amount (Rs.)</th>
                        <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40">Ref to SS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {project.items.map((item: BOQItem, idx: number) => {
                        const norm = norms.find((n: Norm) => n.id === item.normId);
                        const rate = calculateItemRate(item.normId);
                        const measTotal = rate * item.measurement_quantity;
                        const isEditingMeas = editingMeasurementId === item.id;

                        return (
                          <tr key={item.id} className="hover:bg-black/5 transition-colors">
                            <td className="px-3 py-3 text-[11px] text-[#333333]/50">{idx + 1}</td>
                            <td className="px-3 py-3">
                              <p className="text-xs font-bold line-clamp-2">{norm?.description || 'Unknown'}</p>
                              <span className="text-[8px] font-bold uppercase tracking-tighter text-black/30">{norm?.type}</span>
                            </td>
                            <td className="px-3 py-3 text-xs">{norm?.unit || '-'}</td>
                            <td className="px-3 py-3 text-center">
                              {isEditingMeas ? (
                                <input
                                  type="number"
                                  value={editMeasurementForm.quantity}
                                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEditMeasurementForm({ quantity: parseFloat(e.target.value) || 0 })}
                                  className="w-24 p-1 border border-amber-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-200"
                                  step="0.01"
                                  min="0"
                                  onBlur={() => {
                                    updateMeasurementQuantity(item.id, editMeasurementForm.quantity);
                                    setEditingMeasurementId(null);
                                  }}
                                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                    if (e.key === 'Enter') {
                                      updateMeasurementQuantity(item.id, editMeasurementForm.quantity);
                                      setEditingMeasurementId(null);
                                    }
                                    if (e.key === 'Escape') setEditingMeasurementId(null);
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingMeasurementId(item.id);
                                    setEditMeasurementForm({ quantity: item.measurement_quantity });
                                  }}
                                  className="text-sm font-bold hover:bg-amber-50 px-2 py-1 rounded-lg transition-colors text-amber-700 border border-amber-200"
                                >
                                  {item.measurement_quantity}
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right text-sm font-mono"> {(isNaN(rate) || !isFinite(rate) ? '0.00' : rate.toLocaleString(undefined, { minimumFractionDigits: 2 }))}</td>
                            <td className="px-3 py-3 text-right text-sm font-bold"> {(isNaN(measTotal) || !isFinite(measTotal) ? '0.00' : measTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }))}</td>
                            <td className="px-3 py-3 text-xs text-black/50 font-mono">{norm?.ref_ss || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#F5F5F0] border-t border-black/10 font-bold">
                        <td colSpan={5} className="px-3 py-3 text-xs uppercase tracking-widest text-right">Total (Measurement)</td>
                        <td className="px-3 py-3 text-sm font-bold text-right">
                           {calculateMeasurementTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-black/20">
                  <p className="text-sm">No items in BOQ. Add items first.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'breakdown' && (
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-black/5 overflow-hidden">
          <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#1E293B]">Resource Breakdown</h3>
          </div>
          {project.items.length > 0 ? (
            <div className="p-4 space-y-4">
              <div className="flex bg-white rounded-xl p-1 border border-[#E2E8F0]">
                <button
                  onClick={() => setBreakdownSubView('summary')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                    breakdownSubView === 'summary'
                      ? 'bg-[#1E293B] text-white shadow-sm'
                      : 'text-[#333333]/60 hover:text-[#1E293B]'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setBreakdownSubView('detailed')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                    breakdownSubView === 'detailed'
                      ? 'bg-[#1E293B] text-white shadow-sm'
                      : 'text-[#333333]/60 hover:text-[#1E293B]'
                  }`}
                >
                  Detailed
                </button>
                <button
                  onClick={() => setBreakdownSubView('tabulation')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                    breakdownSubView === 'tabulation'
                      ? 'bg-[#1E293B] text-white shadow-sm'
                      : 'text-[#333333]/60 hover:text-[#1E293B]'
                  }`}
                >
                  Tabulation
                </button>
              </div>

              {/* Summary: aggregated resource list - without Customized column */}
              {breakdownSubView === 'summary' && (() => {
                const data = (sharedMode === 'estimate' ? resourceBreakdownEstimate : resourceBreakdownMeasurement)
                  .map((item: ResourceBreakdownItem) => ({
                    ...item,
                    totalAmount: item.quantity * (project.mode === 'USERS' && item.apply_vat ? item.rate * 1.13 : item.rate)
                  }))
.sort((a: ResourceBreakdownItem, b: ResourceBreakdownItem) => {
                    const order = { Labour: 1, Material: 2, Equipment: 3 };
                  return (order[a.type as keyof typeof order] || 99) - (order[b.type as keyof typeof order] || 99) || a.name.localeCompare(b.name);
                });
                return data.length > 0 ? (
                  <div className="overflow-x-auto -mx-4 px-4">
                    <table className="w-full text-left border-collapse min-w-[700px] bg-white rounded-2xl overflow-hidden border border-black/5">
                      <thead>
                        <tr className="bg-[#F5F5F0]/50 border-b border-black/5">
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40">Type</th>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40">Resource</th>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40">Unit</th>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right w-24">Qty</th>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right w-28">Rate</th>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right w-32">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {data.map((res: ResourceBreakdownItem, idx: number) => (
                          <tr key={idx} className="hover:bg-black/5 transition-colors">
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${res.type === 'Labour' ? 'bg-blue-100 text-blue-700' : res.type === 'Material' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                {res.type}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-bold">{res.name}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-black/60">{res.unit}</td>
                            <td className="px-4 py-3 text-right"><span className="text-sm font-bold">{res.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })}</span></td>
                            <td className="px-4 py-3 text-right text-sm font-mono">{res.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600">{res.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                           </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#F5F5F0] border-t border-black/10">
                          <td colSpan={4} className="px-4 py-3 text-sm font-bold uppercase tracking-widest text-right">Total</td>
                          <td className="px-4 py-3 text-lg font-bold text-emerald-600 text-right">
                            {data.reduce((acc: number, r: ResourceBreakdownItem) => acc + r.totalAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td></td>
                         </tr>
                      </tfoot>
                     </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-black/20"><p className="text-sm">No resources to display.</p></div>
                );
              })()}

              {/* Detailed: resource × work-item matrix */}
              {breakdownSubView === 'detailed' && (() => {
                const matrix = sharedMode === 'estimate' ? resourceMatrixData : resourceMatrixMeasurementData;
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px] bg-white rounded-2xl overflow-hidden border border-black/5">
                      <thead>
                        <tr className="bg-[#1E293B] text-white">
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">S.N.</th>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Work Item</th>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Unit</th>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Qty</th>
                          {matrix.columns.map((col: string) => (
                            <th key={col} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest min-w-[120px]">{col}</th>
                          ))}
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {matrix.rows.map((row: MatrixRow) => (
                          <tr key={row.sNo} className="hover:bg-black/5">
                            <td className="px-4 py-3 text-sm">{row.sNo}</td>
                            <td className="px-4 py-3 text-sm font-medium">{row.workItem}</td>
                            <td className="px-4 py-3 text-sm">{row.unit}</td>
                            <td className="px-4 py-3 text-sm font-bold">{row.quantity}</td>
                            {matrix.columns.map((col: string) => (
                              <td key={col} className="px-4 py-3 text-sm">{row.resources[col] !== undefined ? row.resources[col].toFixed(3) : '-'}</td>
                            ))}
                           </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#F5F5F0] border-t border-black/10 font-bold">
                          <td colSpan={4} className="px-4 py-3 text-sm uppercase tracking-widest">Total</td>
                          {matrix.columns.map((col: string) => (
                            <td key={col} className="px-4 py-3 text-sm">{matrix.totals[col]?.toFixed(3) || '-'}</td>
                          ))}
                         </tr>
                      </tfoot>
                     </table>
                  </div>
                );
              })()}

              {breakdownSubView === 'tabulation' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1400px] bg-white rounded-2xl overflow-hidden border border-black/5">
                    <thead>
                      <tr className="bg-[#1E293B] text-white">
                        <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest" rowSpan={2}>SN</th>
                        <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest" rowSpan={2}>Materials & Labours</th>
                        <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest" rowSpan={2}>Unit</th>
                        <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-center" colSpan={4}>As Per Measurement</th>
                        <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-center" colSpan={4}>As Per Bill</th>
                        <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-center" colSpan={4}>Actual Cost</th>
                        <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest" rowSpan={2}>Remarks</th>
                       </tr>
                      <tr className="bg-[#1E293B] text-white">
                        <th className="px-3 py-1 text-[9px]">Quantity</th>
                        <th className="px-3 py-1 text-[9px]">Rate W/O VAT</th>
                        <th className="px-3 py-1 text-[9px]">Amount</th>
                        <th className="px-3 py-1 text-[9px]">VAT Amount</th>
                        <th className="px-3 py-1 text-[9px]">Quantity</th>
                        <th className="px-3 py-1 text-[9px]">Rate W/O VAT</th>
                        <th className="px-3 py-1 text-[9px]">Amount</th>
                        <th className="px-3 py-1 text-[9px]">VAT Amount</th>
                        <th className="px-3 py-1 text-[9px]">Quantity</th>
                        <th className="px-3 py-1 text-[9px]">Rate W/O VAT</th>
                        <th className="px-3 py-1 text-[9px]">Amount</th>
                        <th className="px-3 py-1 text-[9px]">VAT Amount</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {tabulationData.map((item: TabulationRow) => {
                        const isEditingBill = editingBillRate === item.resourceName;
                        return (
                          <tr key={item.sn} className="hover:bg-black/5">
                            <td className="px-3 py-2 text-sm">{item.sn}</td>
                            <td className="px-3 py-2 text-sm font-medium">{item.resourceName}</td>
                            <td className="px-3 py-2 text-sm">{item.unit}</td>
                            <td className="px-3 py-2 text-sm text-right">{item.measurementQty.toFixed(3)}</td>
                            <td className="px-3 py-2 text-sm text-right">{item.measurementRate.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-right">{item.measurementAmount.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-right">{item.measurementVat.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-right">
                              <input
                                type="number"
                                value={item.billQty}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => updateTabulationBillQty(item.resourceName, parseFloat(e.target.value) || 0)}
                                className="w-24 p-1 border border-black/10 rounded-lg text-sm text-right"
                                step="0.001"
                                min="0"
                              />
                            </td>
                            <td className="px-3 py-2 text-sm text-right">
                              {isEditingBill ? (
                                <input
                                  type="number"
                                  value={editBillRateForm.rate}
                                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEditBillRateForm({ ...editBillRateForm, rate: parseFloat(e.target.value) || 0 })}
                                  className="w-24 p-1 border border-black/10 rounded-lg text-sm text-right"
                                  step="1"
                                  min="0"
                                  onBlur={() => {
                                    updateTabulationBillRate(item.resourceName, editBillRateForm.rate);
                                    setEditingBillRate(null);
                                  }}
                                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                    if (e.key === 'Enter') {
                                      updateTabulationBillRate(item.resourceName, editBillRateForm.rate);
                                      setEditingBillRate(null);
                                    }
                                    if (e.key === 'Escape') setEditingBillRate(null);
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingBillRate(item.resourceName);
                                    setEditBillRateForm({ qty: item.billQty, rate: item.billRate });
                                  }}
                                  className="hover:bg-black/5 px-2 py-1 rounded-lg transition-colors"
                                >
                                  {item.billRate.toFixed(2)}
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-2 text-sm text-right">{item.billAmount.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-right">{item.billVat.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-right">{item.actualQty.toFixed(3)}</td>
                            <td className="px-3 py-2 text-sm text-right">{item.actualRate.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-right font-bold">{item.actualAmount.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-right">{item.actualVat.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm">
                              <input
                                type="text"
                                value={item.remarks}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => updateTabulationRemarks(item.resourceName, e.target.value)}
                                className="w-32 p-1 border border-black/10 rounded-lg text-sm"
                                placeholder="Remark"
                              />
                            </td>
                           </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      {(() => {
                        const measurementAmount = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.measurementAmount, 0);
                        const measurementVat = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.measurementVat, 0);
                        const billAmount = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.billAmount, 0);
                        const billVat = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.billVat, 0);
                        const actualAmount = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.actualAmount, 0);
                        const actualVat = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.actualVat, 0);

                        return (
                          <tr className="bg-[#1E293B] text-white font-bold">
                            <td colSpan={3} className="px-3 py-2 text-sm uppercase tracking-widest text-right">Grand Total</td>
                            <td colSpan={2}></td>
                            <td className="px-3 py-2 text-sm text-right">{measurementAmount.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-right">{measurementVat.toFixed(2)}</td>
                            <td colSpan={2}></td>
                            <td className="px-3 py-2 text-sm text-right">{billAmount.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-right">{billVat.toFixed(2)}</td>
                            <td colSpan={2}></td>
                            <td className="px-3 py-2 text-sm text-right">{actualAmount.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-right">{actualVat.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-right">{(measurementAmount + measurementVat).toFixed(2)}</td>
                           </tr>
                        );
                      })()}
                    </tfoot>
                   </table>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-black/20">
              <p className="text-sm">No resources to display. Add items to BOQ first.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-black/5 overflow-hidden">
          <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#1E293B]">Rate Analysis</h3>
            <p className="text-xs text-black/40 mt-1">Resource-wise breakdown with group subtotals</p>
          </div>
          {rateAnalysisData.length > 0 ? (
            <div className="p-4 space-y-6">
              {rateAnalysisData.map((item: RateAnalysisItem, idx: number) => {
                // Group resources by type
                const labourResources = item.resources.filter(r => r.resourceType === 'Labour');
                const materialResources = item.resources.filter(r => r.resourceType === 'Material');
                const equipmentResources = item.resources.filter(r => r.resourceType === 'Equipment');
                
                const labourSubtotal = labourResources.reduce((sum, r) => sum + r.amount, 0);
                const materialSubtotal = materialResources.reduce((sum, r) => sum + r.amount, 0);
                const equipmentSubtotal = equipmentResources.reduce((sum, r) => sum + r.amount, 0);
                const totalSubtotal = labourSubtotal + materialSubtotal + equipmentSubtotal;
                const contractorOverhead = project.mode === 'CONTRACTOR' ? totalSubtotal * 0.15 : 0;
                const finalUnitRate = project.mode === 'CONTRACTOR' ? item.unitRate : totalSubtotal / item.basisQuantity;
                
                return (
                  <div key={item.itemId} className="bg-white rounded-2xl border border-black/5 overflow-hidden shadow-sm">
                    {/* Work Item Header */}
                    <div className="p-4 bg-gradient-to-r from-[#1E293B] to-[#334155]">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Work Item {idx + 1}</p>
                          <p className="text-sm md:text-base font-bold text-white">
                            {item.refSs} {item.sNo} - {item.normDescription}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Basis Quantity</p>
                            <p className="text-sm font-bold text-white">{item.basisQuantity} {item.unit}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Rate Analysis Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full table-auto border-collapse min-w-[900px]">
                        <thead>
                          <tr className="bg-[#0F172A] text-white">
                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-left min-w-[180px]">Resource</th>
                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-left min-w-[90px]">Type</th>
                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-left min-w-[70px]">Unit</th>
                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-right min-w-[100px]">Quantity</th>
                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-right min-w-[100px]">Rate (Rs.)</th>
                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-right min-w-[110px]">Amount (Rs.)</th>
                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-right min-w-[110px]">Sub Total</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                          {/* Labour Section */}
                          {labourResources.length > 0 && (
                            <>
                              {labourResources.map((res, resIdx) => (
                                <tr key={`labour-${resIdx}`} className="hover:bg-blue-50/30 transition-colors">
                                  <td className="px-4 py-3 align-top">
                                    <span className="text-sm font-medium">{res.resourceName}</span>
                                    {res.isCustomizedRate && <span className="ml-2 text-[8px] bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded">Custom Rate</span>}
                                    {res.isCustomizedQuantity && <span className="ml-2 text-[8px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">Custom Qty</span>}
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <span className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase bg-blue-100 text-blue-700">
                                      {res.resourceType}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 align-top text-sm text-black/60">{res.unit}</td>
                                  <td className="px-4 py-3 align-top text-right text-sm font-mono">{res.quantity.toFixed(4)}</td>
                                  <td className="px-4 py-3 align-top text-right">
                                    <button
                                      onClick={() => {
                                        setEditingRate(`${item.normId}-${res.resourceName}`);
                                        setEditRateForm({ rate: res.rate });
                                      }}
                                      className="text-sm font-mono hover:bg-black/5 px-2 py-1 rounded-lg transition-colors text-right"
                                    >
                                      {res.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </button>
                                  </td>
                                  <td className="px-4 py-3 align-top text-right text-sm font-bold text-emerald-600">{res.amount.toFixed(2)}</td>
                                  {resIdx === 0 && (
                                    <td rowSpan={labourResources.length} className="px-4 py-3 align-top text-right text-sm font-bold text-blue-700 bg-blue-50/50">
                                      {labourSubtotal.toFixed(2)}
                                    </td>
                                  )}
                                 </tr>
                              ))}
                            </>
                          )}
                          
                          {/* Material Section */}
                          {materialResources.length > 0 && (
                            <>
                              {materialResources.map((res, resIdx) => (
                                <tr key={`material-${resIdx}`} className="hover:bg-emerald-50/30 transition-colors">
                                  <td className="px-4 py-3 align-top">
                                    <span className="text-sm font-medium">{res.resourceName}</span>
                                    {res.isCustomizedRate && <span className="ml-2 text-[8px] bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded">Custom Rate</span>}
                                    {res.isCustomizedQuantity && <span className="ml-2 text-[8px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">Custom Qty</span>}
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <span className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700">
                                      {res.resourceType}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 align-top text-sm text-black/60">{res.unit}</td>
                                  <td className="px-4 py-3 align-top text-right text-sm font-mono">{res.quantity.toFixed(4)}</td>
                                  <td className="px-4 py-3 align-top text-right">
                                    <button
                                      onClick={() => {
                                        setEditingRate(`${item.normId}-${res.resourceName}`);
                                        setEditRateForm({ rate: res.rate });
                                      }}
                                      className="text-sm font-mono hover:bg-black/5 px-2 py-1 rounded-lg transition-colors text-right"
                                    >
                                      {res.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </button>
                                  </td>
                                  <td className="px-4 py-3 align-top text-right text-sm font-bold text-emerald-600">{res.amount.toFixed(2)}</td>
                                  {resIdx === 0 && (
                                    <td rowSpan={materialResources.length} className="px-4 py-3 align-top text-right text-sm font-bold text-emerald-700 bg-emerald-50/50">
                                      {materialSubtotal.toFixed(2)}
                                    </td>
                                  )}
                                 </tr>
                              ))}
                            </>
                          )}
                          
                          {/* Equipment Section */}
                          {equipmentResources.length > 0 && (
                            <>
                              {equipmentResources.map((res, resIdx) => (
                                <tr key={`equipment-${resIdx}`} className="hover:bg-orange-50/30 transition-colors">
                                  <td className="px-4 py-3 align-top">
                                    <span className="text-sm font-medium">{res.resourceName}</span>
                                    {res.isCustomizedRate && <span className="ml-2 text-[8px] bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded">Custom Rate</span>}
                                    {res.isCustomizedQuantity && <span className="ml-2 text-[8px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">Custom Qty</span>}
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <span className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase bg-orange-100 text-orange-700">
                                      {res.resourceType}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 align-top text-sm text-black/60">{res.unit}</td>
                                  <td className="px-4 py-3 align-top text-right text-sm font-mono">{res.quantity.toFixed(4)}</td>
                                  <td className="px-4 py-3 align-top text-right">
                                    <button
                                      onClick={() => {
                                        setEditingRate(`${item.normId}-${res.resourceName}`);
                                        setEditRateForm({ rate: res.rate });
                                      }}
                                      className="text-sm font-mono hover:bg-black/5 px-2 py-1 rounded-lg transition-colors text-right"
                                    >
                                      {res.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </button>
                                  </td>
                                  <td className="px-4 py-3 align-top text-right text-sm font-bold text-emerald-600">{res.amount.toFixed(2)}</td>
                                  {resIdx === 0 && (
                                    <td rowSpan={equipmentResources.length} className="px-4 py-3 align-top text-right text-sm font-bold text-orange-700 bg-orange-50/50">
                                      {equipmentSubtotal.toFixed(2)}
                                    </td>
                                  )}
                                 </tr>
                              ))}
                            </>
                          )}
                        </tbody>
                        <tfoot>
                          {/* Total Row */}
                          <tr className="bg-[#F1F5F9] border-t-2 border-black/10">
                            <td colSpan={5} className="px-4 py-3 text-right text-sm font-bold uppercase tracking-widest text-black/70">
                              TOTAL (Labour + Material + Equipment)
                            </td>
                            <td className="px-4 py-3 text-right text-base font-bold text-emerald-700">
                              {totalSubtotal.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right text-base font-bold text-emerald-700">
                              {totalSubtotal.toFixed(2)}
                            </td>
                          </tr>
                          
                          {/* Unit Rate Row */}
                          <tr className="bg-[#F8FAFC]">
                            <td colSpan={5} className="px-4 py-3 text-right text-sm font-bold uppercase tracking-widest text-black/70">
                              UNIT RATE (Total ÷ {item.basisQuantity} {item.unit})
                            </td>
                            <td className="px-4 py-3 text-right text-base font-bold text-emerald-700">
                              {(totalSubtotal / item.basisQuantity).toFixed(2)}
                            </td>
                            <td className="px-4 py-3"></td>
                          </tr>
                          
                          {/* Contractor Overhead (if mode is CONTRACTOR) */}
                          {project.mode === 'CONTRACTOR' && (
                            <>
                              <tr className="bg-[#FEF3C7]">
                                <td colSpan={5} className="px-4 py-3 text-right text-sm font-bold uppercase tracking-widest text-amber-700">
                                  Contractor Profit and Overhead @ 15%
                                </td>
                                <td className="px-4 py-3 text-right text-base font-bold text-amber-700">
                                  {contractorOverhead.toFixed(2)}
                                </td>
                                <td className="px-4 py-3"></td>
                              </tr>
                              <tr className="bg-[#1E293B] text-white">
                                <td colSpan={5} className="px-4 py-3 text-right text-sm font-bold uppercase tracking-widest">
                                  UNIT RATE (With Contractor Profit & Overhead)
                                </td>
                                <td className="px-4 py-3 text-right text-lg font-bold">
                                  {finalUnitRate.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-right text-sm">
                                  per {item.unit}
                                </td>
                              </tr>
                            </>
                          )}
                          
                          {project.mode !== 'CONTRACTOR' && (
                            <tr className="bg-[#1E293B] text-white">
                              <td colSpan={5} className="px-4 py-3 text-right text-sm font-bold uppercase tracking-widest">
                                UNIT RATE
                              </td>
                              <td className="px-4 py-3 text-right text-lg font-bold">
                                {finalUnitRate.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm">
                                per {item.unit}
                              </td>
                            </tr>
                          )}
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-black/20">
              <p className="text-sm">No rate analysis data. Add items to BOQ first.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-black/5 overflow-hidden">
          <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#1E293B]">Material and Transportation</h3>
            <p className="text-xs text-black/40 mt-1">Transportation cost breakdown for materials</p>
          </div>
          <div className="p-4 space-y-4">
            {/* Project Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-black/70 mb-1">Name of Project:</label>
                <p className="text-sm font-medium">{project?.name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-black/70 mb-1">Location:</label>
                <p className="text-sm font-medium">{project?.location || 'N/A'}</p>
              </div>
            </div>

            {/* Transport Coefficients Editor */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-[#1E293B]">Transport Coefficients (Rs./kg)</h4>
                  <p className="text-xs text-black/40">Set porter coefficients for each load category and road type.</p>
                </div>
              </div>

              <div className="space-y-6">
                {(['Porter', 'Tractor', 'Truck'] as const).map((mode) => (
                  <div key={mode} className="space-y-3">
                    <h5 className="text-sm font-bold text-[#1E293B] uppercase tracking-widest">{mode} Transport</h5>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#F5F5F0]/50 border-b border-black/5">
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40">Load Category</th>
                            {mode !== 'Porter' ? (
                              <>
                                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right">Metalled (Rs./kg)</th>
                                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right">Gravelled (Rs./kg)</th>
                              </>
                            ) : (
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right">Gravelled (Rs./kg)</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                          {LOAD_CATEGORY_OPTIONS.map((category) => (
                            <tr key={category} className="hover:bg-black/5 transition-colors">
                              <td className="px-4 py-3 text-sm font-bold">{category}</td>
                              {mode !== 'Porter' ? (
                                <>
                                  <td className="px-4 py-3">
                                    <input
                                      type="number"
                                      value={transportCoefficients[mode][category].metalled}
                                      onChange={(e: ChangeEvent<HTMLInputElement>) => updateTransportCoefficient(mode, category, 'metalled', parseFloat(e.target.value) || 0)}
                                      className="w-20 p-1 bg-[#F5F5F0] rounded-lg text-sm text-right"
                                      step="0.1"
                                      min="0"
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <input
                                      type="number"
                                      value={transportCoefficients[mode][category].gravelled}
                                      onChange={(e: ChangeEvent<HTMLInputElement>) => updateTransportCoefficient(mode, category, 'gravelled', parseFloat(e.target.value) || 0)}
                                      className="w-20 p-1 bg-[#F5F5F0] rounded-lg text-sm text-right"
                                      step="0.1"
                                      min="0"
                                    />
                                  </td>
                                </>
                              ) : (
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    value={transportCoefficients[mode][category].gravelled}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateTransportCoefficient(mode, category, 'gravelled', parseFloat(e.target.value) || 0)}
                                    className="w-20 p-1 bg-[#F5F5F0] rounded-lg text-sm text-right"
                                    step="0.1"
                                    min="0"
                                  />
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-[#1E293B]">Material Transportation Breakdown (Per Unit)</h4>
                  <p className="text-xs text-black/40">Use the dropdown and unit weight editor to classify transport settings.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-black/70 mb-1">Transport Mode</label>
                  <select
                    value={transportMode}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setTransportMode(e.target.value as 'Tractor' | 'Truck')}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E293B] text-sm bg-white"
                  >
                    <option value="Tractor">Tractor</option>
                    <option value="Truck">Truck</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-black/70 mb-1">Load Categories</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LOAD_CATEGORY_OPTIONS.map((category) => (
                      <span key={category} className="inline-flex items-center justify-center rounded-full border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#1E293B]">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F5F5F0]/50 border-b border-black/5">
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40">Material</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40">Unit Weight (kg)</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40">Category</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right">Metalled (Rs./unit)</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right">Gravelled (Rs./unit)</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right">Porter (Rs./unit)</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right">Total (Rs./unit)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {transportMaterials.map((material, idx) => (
                      <tr key={idx} className="hover:bg-black/5 transition-colors">
                        <td className="px-4 py-3 text-sm font-bold">{material.material_name}</td>
                        <td className="px-4 py-3">
                          {editingUnitWeight === material.material_name ? (
                            <input
                              type="number"
                              value={tempUnitWeight}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                const val = e.target.value.replace(',', '.');
                                const num = parseFloat(val);
                                setTempUnitWeight(isNaN(num) ? tempUnitWeight : num);
                              }}
                              onBlur={() => {
                                updateUnitWeight(material.material_name, tempUnitWeight);
                                setEditingUnitWeight(null);
                              }}
                              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === 'Enter') {
                                  updateUnitWeight(material.material_name, tempUnitWeight);
                                  setEditingUnitWeight(null);
                                }
                              }}
                              className="w-20 p-1 bg-[#F5F5F0] rounded-lg text-sm"
                              step="0.1"
                              autoFocus
                            />
                          ) : (
                            <div
                              className="flex items-center gap-2 cursor-pointer group"
                              onClick={() => {
                                setTempUnitWeight(material.unit_weight);
                                setEditingUnitWeight(material.material_name);
                              }}
                            >
                              <span className="text-sm font-mono">{material.unit_weight}</span>
                              <Edit2 size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={material.load_category}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => updateLoadCategory(material.material_name, e.target.value as LoadCategoryName)}
                            className="p-1 bg-[#F5F5F0] rounded-lg text-sm border-none"
                          >
                            {LOAD_CATEGORY_OPTIONS.map((category) => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-right">Rs. {formatNumber(material.metalled_cost_per_unit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-sm font-mono text-right">Rs. {formatNumber(material.gravelled_cost_per_unit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-sm font-mono text-right">Rs. {formatNumber(material.porter_cost_per_unit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-sm font-bold text-emerald-600 text-right">Rs. {formatNumber(material.total_cost_per_unit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
              <h4 className="text-sm font-bold uppercase tracking-widest text-[#1E293B] mb-3">Transportation Distances</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black/70 mb-1">Porter Distance (km)</label>
                  <input
                    type="number"
                    value={porterDistance}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPorterDistance(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E293B] text-sm"
                    min="0"
                    step="0.1"
                  />
                  <p className="text-xs text-black/50 mt-1">{(porterDistance / 3.218).toFixed(2)} kosh</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-black/70 mb-1">Gravelled Distance (km)</label>
                  <input
                    type="number"
                    value={gravelledDistance}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setGravelledDistance(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E293B] text-sm"
                    min="0"
                    step="0.1"
                  />
                  <p className="text-xs text-black/50 mt-1">{(gravelledDistance / 3.218).toFixed(2)} kosh</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-black/70 mb-1">Metalled Distance (km)</label>
                  <input
                    type="number"
                    value={metalledDistance}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setMetalledDistance(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E293B] text-sm"
                    min="0"
                    step="0.1"
                  />
                  <p className="text-xs text-black/50 mt-1">{(metalledDistance / 3.218).toFixed(2)} kosh</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}