import React, { useState, useEffect, ChangeEvent } from 'react';
import { ArrowLeft, Plus, Trash2, Edit2, Save, Search, X, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { motion } from 'motion/react';
import { Norm } from '../types';
import { getNorms, getRates } from '../utils/storage';
import { useDeviceType } from '../utils/device';
import * as XLSX from 'xlsx-js-style';

interface Project {
  id: number;
  name: string;
  description: string;
  mode: 'CONTRACTOR' | 'USERS';
  created_at: string;
  items: BOQItem[];
  customRates: CustomRate[];
  customResources: CustomResource[];
  boqSaved?: boolean;
  tabulationData?: TabulationData[];
}

interface BOQItem {
  id: string;
  normId: number;
  estimate_quantity: number;
  measurement_quantity: number;
}

interface CustomRate {
  resourceName: string;
  rate: number;
  unit: string;
}

interface CustomResource {
  normId: number;
  resourceName: string;
  quantity: number;
  unit: string;
  resource_type: string;
}

interface Rate {
  id: number;
  name: string;
  unit: string;
  rate: number;
  resource_type: string;
  apply_vat: boolean;
}

interface TabulationData {
  resourceName: string;
  billRate: number;
  remarks: string;
}

interface ResourceBreakdownItem {
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

interface RateAnalysisResource {
  resourceName: string;
  resourceType: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  isCustomizedRate: boolean;
  isCustomizedQuantity: boolean;
}

interface RateAnalysisItem {
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

interface MatrixRow {
  sNo: number;
  workItem: string;
  unit: string;
  quantity: number;
  resources: Record<string, number>;
}

interface MatrixData {
  rows: MatrixRow[];
  columns: string[];
  totals: Record<string, number>;
}

interface TabulationRow {
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
  actualAmount: number;
  actualVat: number;
  remarks: string;
}

export default function ProjectBOQ({ projectId, onBack }: { projectId: number; onBack: () => void }) {
  const [project, setProject] = useState<Project | null>(null);
  const [norms, setNorms] = useState<Norm[]>([]);
  const [globalRates, setGlobalRates] = useState<Rate[]>([]);
  const [activeTab, setActiveTab] = useState<'boq' | 'breakdown' | 'analysis'>('boq');
  const [isAdding, setIsAdding] = useState(true);
  const [breakdownView, setBreakdownView] = useState<'summary' | 'detailed' | 'tabulation'>('summary');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ quantity: 0 });
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [editRateForm, setEditRateForm] = useState({ rate: 0 });
  const [editingBillRate, setEditingBillRate] = useState<string | null>(null);
  const [editBillRateForm, setEditBillRateForm] = useState({ rate: 0 });
  const { isMobile } = useDeviceType();

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
      items: [...project.items, newItem]
    };

    updateProject(updated);
  };

  const removeItem = (itemId: string) => {
    if (!project || !window.confirm('Delete this item?')) return;

    const updated = {
      ...project,
      items: project.items.filter((i: BOQItem) => i.id !== itemId)
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
      items: project.items.map((item: BOQItem) =>
        item.id === itemId
          ? { ...item, estimate_quantity: newQuantity > 0 ? newQuantity : 0 }
          : item
      )
    };

    updateProject(updated);
  };

  const calculateItemRate = (normId: number): number => {
    const norm = norms.find((n: Norm) => n.id === normId);
    if (!norm || !project) return 0;

    let total = 0;
    norm.resources.forEach((res: any) => {
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
    return unitRate;
  };

  const calculateTotalBOQ = (): number => {
    if (!project) return 0;
    
    return project.items.reduce((total: number, item: BOQItem) => {
      const rate = calculateItemRate(item.normId);
      return total + (rate * item.estimate_quantity);
    }, 0);
  };

  // Resource breakdown for summary view
  const resourceBreakdown = React.useMemo((): ResourceBreakdownItem[] => {
    if (!project) return [];

    const breakdown: Record<string, ResourceBreakdownItem> = {};

    project.items.forEach((item: BOQItem) => {
      const norm = norms.find((n: Norm) => n.id === item.normId);
      if (!norm) return;

      const basis = norm.basis_quantity || 1;

      norm.resources.forEach((res: any) => {
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

  // Rate Analysis data (per work item, based on norm basis quantity)
  const rateAnalysisData = React.useMemo((): RateAnalysisItem[] => {
    if (!project || !norms.length) return [];

    const result: RateAnalysisItem[] = [];

    project.items.forEach((item: BOQItem) => {
      const norm = norms.find((n: Norm) => n.id === item.normId);
      if (!norm) return;

      const basis = norm.basis_quantity || 1;
      let labourTotal = 0;
      let materialTotal = 0;
      let equipmentTotal = 0;

      const resources: RateAnalysisResource[] = norm.resources
        .filter((res: any) => !res.is_percentage)
        .map((res: any) => {
          const customQty = getCustomResourceQuantity(item.normId, res.name);
          const quantity = (customQty !== null ? customQty : res.quantity) / basis;
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

    project.items.forEach((item: BOQItem, idx: number) => {
      const norm = norms.find((n: Norm) => n.id === item.normId);
      if (!norm) return;

      const row: MatrixRow = {
        sNo: idx + 1,
        workItem: `${norm.ref_ss || ''} ${norm.sNo || ''} - ${norm.description}`.trim(),
        unit: norm.unit || '-',
        quantity: item.estimate_quantity,
        resources: {}
      };

      norm.resources.forEach((res: any) => {
        if (!res.is_percentage) {
          const customQty = getCustomResourceQuantity(item.normId, res.name);
          const quantity = (customQty !== null ? customQty : res.quantity) * item.estimate_quantity;
          row.resources[res.name] = quantity;
          allResources.set(res.name, { unit: res.unit || '-', type: res.resource_type });
        }
      });

      rows.push(row);
    });

    const columns = Array.from(allResources.keys()).sort();
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

  // Tabulation Data - based on rateAnalysisData
  const tabulationData = React.useMemo((): TabulationRow[] => {
    if (!rateAnalysisData.length) return [];

    const resourceMap = new Map<string, {
      unit: string,
      measurementQty: number,
      measurementRate: number,
      measurementAmount: number,
      measurementVat: number,
      applyVat: boolean,
      billRate: number,
      remarks: string
    }>();

    rateAnalysisData.forEach((item: RateAnalysisItem) => {
      item.resources.forEach((res: RateAnalysisResource) => {
        const rateInfo = getResourceRate(res.resourceName);
        const measurementAmount = res.amount * item.userQuantity;
        const measurementVat = rateInfo.apply_vat ? measurementAmount * 0.13 : 0;
        
        const existing = resourceMap.get(res.resourceName);
        const savedData = project?.tabulationData?.find((d: TabulationData) => d.resourceName === res.resourceName);
        
        if (existing) {
          existing.measurementQty += res.quantity * item.userQuantity;
          existing.measurementAmount += measurementAmount;
          existing.measurementVat += measurementVat;
        } else {
          resourceMap.set(res.resourceName, {
            unit: res.unit,
            measurementQty: res.quantity * item.userQuantity,
            measurementRate: res.rate,
            measurementAmount: measurementAmount,
            measurementVat: measurementVat,
            applyVat: rateInfo.apply_vat,
            billRate: savedData?.billRate || 0,
            remarks: savedData?.remarks || ''
          });
        }
      });
    });

    const result: TabulationRow[] = Array.from(resourceMap.entries()).map(([name, data], idx: number) => {
      const billAmount = data.billRate ? data.measurementQty * data.billRate : 0;
      const billVat = data.applyVat ? billAmount * 0.13 : 0;
      const actualAmount = Math.min(data.measurementAmount, billAmount);
      const actualVat = data.applyVat ? actualAmount * 0.13 : 0;

      return {
        sn: idx + 1,
        resourceName: name,
        unit: data.unit,
        measurementQty: data.measurementQty,
        measurementRate: data.measurementRate,
        measurementAmount: data.measurementAmount,
        measurementVat: data.measurementVat,
        billQty: data.measurementQty,
        billRate: data.billRate,
        billAmount: billAmount,
        billVat: billVat,
        actualAmount: actualAmount,
        actualVat: actualVat,
        remarks: data.remarks
      };
    });

    return result;
  }, [rateAnalysisData, project?.tabulationData]);

  const updateTabulationBillRate = (resourceName: string, newRate: number) => {
    if (!project) return;
    
    const existingTabData = project.tabulationData || [];
    const existingIndex = existingTabData.findIndex((d: TabulationData) => d.resourceName === resourceName);
    
    let updatedData: TabulationData[];
    if (existingIndex >= 0) {
      updatedData = [...existingTabData];
      updatedData[existingIndex] = { ...updatedData[existingIndex], billRate: newRate };
    } else {
      updatedData = [...existingTabData, { resourceName, billRate: newRate, remarks: '' }];
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
      updatedData = [...existingTabData, { resourceName, billRate: 0, remarks }];
    }
    
    const updated = { ...project, tabulationData: updatedData };
    updateProject(updated);
  };

  const filteredNorms = norms.filter((norm: Norm) =>
    norm.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    norm.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (norm.ref_ss && norm.ref_ss.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const exportToExcel = () => {
    if (!project) return;

    let sheetData: any[][] = [];
    let sheetName = '';

    if (activeTab === 'boq') {
      sheetName = 'BOQ_Items';
      sheetData = [
        ['S.N.', 'Work Item (Description)', 'Unit', 'Quantity', 'Rate (Rs.)', 'Amount (Rs.)', 'Ref to SS'],
        ...project.items.map((item: BOQItem, idx: number) => {
          const norm = norms.find((n: Norm) => n.id === item.normId);
          const rate = calculateItemRate(item.normId);
          const total = rate * item.estimate_quantity;
          return [idx + 1, norm?.description || '', norm?.unit || '', item.estimate_quantity, rate.toFixed(2), total.toFixed(2), norm?.ref_ss || ''];
        }),
        [],
        ['Total BOQ:', '', '', '', '', calculateTotalBOQ().toFixed(2), '']
      ];
    } else if (activeTab === 'breakdown') {
      if (breakdownView === 'summary') {
        sheetName = 'Resource_Breakdown_Summary';
        sheetData = [
          ['Type', 'Resource Name', 'Unit', 'Total Quantity', 'Rate (Rs.)', 'Total Amount (Rs.)', 'Customized'],
          ...resourceBreakdown.map((res: ResourceBreakdownItem) => [
            res.type, res.name, res.unit, res.quantity.toFixed(3), res.rate.toFixed(2), res.totalAmount.toFixed(2), res.isCustomized ? 'Yes' : 'No'
          ]),
          [],
          ['Total:', '', '', '', '', resourceBreakdown.reduce((acc: number, r: ResourceBreakdownItem) => acc + r.totalAmount, 0).toFixed(2), '']
        ];
      } else if (breakdownView === 'detailed') {
        sheetName = 'Resource_Breakdown_Detailed';
        const headers = ['S.N.', 'Work Item', 'Unit', 'Qty', ...resourceMatrixData.columns];
        sheetData = [headers];
        
        resourceMatrixData.rows.forEach((row: MatrixRow) => {
          const rowData = [row.sNo, row.workItem, row.unit, row.quantity];
          resourceMatrixData.columns.forEach((col: string) => {
            rowData.push(row.resources[col]?.toFixed(3) || '-');
          });
          sheetData.push(rowData);
        });
        
        const totalRow = ['', 'TOTAL', '', ''];
        resourceMatrixData.columns.forEach((col: string) => {
          totalRow.push(resourceMatrixData.totals[col]?.toFixed(3) || '-');
        });
        sheetData.push(totalRow);
      } else if (breakdownView === 'tabulation') {
        sheetName = 'Tabulation_Chart';
        sheetData = [
          ['SN', 'Materials & Labours', 'Unit', 
           'As Per Measurement Qty', 'As Per Measurement Rate', 'As Per Measurement Amount', 'As Per Measurement VAT',
           'As Per Bill Qty', 'As Per Bill Rate', 'As Per Bill Amount', 'As Per Bill VAT',
           'Actual Cost Amount', 'Actual Cost VAT', 'Remarks'],
          ...tabulationData.map((item: TabulationRow) => [
            item.sn, item.resourceName, item.unit,
            item.measurementQty.toFixed(3), item.measurementRate.toFixed(2), item.measurementAmount.toFixed(2), item.measurementVat.toFixed(2),
            item.billQty.toFixed(3), item.billRate.toFixed(2), item.billAmount.toFixed(2), item.billVat.toFixed(2),
            item.actualAmount.toFixed(2), item.actualVat.toFixed(2), item.remarks
          ])
        ];
        
        const totalMeasurementAmount = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.measurementAmount, 0);
        const totalMeasurementVat = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.measurementVat, 0);
        const totalBillAmount = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.billAmount, 0);
        const totalBillVat = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.billVat, 0);
        const totalActualAmount = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.actualAmount, 0);
        const totalActualVat = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.actualVat, 0);
        
        sheetData.push(['Total', '', '', '', '', totalMeasurementAmount.toFixed(2), totalMeasurementVat.toFixed(2), 
          '', '', totalBillAmount.toFixed(2), totalBillVat.toFixed(2),
          totalActualAmount.toFixed(2), totalActualVat.toFixed(2), '']);
      }
    } else if (activeTab === 'analysis') {
      sheetName = 'Rate_Analysis';

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws: XLSX.WorkSheet = {};

      // Column widths
      ws['!cols'] = [
        { wch: 30 }, // Resource
        { wch: 12 },  // Type
        { wch: 10 },  // Unit
        { wch: 12 },  // Quantity
        { wch: 14 },  // Rate (Rs.)
        { wch: 16 },  // Amount (Rs.)
        { wch: 16 }   // Sub Total
      ];

      let currentRow = 0;

      rateAnalysisData.forEach((item: RateAnalysisItem, itemIndex: number) => {
        // Add spacer row between work items (except first)
        if (itemIndex > 0) {
          currentRow += 2;
        }

        // Work Item Header (merged cells)
        const workItemText = `${item.refSs || ''} ${item.sNo || ''} - ${item.normDescription}`;
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = {
          v: workItemText,
          t: 's',
          s: {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '1E293B' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
          }
        };
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 1 })] = {
          v: `User Qty: ${item.userQuantity} ${item.unit}`,
          t: 's',
          s: {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '1E293B' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
          }
        };
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 2 })] = {
          v: `Basis Qty: ${item.basisQuantity} ${item.unit}`,
          t: 's',
          s: {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '1E293B' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
          }
        };
        // Merge cells for header
        if (!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 6 } });

        currentRow++;

        // Column headers
        const headers = ['Resource', 'Type', 'Unit', 'Quantity', 'Rate (Rs.)', 'Amount (Rs.)', 'Sub Total'];
        headers.forEach((header, colIndex) => {
          ws[XLSX.utils.encode_cell({ r: currentRow, c: colIndex })] = {
            v: header,
            t: 's',
            s: {
              font: { bold: true },
              fill: { fgColor: { rgb: 'F1F5F9' } },
              alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
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

        // Group resources by type
        const labourResources = item.resources.filter(r => r.resourceType === 'Labour');
        const materialResources = item.resources.filter(r => r.resourceType === 'Material');
        const equipmentResources = item.resources.filter(r => r.resourceType === 'Equipment');

        // Labour rows
        if (labourResources.length > 0) {
          labourResources.forEach((resource) => {
            const rowData = [
              resource.resourceName,
              resource.resourceType,
              resource.unit,
              resource.quantity,
              resource.rate,
              resource.amount,
              '' // Sub Total column empty for individual rows
            ];

            rowData.forEach((value, colIndex) => {
              const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
              let displayValue = value;
              
              ws[cell] = {
                v: typeof displayValue === 'number' ? displayValue : displayValue,
                t: typeof displayValue === 'number' ? 'n' : 's',
                s: {
                  fill: { fgColor: { rgb: 'DBEAFE' } },
                  alignment: { horizontal: colIndex > 2 ? 'right' : 'left', vertical: 'center', wrapText: true },
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
          });

          // Labour Sub Total
          ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = {
            v: 'Sub Total (Labour):',
            t: 's',
            s: {
              font: { bold: true },
              fill: { fgColor: { rgb: 'BFDBFE' } },
              alignment: { horizontal: 'right', vertical: 'center', wrapText: true },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            }
          };
          ws[XLSX.utils.encode_cell({ r: currentRow, c: 6 })] = {
            v: item.labourTotal * (item.userQuantity / item.basisQuantity),
            t: 'n',
            s: {
              font: { bold: true },
              fill: { fgColor: { rgb: 'BFDBFE' } },
              alignment: { horizontal: 'right', vertical: 'center', wrapText: true },
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

        // Material rows
        if (materialResources.length > 0) {
          materialResources.forEach((resource) => {
            const rowData = [
              resource.resourceName,
              resource.resourceType,
              resource.unit,
              resource.quantity,
              resource.rate,
              resource.amount,
              '' // Sub Total column empty for individual rows
            ];

            rowData.forEach((value, colIndex) => {
              const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
              let displayValue = value;
              
              ws[cell] = {
                v: typeof displayValue === 'number' ? displayValue : displayValue,
                t: typeof displayValue === 'number' ? 'n' : 's',
                s: {
                  fill: { fgColor: { rgb: 'D1FAE5' } },
                  alignment: { horizontal: colIndex > 2 ? 'right' : 'left', vertical: 'center', wrapText: true },
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
          });

          // Material Sub Total
          ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = {
            v: 'Sub Total (Material):',
            t: 's',
            s: {
              font: { bold: true },
              fill: { fgColor: { rgb: 'A7F3D0' } },
              alignment: { horizontal: 'right', vertical: 'center', wrapText: true },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            }
          };
          ws[XLSX.utils.encode_cell({ r: currentRow, c: 6 })] = {
            v: item.materialTotal * (item.userQuantity / item.basisQuantity),
            t: 'n',
            s: {
              font: { bold: true },
              fill: { fgColor: { rgb: 'A7F3D0' } },
              alignment: { horizontal: 'right', vertical: 'center', wrapText: true },
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

        // Equipment rows
        if (equipmentResources.length > 0) {
          equipmentResources.forEach((resource) => {
            const rowData = [
              resource.resourceName,
              resource.resourceType,
              resource.unit,
              resource.quantity,
              resource.rate,
              resource.amount,
              '' // Sub Total column empty for individual rows
            ];

            rowData.forEach((value, colIndex) => {
              const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
              let displayValue = value;
              
              ws[cell] = {
                v: typeof displayValue === 'number' ? displayValue : displayValue,
                t: typeof displayValue === 'number' ? 'n' : 's',
                s: {
                  fill: { fgColor: { rgb: 'FFEDD5' } },
                  alignment: { horizontal: colIndex > 2 ? 'right' : 'left', vertical: 'center', wrapText: true },
                  border: {
                    top: { style: 'thin', color: { rgb: '000000' } },
                    bottom: { style: 'thin', color: { rgb: '000000' } },
                    right: { style: 'thin', color: { rgb: '000000' } }
                  }
                }
              };
            });
            currentRow++;
          });

          // Equipment Sub Total
          ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = {
            v: 'Sub Total (Equipment):',
            t: 's',
            s: {
              font: { bold: true },
              fill: { fgColor: { rgb: 'FED7AA' } },
              alignment: { horizontal: 'right', vertical: 'center', wrapText: true },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            }
          };
          ws[XLSX.utils.encode_cell({ r: currentRow, c: 6 })] = {
            v: item.equipmentTotal * (item.userQuantity / item.basisQuantity),
            t: 'n',
            s: {
              font: { bold: true },
              fill: { fgColor: { rgb: 'FED7AA' } },
              alignment: { horizontal: 'right', vertical: 'center', wrapText: true },
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

        // Total row
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 4 })] = {
          v: 'TOTAL:',
          t: 's',
          s: {
            font: { bold: true },
            fill: { fgColor: { rgb: 'F1F5F9' } },
            alignment: { horizontal: 'right', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          }
        };
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = {
          v: item.subtotal * (item.userQuantity / item.basisQuantity),
          t: 'n',
          s: {
            font: { bold: true },
            fill: { fgColor: { rgb: 'F1F5F9' } },
            alignment: { horizontal: 'right', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          }
        };
        currentRow++;

        // Unit Rate row
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 4 })] = {
          v: 'Unit Rate:',
          t: 's',
          s: {
            font: { bold: true },
            fill: { fgColor: { rgb: 'F8FAFC' } },
            alignment: { horizontal: 'right', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          }
        };
        ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = {
          v: item.unitRate,
          t: 'n',
          s: {
            font: { bold: true },
            fill: { fgColor: { rgb: 'F8FAFC' } },
            alignment: { horizontal: 'right', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          }
        };
        currentRow++;

        // Contractor overhead row (if applicable)
        if (project.mode === 'CONTRACTOR') {
          ws[XLSX.utils.encode_cell({ r: currentRow, c: 4 })] = {
            v: '+15% Contractor Overhead:',
            t: 's',
            s: {
              font: { bold: true },
              fill: { fgColor: { rgb: 'FEF3C7' } },
              alignment: { horizontal: 'right', vertical: 'center', wrapText: true },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            }
          };
          ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = {
            v: item.subtotal * 0.15 * (item.userQuantity / item.basisQuantity),
            t: 'n',
            s: {
              font: { bold: true },
              fill: { fgColor: { rgb: 'FEF3C7' } },
              alignment: { horizontal: 'right', vertical: 'center', wrapText: true },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            }
          };
          currentRow++;

          // Final total row for contractor
          ws[XLSX.utils.encode_cell({ r: currentRow, c: 4 })] = {
            v: 'FINAL TOTAL:',
            t: 's',
            s: {
              font: { bold: true, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '1E293B' } },
              alignment: { horizontal: 'right', vertical: 'center', wrapText: true },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            }
          };
          ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = {
            v: item.unitRate,
            t: 'n',
            s: {
              font: { bold: true, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '1E293B' } },
              alignment: { horizontal: 'right', vertical: 'center', wrapText: true },
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
      });

      // Set worksheet range
      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: currentRow - 1, c: 6 } });

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${project.name}_${sheetName}.xlsx`);
    }
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

  const totalAmount = calculateTotalBOQ();

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
      </div>

      {/* Tab Content */}
      {activeTab === 'boq' && (
        <>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-black/5 shadow-sm">
              <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">Total BOQ</p>
              <p className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tighter"> {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-black/5 shadow-sm">
              <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">Items</p>
              <p className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tighter">{project.items.length}</p>
            </div>
          </div>

          {isAdding ? (
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

          {/* BOQ Table */}
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-black/5 overflow-hidden">
            <div className="px-3 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#1E293B]">
                BOQ Items ({project.items.length})
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
                      <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40 text-center w-24">Quantity</th>
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
                          <td className="px-3 py-3 text-right text-sm font-mono"> {rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-3 text-right text-sm font-bold"> {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-black/20">
                <p className="text-sm">No items in BOQ. Tap on a norm above to add.</p>
              </div>
            )}
          </div>
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
                  onClick={() => setBreakdownView('summary')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                    breakdownView === 'summary'
                      ? 'bg-[#1E293B] text-white shadow-sm'
                      : 'text-[#333333]/60 hover:text-[#1E293B]'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setBreakdownView('detailed')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                    breakdownView === 'detailed'
                      ? 'bg-[#1E293B] text-white shadow-sm'
                      : 'text-[#333333]/60 hover:text-[#1E293B]'
                  }`}
                >
                  Detailed
                </button>
                <button
                  onClick={() => setBreakdownView('tabulation')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                    breakdownView === 'tabulation'
                      ? 'bg-[#1E293B] text-white shadow-sm'
                      : 'text-[#333333]/60 hover:text-[#1E293B]'
                  }`}
                >
                  Tabulation
                </button>
              </div>

              {breakdownView === 'summary' && (
                resourceBreakdown.length > 0 ? (
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
                        {resourceBreakdown.map((res: ResourceBreakdownItem, idx: number) => {
                          return (
                            <tr key={idx} className="hover:bg-black/5 transition-colors">
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                                  res.type === 'Labour' ? 'bg-blue-100 text-blue-700' : 
                                  res.type === 'Material' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {res.type}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-bold">{res.name}</span>
                                {res.isCustomized && (
                                  <span className="ml-2 text-[8px] bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded">Custom</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-black/60">{res.unit}</td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm font-bold">
                                  {res.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-mono"> {res.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600"> {res.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="px-4 py-3 text-center">
                                {/* Action column removed - quantity editing disabled */}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#F5F5F0] border-t border-black/10">
                          <td colSpan={4} className="px-4 py-3 text-sm font-bold uppercase tracking-widest text-right">Total</td>
                          <td className="px-4 py-3 text-lg font-bold text-emerald-600 text-right">
                             {resourceBreakdown.reduce((acc: number, r: ResourceBreakdownItem) => acc + r.totalAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-black/20">
                    <p className="text-sm">No resources to display.</p>
                  </div>
                )
              )}

              {breakdownView === 'detailed' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px] bg-white rounded-2xl overflow-hidden border border-black/5">
                    <thead>
                      <tr className="bg-[#1E293B] text-white">
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">S.N.</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Work Item</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Unit</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Qty</th>
                        {resourceMatrixData.columns.map((col: string) => (
                          <th key={col} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest min-w-[120px]">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {resourceMatrixData.rows.map((row: MatrixRow) => (
                        <tr key={row.sNo} className="hover:bg-black/5">
                          <td className="px-4 py-3 text-sm">{row.sNo}</td>
                          <td className="px-4 py-3 text-sm font-medium">{row.workItem}</td>
                          <td className="px-4 py-3 text-sm">{row.unit}</td>
                          <td className="px-4 py-3 text-sm font-bold">{row.quantity}</td>
                          {resourceMatrixData.columns.map((col: string) => (
                            <td key={col} className="px-4 py-3 text-sm">
                              {row.resources[col] !== undefined ? row.resources[col].toFixed(3) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#F5F5F0] border-t border-black/10 font-bold">
                        <td colSpan={4} className="px-4 py-3 text-sm uppercase tracking-widest">Total</td>
                        {resourceMatrixData.columns.map((col: string) => (
                          <td key={col} className="px-4 py-3 text-sm">
                            {resourceMatrixData.totals[col]?.toFixed(3) || '-'}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {breakdownView === 'tabulation' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1200px] bg-white rounded-2xl overflow-hidden border border-black/5">
                    <thead>
                      <tr className="bg-[#1E293B] text-white">
                        <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest" rowSpan={2}>SN</th>
                        <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest" rowSpan={2}>Materials & Labours</th>
                        <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest" rowSpan={2}>Unit</th>
                        <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-center" colSpan={4}>As Per Measurement</th>
                        <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-center" colSpan={4}>As Per Bill</th>
                        <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-center" colSpan={2}>Actual Cost</th>
                        <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest" rowSpan={2}>Remarks</th>
                      </tr>
                      <tr className="bg-[#1E293B] text-white">
                        <th className="px-3 py-1 text-[9px]">Qty</th>
                        <th className="px-3 py-1 text-[9px]">Rate</th>
                        <th className="px-3 py-1 text-[9px]">Amount</th>
                        <th className="px-3 py-1 text-[9px]">VAT</th>
                        <th className="px-3 py-1 text-[9px]">Qty</th>
                        <th className="px-3 py-1 text-[9px]">Rate</th>
                        <th className="px-3 py-1 text-[9px]">Amount</th>
                        <th className="px-3 py-1 text-[9px]">VAT</th>
                        <th className="px-3 py-1 text-[9px]">Amount</th>
                        <th className="px-3 py-1 text-[9px]">VAT</th>
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
                            <td className="px-3 py-2 text-sm text-right">{item.billQty.toFixed(3)}</td>
                            <td className="px-3 py-2 text-sm text-right">
                              {isEditingBill ? (
                                <input
                                  type="number"
                                  value={editBillRateForm.rate}
onChange={(e: ChangeEvent<HTMLInputElement>) => setEditBillRateForm({ rate: parseFloat(e.target.value) || 0 })}                                  className="w-24 p-1 border border-black/10 rounded-lg text-sm text-right"
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
                                    setEditBillRateForm({ rate: item.billRate });
                                  }}
                                  className="hover:bg-black/5 px-2 py-1 rounded-lg transition-colors"
                                >
                                  {item.billRate.toFixed(2)}
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-2 text-sm text-right">{item.billAmount.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-right">{item.billVat.toFixed(2)}</td>
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
                      <tr className="bg-[#F5F5F0] border-t border-black/10 font-bold">
                        <td colSpan={3} className="px-3 py-2 text-sm uppercase tracking-widest text-right">Total</td>
                        <td colSpan={2}></td>
                        <td className="px-3 py-2 text-sm text-right">
                          {tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.measurementAmount, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-sm text-right">
                          {tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.measurementVat, 0).toFixed(2)}
                        </td>
                        <td colSpan={2}></td>
                        <td className="px-3 py-2 text-sm text-right">
                          {tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.billAmount, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-sm text-right">
                          {tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.billVat, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-sm text-right">
                          {tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.actualAmount, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-sm text-right">
                          {tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.actualVat, 0).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
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
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-left min-w-[200px]">Work Item</th>
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
                            {resIdx === 0 && (
                              <td rowSpan={labourResources.length} className="px-4 py-3 align-top text-sm font-bold text-blue-700 bg-blue-50/50">
                                {item.refSs} {item.sNo} - {item.normDescription}
                              </td>
                            )}
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
)}    </div>
  );
}