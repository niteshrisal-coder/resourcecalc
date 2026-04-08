export type ResourceType = 'Labour' | 'Material' | 'Equipment';

export interface Resource {
  name: string;
  quantity: number;
  unit?: string;
  resource_type: ResourceType;
  is_percentage?: boolean;
  percentage_base?: string;
}

export interface Norm {
  id: number;
  description: string;
  unit: string;
  basis_quantity: number;
  type: 'DOR' | 'DUDBC';
  ref_ss?: string;
  resources: Resource[];
}

export interface Rate {
  id: number;
  name: string;
  unit: string;
  rate: number;
  resource_type: ResourceType;
  district?: string;
}
