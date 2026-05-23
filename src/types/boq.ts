export interface Project {
  id: number;
  name: string;
  description: string;
  location?: string;
  mode: 'CONTRACTOR' | 'USERS';
  created_at: string;
  items: BOQItem[];
  customRates: CustomRate[];
  customResources: CustomResource[];
  boqSaved?: boolean;
  tabulationData?: TabulationData[];
  transportMode?: 'Tractor' | 'Truck';
  transportDistances?: {
    porterDistance?: number;
    gravelledDistance?: number;
    metalledDistance?: number;
  };
  transportMaterials?: TransportMaterial[];
  transportCoefficients?: TransportCoefficients;
}

export interface BOQItem {
  id: string;
  normId: number;
  estimate_quantity: number;
  measurement_quantity: number;
}

export interface CustomRate {
  resourceName: string;
  rate: number;
  unit: string;
}

export interface CustomResource {
  normId: number;
  resourceName: string;
  quantity: number;
  unit: string;
  resource_type: string;
}

export interface Rate {
  id: number;
  name: string;
  unit: string;
  rate: number;
  resource_type: string;
  apply_vat: boolean;
}

export interface TabulationData {
  resourceName: string;
  billRate: number;
  billQty: number;
  remarks: string;
}

export interface ResourceBreakdownItem {
  name: string;
  type: string;
  unit: string;
  quantity: number;
  rate: number;
  apply_vat: boolean;
  totalAmount: number;
  normId: number;
  originalQuantity: number;
  isCustomized: boolean;
}

export interface RateAnalysisResource {
  resourceName: string;
  resourceType: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  isCustomizedRate: boolean;
  isCustomizedQuantity: boolean;
}

export interface RateAnalysisItem {
  itemId: string;
  normId: number;
  normDescription: string;
  refSs: string;
  sNo: string;
  unit: string;
  basisQuantity: number;
  userQuantity: number;
  labourTotal: number;
  materialTotal: number;
  equipmentTotal: number;
  subtotal: number;
  unitRate: number;
  resources: RateAnalysisResource[];
}

export interface MatrixRow {
  sNo: number;
  workItem: string;
  unit: string;
  quantity: number;
  resources: Record<string, number>;
}

export interface MatrixData {
  rows: MatrixRow[];
  columns: string[];
  totals: Record<string, number>;
}

export interface TabulationRow {
  sn: number;
  resourceName: string;
  unit: string;
  measurementQty: number;
  measurementRate: number;
  measurementAmount: number;
  measurementVat: number;
  billQty: number;
  billRate: number;
  billAmount: number;
  billVat: number;
  actualQty: number;
  actualRate: number;
  actualAmount: number;
  actualVat: number;
  remarks: string;
}

export type TransportMode = 'Porter' | 'Tractor' | 'Truck';

export interface TransportMaterial {
  material_name: string;
  unit_weight: number;
  load_category: LoadCategoryName;
  original_cost: number;
  vat: number;
  metalled_cost_per_unit: number;
  gravelled_cost_per_unit: number;
  porter_cost_per_unit: number;
  total_cost_per_unit: number;
}

export type TransportCoefficients = {
  [mode in TransportMode]: Record<LoadCategoryName, { metalled: number; gravelled: number }>;
};

export const LOAD_CATEGORY_OPTIONS = ['Easy', 'Difficult', 'Very Difficult', 'High Volume'] as const;

export type LoadCategoryName = (typeof LOAD_CATEGORY_OPTIONS)[number];

export const DEFAULT_TRANSPORT_COEFFICIENTS: TransportCoefficients = {
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