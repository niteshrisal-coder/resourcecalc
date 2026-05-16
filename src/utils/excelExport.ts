import * as XLSX from 'xlsx';
import { Project, ResourceBreakdownItem, MatrixData, TabulationRow, RateAnalysisItem, TransportMaterial } from '../types/boq';
import { Norm } from '../types';

export function exportToExcel(
  project: Project,
  activeTab: 'boq' | 'breakdown' | 'analysis' | 'materials',
  breakdownSubView: 'summary' | 'detailed' | 'tabulation',
  sharedMode: 'estimate' | 'measurement',
  norms: Norm[],
  resourceBreakdownEstimate: ResourceBreakdownItem[],
  resourceBreakdownMeasurement: ResourceBreakdownItem[],
  resourceMatrixData: MatrixData,
  resourceMatrixMeasurementData: MatrixData,
  tabulationData: TabulationRow[],
  rateAnalysisData: RateAnalysisItem[],
  transportMaterials: TransportMaterial[],
  calculateItemRate: (normId: number) => number,
  calculateTotalBOQ: () => number,
  calculateMeasurementTotal: () => number
) {
  const wb = XLSX.utils.book_new();

  if (activeTab === 'boq') {
    exportBOQ(wb, project, norms, calculateItemRate, calculateTotalBOQ);
  } else if (activeTab === 'breakdown') {
    if (breakdownSubView === 'summary') {
      exportSummary(wb, sharedMode, resourceBreakdownEstimate, resourceBreakdownMeasurement, project);
    } else if (breakdownSubView === 'detailed') {
      exportDetailed(wb, sharedMode, resourceMatrixData, resourceMatrixMeasurementData);
    } else if (breakdownSubView === 'tabulation') {
      exportTabulation(wb, tabulationData);
    }
  } else if (activeTab === 'analysis') {
    exportRateAnalysis(wb, rateAnalysisData, project);
  } else if (activeTab === 'materials') {
    exportMaterials(wb, project, transportMaterials);
  }

  XLSX.writeFile(wb, `${project.name}_${activeTab}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`);
}

function exportBOQ(
  wb: XLSX.WorkBook,
  project: Project,
  norms: Norm[],
  calculateItemRate: (normId: number) => number,
  calculateTotalBOQ: () => number
) {
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
  project.items.forEach((item, idx) => {
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

function exportSummary(
  wb: XLSX.WorkBook,
  sharedMode: 'estimate' | 'measurement',
  resourceBreakdownEstimate: ResourceBreakdownItem[],
  resourceBreakdownMeasurement: ResourceBreakdownItem[],
  project: Project
) {
  const data = (sharedMode === 'estimate' ? resourceBreakdownEstimate : resourceBreakdownMeasurement)
    .map((item: ResourceBreakdownItem) => ({
      ...item,
      totalAmount: item.quantity * (project.mode === 'USERS' && item.apply_vat ? item.rate * 1.13 : item.rate)
    }))
    .sort((a: ResourceBreakdownItem, b: ResourceBreakdownItem) => {
      const order = { Labour: 1, Material: 2, Equipment: 3 };
      return (order[a.type as keyof typeof order] || 99) - (order[b.type as keyof typeof order] || 99) || a.name.localeCompare(b.name);
    });

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

function exportDetailed(
  wb: XLSX.WorkBook,
  sharedMode: 'estimate' | 'measurement',
  resourceMatrixData: MatrixData,
  resourceMatrixMeasurementData: MatrixData
) {
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
  matrix.rows.forEach((row) => {
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

function exportTabulation(wb: XLSX.WorkBook, tabulationData: TabulationRow[]) {
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

function exportRateAnalysis(wb: XLSX.WorkBook, rateAnalysisData: RateAnalysisItem[], project: Project) {
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

function exportMaterials(wb: XLSX.WorkBook, project: Project, transportMaterials: TransportMaterial[]) {
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

  // Distances - assuming these are passed or calculated
  currentRow += 2;
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { v: 'Porter Distance (km):', t: 's', s: { font: { bold: true } } };
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 1 })] = { v: 0, t: 'n' }; // Need to pass these values
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 2 })] = { v: '0.00 kosh', t: 's' };
  currentRow++;
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { v: 'Gravelled Distance (km):', t: 's', s: { font: { bold: true } } };
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 1 })] = { v: 0, t: 'n' };
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 2 })] = { v: '0.00 kosh', t: 's' };
  currentRow++;
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { v: 'Metalled Distance (km):', t: 's', s: { font: { bold: true } } };
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 1 })] = { v: 0, t: 'n' };
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 2 })] = { v: '0.00 kosh', t: 's' };

  // Set worksheet range
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: currentRow, c: 12 } });

  XLSX.utils.book_append_sheet(wb, ws, 'Materials_Transportation');
}