import { useState, useEffect } from 'react';
import { Project, BOQItem, CustomRate, CustomResource, TabulationData, TransportMaterial } from '../types/boq';
import { Norm } from '../types';

type TransportMaterialField = keyof TransportMaterial;
type TransportMode = 'Tractor' | 'Truck';

export function useProjectData(projectId: number) {
  const [project, setProject] = useState<Project | null>(null);
  const [norms, setNorms] = useState<Norm[]>([]);
  const [globalRates, setGlobalRates] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('resourcecalc_projects');
    const projects: Project[] = stored ? JSON.parse(stored) : [];
    const foundProject = projects.find((p: Project) => p.id === projectId);

    if (foundProject) {
      setProject(foundProject);
    }

    // Import these functions
    import('../utils/storage').then(({ getNorms, getRates }) => {
      setNorms(getNorms());
      setGlobalRates(getRates());
    });
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
      items: [...(project.items || []), newItem]
    };

    updateProject(updated);
  };

  const removeItem = (itemId: string) => {
    if (!project || !window.confirm('Delete this item?')) return;

    const updated = {
      ...project,
      items: (project.items || []).filter((i: BOQItem) => i.id !== itemId)
    };

    updateProject(updated);
  };

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (!project) return;

    const updated = {
      ...project,
      items: (project.items || []).map((item: BOQItem) =>
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
      items: (project.items || []).map((item: BOQItem) =>
        item.id === itemId
          ? { ...item, measurement_quantity: newQuantity >= 0 ? newQuantity : 0 }
          : item
      )
    };

    updateProject(updated);
  };

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

  // Transport related functions
  const updateTransportMaterial = (materialName: string, field: TransportMaterialField, value: any) => {
    if (!project) return;

    const updatedMaterials = (project.transportMaterials || []).map((material) =>
      material.material_name === materialName ? { ...material, [field]: value } : material
    );

    const updated = { ...project, transportMaterials: updatedMaterials };
    updateProject(updated);
  };

  const updateTransportMaterialByIndex = (index: number, field: TransportMaterialField, value: any) => {
    if (!project) return;

    const updatedMaterials = [...(project.transportMaterials || [])];
    if (updatedMaterials[index]) {
      updatedMaterials[index] = { ...updatedMaterials[index], [field]: value };
      const updated = { ...project, transportMaterials: updatedMaterials };
      updateProject(updated);
    }
  };

  const addTransportMaterial = () => {
    if (!project) return;

    const newMaterial: TransportMaterial = {
      material_name: `Material ${Date.now()}`,
      unit_weight: 0,
      load_category: 'Easy',
      metalled_cost_per_unit: 0,
      gravelled_cost_per_unit: 0,
      porter_cost_per_unit: 0,
      total_cost_per_unit: 0
    };

    const updated = {
      ...project,
      transportMaterials: [...(project.transportMaterials || []), newMaterial]
    };
    updateProject(updated);
  };

  const removeTransportMaterial = (materialName: string) => {
    if (!project) return;

    const updated = {
      ...project,
      transportMaterials: (project.transportMaterials || []).filter((material) => material.material_name !== materialName)
    };
    updateProject(updated);
  };

  const updateTransportMode = (mode: TransportMode) => {
    if (!project) return;
    const updated = { ...project, transportMode: mode };
    updateProject(updated);
  };

  const updateTransportCoefficients = (coefficients: any) => {
    if (!project) return;
    const updated = { ...project, transportCoefficients: coefficients };
    updateProject(updated);
  };

  const updateTransportDistances = (distances: { porterDistance: number; gravelledDistance: number; metalledDistance: number }) => {
    if (!project) return;
    const updated = { ...project, transportDistances: distances };
    updateProject(updated);
  };

  return {
    project,
    norms,
    globalRates,
    updateProject,
    handleSaveBOQ,
    updateCustomRate,
    getCustomResourceQuantity,
    updateCustomResourceQuantity,
    addItem,
    removeItem,
    updateItemQuantity,
    updateMeasurementQuantity,
    updateTabulationBillRate,
    updateTabulationBillQty,
    updateTabulationRemarks,
    updateTransportMaterial,
    updateTransportMaterialByIndex,
    addTransportMaterial,
    removeTransportMaterial,
    updateTransportMode,
    updateTransportCoefficients,
    updateTransportDistances
  };
}