import { Norm } from '../types';
import { Project, BOQItem, CustomRate, CustomResource, Rate, ResourceBreakdownItem, RateAnalysisItem, RateAnalysisResource, MatrixData, MatrixRow, TabulationRow, TabulationData, TransportMaterial } from '../types/boq';

export function useBOQCalculations(
  project: Project | null,
  norms: Norm[],
  globalRates: Rate[] = [],
  sharedMode: 'estimate' | 'measurement'
) {
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

  const getResourceRate = (resourceName: string, resourceType?: string): { rate: number; unit: string; apply_vat: boolean } => {
    if (!project) return { rate: 0, unit: '', apply_vat: false };

    const normalizedName = resourceName.trim().toLowerCase();
    const customRate = project.customRates?.find((r: CustomRate) => r.resourceName.trim().toLowerCase() === normalizedName);
    const exactGlobalRate = globalRates.find((r: Rate) => r.name.trim().toLowerCase() === normalizedName && r.resource_type === resourceType);
    const fallbackGlobalRate = globalRates.find((r: Rate) => r.name.trim().toLowerCase() === normalizedName);
    const globalRate = exactGlobalRate || fallbackGlobalRate;
    const rateSource = customRate || globalRate;
    const unit = rateSource?.unit || '';
    const apply_vat = customRate ? false : globalRate?.apply_vat || false;

    if (resourceType === 'Material') {
      const transportMaterial = project.transportMaterials?.find((m: TransportMaterial) => m.material_name.trim().toLowerCase() === normalizedName);
      const materialBaseRate = rateSource?.rate || 0;
      const transportCost = transportMaterial?.total_cost_per_unit || 0;
      const baseRate = materialBaseRate + transportCost;
      const rate = project.mode === 'USERS'
        ? baseRate + (transportMaterial?.vat || 0) + (apply_vat ? materialBaseRate * 0.13 : 0)
        : baseRate;

      return { rate, unit, apply_vat: false };
    }

    const baseRate = rateSource?.rate || 0;
    return {
      rate: baseRate,
      unit,
      apply_vat
    };
  };

  const getCustomResourceQuantity = (normId: number, resourceName: string): number | null => {
    if (!project || !project.customResources) return null;
    const custom = project.customResources.find((r: CustomResource) => r.normId === normId && r.resourceName === resourceName);
    return custom ? custom.quantity : null;
  };

  const calculateItemRate = (normId: number): number => {
    const norm = norms.find((n: Norm) => n.id === normId);
    if (!norm || !project) return 0;

    let total = 0;
    safeResources(norm.resources).forEach((res: any) => {
      if (!res.is_percentage) {
        const customQty = getCustomResourceQuantity(normId, res.name);
        const quantity = customQty !== null ? customQty : res.quantity;
        const rateInfo = getResourceRate(res.name, res.resource_type);
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

  const calculateMeasurementTotal = (): number => {
    if (!project) return 0;
    return safeItems(project.items).reduce((total: number, item: BOQItem) => {
      const rate = calculateItemRate(item.normId);
      return total + (rate * item.measurement_quantity);
    }, 0);
  };

  const resourceBreakdownEstimate: ResourceBreakdownItem[] = (() => {
    if (!project) return [];

    const breakdown: Record<string, ResourceBreakdownItem> = {};

    safeItems(project.items).forEach((item: BOQItem) => {
      const norm = norms.find((n: Norm) => n.id === item.normId);
      if (!norm) return;

      const basis = norm.basis_quantity || 1;

      safeResources(norm.resources).forEach((res: any) => {
        if (!res.is_percentage) {
          const key = `${res.resource_type}-${res.name}`;
          const rateInfo = getResourceRate(res.name, res.resource_type);
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
  })();

  const resourceBreakdownMeasurement: ResourceBreakdownItem[] = (() => {
    if (!project) return [];

    const breakdown: Record<string, ResourceBreakdownItem> = {};

    safeItems(project.items).forEach((item: BOQItem) => {
      const norm = norms.find((n: Norm) => n.id === item.normId);
      if (!norm) return;

      const basis = norm.basis_quantity || 1;

      safeResources(norm.resources).forEach((res: any) => {
        if (!res.is_percentage) {
          const key = `${res.resource_type}-${res.name}`;
          const rateInfo = getResourceRate(res.name, res.resource_type);
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
  })();

  const rateAnalysisData: RateAnalysisItem[] = (() => {
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
          const rateInfo = getResourceRate(res.name, res.resource_type);
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
  })();

  const resourceMatrixData: MatrixData = (() => {
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
  })();

  const resourceMatrixMeasurementData: MatrixData = (() => {
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
  })();

  const tabulationData: TabulationRow[] = (() => {
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
        const type = project?.tabulationData?.find((d: TabulationData) => d.resourceName === resourceName)?.resource_type;
        const rateInfo = getResourceRate(resourceName, type);
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
  })();

  return {
    calculateItemRate,
    calculateTotalBOQ,
    calculateMeasurementTotal,
    resourceBreakdownEstimate,
    resourceBreakdownMeasurement,
    rateAnalysisData,
    resourceMatrixData,
    resourceMatrixMeasurementData,
    tabulationData,
    getResourceRate,
    getCustomResourceQuantity
  };
}