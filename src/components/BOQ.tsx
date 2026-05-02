import React, { useState, useEffect } from 'react';
import { Trash2, Calculator, X, Search, LayoutList, TableProperties, Download } from 'lucide-react';
import { Norm } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as HamoNepaliPatro from 'hamro-nepali-patro';

interface BOQItem {
  id: string;
  normId: number;
  norm: Norm;
  quantity: number;
}

interface DetailedRow {
  id: string;
  sNo: number;
  description: string;
  unit: string;
  quantity: number;
  resources: Map<string, number>;
}

export default function BOQ({ norms }: { norms: Norm[] }) {
  const [items, setItems] = useState<BOQItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [tempQuantity, setTempQuantity] = useState<string>('');
  const [selectedNormForModal, setSelectedNormForModal] = useState<Norm | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');

  useEffect(() => {
    const saved = localStorage.getItem('boq_items');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setItems(parsed);
      } catch (e) {
        console.error('Failed to load BOQ', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('boq_items', JSON.stringify(items));
  }, [items]);

  const addItem = (norm: Norm, quantity: number = 1) => {
    const newItem: BOQItem = {
      id: Date.now().toString(),
      normId: norm.id,
      norm: norm,
      quantity: quantity
    };
    setItems([...items, newItem]);
    setSearch('');
    setTempQuantity('');
    setSelectedNormForModal(null);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItemQuantity = (id: string, newQuantity: number) => {
    setItems(items.map(item =>
      item.id === id
        ? { ...item, quantity: newQuantity > 0 ? newQuantity : 0 }
        : item
    ));
  };

  const clearAll = () => {
    if (confirm('Are you sure you want to clear all BOQ items?')) {
      setItems([]);
    }
  };

  const clearSearch = () => {
    setSearch('');
  };

  const handleModalAdd = () => {
    if (selectedNormForModal) {
      const qty = parseFloat(tempQuantity);
      if (!isNaN(qty) && qty > 0) {
        addItem(selectedNormForModal, qty);
        setShowAddModal(false);
      }
    }
  };

const getFilteredNorms = () => {
  const searchLower = search.toLowerCase().trim();
  const sortedNorms = norms.slice().sort((a, b) => a.id - b.id);
  
  if (!searchLower) return sortedNorms;

  const normTypes = ['dor', 'dudbc'];
  let typeFilter: 'DOR' | 'DUDBC' | null = null;
  let searchTerm = searchLower;

  for (const type of normTypes) {
    if (searchLower.startsWith(type)) {
      typeFilter = type.toUpperCase() as 'DOR' | 'DUDBC';
      searchTerm = searchLower.substring(type.length).trim();
      break;
    }
  }

  return sortedNorms.filter(n => {
    if (typeFilter && n.type !== typeFilter) return false;
    if (!searchTerm) return true;
    
    // Replace searchNorm with inline search
    return n.description.toLowerCase().includes(searchTerm) ||
           n.ref_ss?.toLowerCase().includes(searchTerm) ||
           n.sNo?.toLowerCase().includes(searchTerm);
  });
};
  const filteredNorms = getFilteredNorms();

  const calculateResourceSummary = () => {
    const summaryMap = new Map<string, { name: string; unit: string; totalQuantity: number; resource_type: string }>();

    items.forEach(item => {
      const scaleFactor = item.quantity / (item.norm.basis_quantity || 1);
      item.norm.resources.forEach(resource => {
        const key = `${resource.name}-${resource.unit || '%'}-${resource.resource_type}`;
        const qty = resource.is_percentage ? resource.quantity : resource.quantity * scaleFactor;

        const existing = summaryMap.get(key);
        if (existing) {
          existing.totalQuantity += qty;
        } else {
          summaryMap.set(key, {
            name: resource.name,
            unit: resource.is_percentage ? '%' : (resource.unit || ''),
            totalQuantity: qty,
            resource_type: resource.resource_type
          });
        }
      });
    });

    const order = { Labour: 1, Material: 2, Equipment: 3 };
    return Array.from(summaryMap.values()).sort((a, b) => {
      const typeOrder = (order[a.resource_type as keyof typeof order] || 4) - (order[b.resource_type as keyof typeof order] || 4);
      if (typeOrder !== 0) return typeOrder;
      return a.name.localeCompare(b.name);
    });
  };

  const calculateDetailedBreakdown = (): { rows: DetailedRow[]; allResourceNames: string[] } => {
    const allResourceTypes = new Map<string, string>();
    const rows: DetailedRow[] = [];

    items.forEach((item, idx) => {
      const scaleFactor = item.quantity / (item.norm.basis_quantity || 1);
      const resourceMap = new Map<string, number>();
      
      item.norm.resources.forEach(resource => {
        const resourceName = resource.name;
        const qty = resource.is_percentage ? resource.quantity : resource.quantity * scaleFactor;
        resourceMap.set(resourceName, qty);
        if (!allResourceTypes.has(resourceName)) {
          allResourceTypes.set(resourceName, resource.resource_type);
        }
      });

      rows.push({
        id: item.id,
        sNo: idx + 1,
        description: `${item.norm.ref_ss} ${item.norm.sNo || ''} - ${item.norm.description}`,
        unit: item.norm.unit,
        quantity: item.quantity,
        resources: resourceMap
      });
    });

    const order = { Labour: 1, Material: 2, Equipment: 3 } as Record<string, number>;
    const allResourceNames = Array.from(allResourceTypes.keys()).sort((a, b) => {
      const typeA = order[allResourceTypes.get(a) ?? ''] ?? 4;
      const typeB = order[allResourceTypes.get(b) ?? ''] ?? 4;
      if (typeA !== typeB) return typeA - typeB;
      return a.localeCompare(b);
    });

    return { rows, allResourceNames };
  };

  const resourceSummary = calculateResourceSummary();
  const { rows: detailedRows, allResourceNames: detailedResourceNames } = calculateDetailedBreakdown();
  const hasItems = items.length > 0;

  const drawPDFTable = (
    doc: jsPDF,
    columns: string[],
    data: any[][],
    startY: number,
    margin: number = 12,
    explicitColumnWidths?: number[]
  ) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = startY;
    const lineHeight = 6.5;
    const headerHeight = 11;
    const maxContentWidth = pageWidth - margin * 2;

    const getTextWidth = (text: string, fontName = 'helvetica', fontStyle: 'normal' | 'bold' = 'normal', fontSize = 6.5) => {
      doc.setFont(fontName, fontStyle);
      doc.setFontSize(fontSize);
      return doc.getTextWidth(text);
    };

    const columnWidths = explicitColumnWidths ?? columns.map((col, index) => {
      const headerWidth = getTextWidth(col, 'helvetica', 'bold', 7);
      const dataWidth = data.reduce((maxWidth: number, row: any[]) => {
        const cellText = String(row[index] ?? '-');
        const wrapped = doc.splitTextToSize(cellText, maxContentWidth) as string[];
        const maxLineWidth = wrapped.reduce((maxLine: number, line: string) => Math.max(maxLine, getTextWidth(line, 'helvetica', 'normal', 6.5)), 0);
        return Math.max(maxWidth, maxLineWidth);
      }, 0);
      return Math.max(headerWidth, dataWidth) + 3;
    });

    const minWidthMap: Record<string, number> = {
      'S.N.': 10,
      'Ref Code': 22,
      'Qty': 12,
      'Unit': 12,
      'Type': 18,
      'Total Qty': 18,
      'Resource Name': 24,
      'Work Item': 40,
      'Description': 40,
    };

    const minWidths = columns.map(col => minWidthMap[col] ?? 18);
    const fixedColumnNames = new Set(['S.N.', 'Ref Code', 'Qty', 'Unit', 'Type', 'Total Qty']);
    const baseWidths = columnWidths.map((width, idx) => Math.max(width, minWidths[idx]));
    const totalWidth = baseWidths.reduce((sum, width) => sum + width, 0);

    if (totalWidth > maxContentWidth) {
      const fixedIndexes = columns.map((col, idx) => fixedColumnNames.has(col) ? idx : -1).filter(idx => idx !== -1);
      const variableIndexes = columns.map((col, idx) => fixedColumnNames.has(col) ? -1 : idx).filter(idx => idx !== -1);

      const fixedWidthSum = fixedIndexes.reduce((sum, idx) => sum + baseWidths[idx], 0);
      const variableWidthSum = variableIndexes.reduce((sum, idx) => sum + baseWidths[idx], 0);
      const remainingWidth = maxContentWidth - fixedWidthSum;

      if (remainingWidth <= variableIndexes.reduce((sum, idx) => sum + minWidths[idx], 0)) {
        columnWidths.forEach((_, idx) => {
          columnWidths[idx] = Math.max(minWidths[idx], (baseWidths[idx] / totalWidth) * maxContentWidth);
        });
      } else {
        fixedIndexes.forEach(idx => {
          columnWidths[idx] = Math.max(minWidths[idx], baseWidths[idx]);
        });

        const totalVariableBase = variableIndexes.reduce((sum, idx) => sum + baseWidths[idx], 0);
        variableIndexes.forEach(idx => {
          const ratio = totalVariableBase > 0 ? baseWidths[idx] / totalVariableBase : 1 / variableIndexes.length;
          columnWidths[idx] = Math.max(minWidths[idx], ratio * remainingWidth);
        });
      }
    } else {
      columnWidths.forEach((_, idx) => {
        columnWidths[idx] = baseWidths[idx];
      });
    }

    const drawHeaders = () => {
      doc.setFillColor(30, 41, 59);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);

      let x = margin;
      columns.forEach((col, idx) => {
        const width = columnWidths[idx];
        doc.rect(x, yPos, width, headerHeight, 'F');
        doc.rect(x, yPos, width, headerHeight);
        x += width;
      });

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);

      x = margin;
      columns.forEach((col, idx) => {
        const width = columnWidths[idx];
        doc.text(col, x + 1, yPos + 7.5, { maxWidth: width - 2, align: 'left' });
        x += width;
      });
    };

    drawHeaders();
    yPos += headerHeight;

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    let rowIdx = 0;

    data.forEach((row) => {
      const wrappedCells = row.map((cell, idx) => {
        const cellText = String(cell ?? '-');
        return doc.splitTextToSize(cellText, columnWidths[idx] - 2);
      });

      const maxLines = Math.max(...wrappedCells.map(lines => lines.length));
      const rowHeight = Math.max(lineHeight * maxLines + 4, lineHeight);

      if (yPos + rowHeight > pageHeight - 15) {
        doc.addPage();
        yPos = 15;
        drawHeaders();
        yPos += headerHeight;
      }

      if (rowIdx % 2 === 0) {
        doc.setFillColor(240, 245, 250);
      } else {
        doc.setFillColor(255, 255, 255);
      }

      let x = margin;
      columns.forEach((_, idx) => {
        const width = columnWidths[idx];
        doc.rect(x, yPos, width, rowHeight, 'FD');
        x += width;
      });

      doc.setTextColor(30, 41, 59);
      x = margin;
      wrappedCells.forEach((lines: string[], idx: number) => {
        const width = columnWidths[idx];
        lines.forEach((line: string, lineIdx: number) => {
          doc.text(line, x + 1, yPos + 4 + lineIdx * lineHeight, { maxWidth: width - 2, align: 'left' });
        });
        x += width;
      });

      yPos += rowHeight;
      rowIdx++;
    });

    return yPos;
  };

  const drawPDFTableWithFrozenColumns = (
    doc: jsPDF,
    fixedHeaders: string[],
    resourceHeaders: string[],
    data: any[][],
    startY: number,
    margin: number = 12
  ) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const lineHeight = 6.5;
    const headerHeight = 11;
    const maxContentWidth = pageWidth - margin * 2;

    const getTextWidth = (
      text: string,
      fontName = 'helvetica',
      fontStyle: 'normal' | 'bold' = 'normal',
      fontSize = 6.5
    ) => {
      doc.setFont(fontName, fontStyle);
      doc.setFontSize(fontSize);
      return doc.getTextWidth(text);
    };

    const fixedMinWidths = [10, 60, 12, 12];
    const fixedMaxWidths = [14, 80, 18, 18];
    const resourceMinWidth = 18;
    const resourceMaxWidth = 32;

    const fixedWidths = fixedHeaders.map((col, index) => {
      const headerWidth = getTextWidth(col, 'helvetica', 'bold', 7);
      const dataWidth = data.reduce((maxWidth: number, row: any[]) => {
        const cellText = String(row[index] ?? '-');
        const wrapped = doc.splitTextToSize(cellText, maxContentWidth) as string[];
        const maxLineWidth = wrapped.reduce((maxLine: number, line: string) => Math.max(maxLine, getTextWidth(line, 'helvetica', 'normal', 6.5)), 0);
        return Math.max(maxWidth, maxLineWidth);
      }, 0);

      const baseWidth = Math.max(headerWidth, dataWidth, fixedMinWidths[index]) + 3;
      return Math.min(baseWidth, fixedMaxWidths[index]);
    });

    const resourceWidths = resourceHeaders.map((col, idx) => {
      const headerWidth = getTextWidth(col, 'helvetica', 'bold', 7);
      const dataIndex = fixedHeaders.length + idx;
      const dataWidth = data.reduce((maxWidth: number, row: any[]) => {
        const cellText = String(row[dataIndex] ?? '-');
        const wrapped = doc.splitTextToSize(cellText, maxContentWidth) as string[];
        const maxLineWidth = wrapped.reduce((maxLine: number, line: string) => Math.max(maxLine, getTextWidth(line, 'helvetica', 'normal', 6.5)), 0);
        return Math.max(maxWidth, maxLineWidth);
      }, 0);
      return Math.min(Math.max(headerWidth, dataWidth, resourceMinWidth) + 3, resourceMaxWidth);
    });

    let fixedTotal = fixedWidths.reduce((sum, width) => sum + width, 0);
    let availableResourceWidth = maxContentWidth - fixedTotal;
    let resourceColsPerPage = Math.max(1, Math.min(resourceHeaders.length, Math.floor(availableResourceWidth / resourceMinWidth)));

    if (resourceHeaders.length >= 7) {
      while (resourceColsPerPage < 7 && fixedWidths[1] > 55) {
        fixedWidths[1] = Math.max(55, fixedWidths[1] - 10);
        fixedTotal = fixedWidths.reduce((sum, width) => sum + width, 0);
        availableResourceWidth = maxContentWidth - fixedTotal;
        resourceColsPerPage = Math.max(1, Math.min(resourceHeaders.length, Math.floor(availableResourceWidth / resourceMinWidth)));
      }
    }

    if (resourceColsPerPage > resourceHeaders.length) {
      resourceColsPerPage = resourceHeaders.length;
    }

    const chunks: number[][] = [];
    for (let start = 0; start < resourceHeaders.length; start += resourceColsPerPage) {
      const chunkIndexes = Array.from({ length: Math.min(resourceColsPerPage, resourceHeaders.length - start) }, (_, idx) => start + idx);
      chunks.push(chunkIndexes);
    }

    if (chunks.length === 0 && resourceHeaders.length > 0) {
      chunks.push(resourceHeaders.map((_, index) => index));
    }

    let yPos = startY;
    chunks.forEach((chunkIndexes, chunkIdx) => {
      if (chunkIdx > 0) {
        doc.addPage();
        yPos = 15;
      }

      doc.setFontSize(12);
      doc.setFont('Helvetica', 'bold');
      const title = `Item-wise Resource Breakdown (${chunkIdx + 1}/${chunks.length})`;
      doc.text(title, margin, yPos);
      yPos += 8;

      const headers = [
        ...fixedHeaders,
        ...chunkIndexes.map(index => resourceHeaders[index])
      ];

      const pageData = data.map(row => [
        ...row.slice(0, fixedHeaders.length),
        ...chunkIndexes.map(index => row[fixedHeaders.length + index])
      ]);

      const resourceColumnCount = chunkIndexes.length;
      const resourceColumnWidth = availableResourceWidth / resourceColumnCount;
      const columnWidths = [...fixedWidths, ...Array(resourceColumnCount).fill(resourceColumnWidth)];

      yPos = drawPDFTable(doc, headers, pageData, yPos, margin, columnWidths);
    });

    return yPos;
  };

  const exportToPDF = (viewType: 'summary' | 'detailed') => {
    try {
      const orientation = viewType === 'detailed' ? 'l' : 'p';
      const doc = new jsPDF(orientation, 'mm', 'a4');
      const pageHeight = doc.internal.pageSize.getHeight();

      // Get current date in both AD and BS format
      const currentDate = new Date();
      const adDate = currentDate.toLocaleDateString('en-GB');
      
      // Convert to BS using hamro-nepali-patro
      let bsDate = 'N/A';
      try {
        let converter: any = HamoNepaliPatro;
        let nepaliDate;
        
        if (typeof converter.adToBS === 'function') {
          nepaliDate = converter.adToBS({
            year: currentDate.getFullYear(),
            month: currentDate.getMonth() + 1,
            date: currentDate.getDate()
          });
        } else if (typeof converter.default?.adToBS === 'function') {
          nepaliDate = converter.default.adToBS({
            year: currentDate.getFullYear(),
            month: currentDate.getMonth() + 1,
            date: currentDate.getDate()
          });
        } else {
          nepaliDate = null;
        }
        
        if (nepaliDate) {
          bsDate = `${nepaliDate.year}-${String(nepaliDate.month).padStart(2, '0')}-${String(nepaliDate.date).padStart(2, '0')}`;
        }
      } catch (e) {
        console.warn('Could not convert to BS date:', e);
      }
      
      let yPosition = 15;

      // Title and Header
      doc.setFontSize(18);
      doc.setFont('Helvetica', 'bold');
      doc.text('ResourceCalc - Quick BOQ Report', 15, yPosition);
      
      yPosition += 8;
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Generated: ${adDate} (AD) | ${bsDate} (BS)`, 15, yPosition);

      yPosition += 15;

      if (viewType === 'summary') {
        // BOQ Items Section
        doc.setFontSize(12);
        doc.setFont('Helvetica', 'bold');
        doc.text('BOQ Items', 15, yPosition);
        yPosition += 8;

        const boqData = items.map((item, idx) => [
          (idx + 1).toString(),
          `${item.norm.ref_ss} ${item.norm.sNo || ''}`,
          item.norm.description,
          item.quantity.toString(),
          item.norm.unit
        ]);

        yPosition = drawPDFTable(
          doc,
          ['S.N.', 'Ref Code', 'Description', 'Qty', 'Unit'],
          boqData,
          yPosition,
          12
        );

        yPosition += 12;

        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 15;
        }

        doc.setFontSize(12);
        doc.setFont('Helvetica', 'bold');
        doc.text('Resource Summary', 15, yPosition);
        yPosition += 8;

        const summaryData = resourceSummary.map(resource => [
          resource.name,
          resource.resource_type,
          Number(resource.totalQuantity.toFixed(2)).toString(),
          resource.unit
        ]);

        yPosition = drawPDFTable(
          doc,
          ['Resource Name', 'Type', 'Total Qty', 'Unit'],
          summaryData,
          yPosition,
          12
        );
      } else {
        // Detailed View (Item-wise Resource Breakdown only)
        const detailedData = detailedRows.map(row => [
          row.sNo.toString(),
          row.description,
          row.unit,
          row.quantity.toString(),
          ...detailedResourceNames.map(resource => {
            const qty = row.resources.get(resource);
            return qty ? Number(qty.toFixed(2)).toString() : '-';
          })
        ]);

        const totalRow = [
          'TOTAL',
          '',
          '',
          '',
          ...detailedResourceNames.map(resource => {
            const total = detailedRows.reduce((sum, row) => sum + (row.resources.get(resource) || 0), 0);
            return total > 0 ? Number(total.toFixed(2)).toString() : '-';
          })
        ];
        detailedData.push(totalRow);

        const headers = ['S.N.', 'Work Item', 'Unit', 'Qty', ...detailedResourceNames];
        yPosition = drawPDFTableWithFrozenColumns(
          doc,
          ['S.N.', 'Work Item', 'Unit', 'Qty'],
          detailedResourceNames,
          detailedData,
          yPosition,
          12
        );
      }

      // Save the PDF
      const fileName = `BOQ_${viewType}_${currentDate.toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      console.error('Error details:', error?.message || JSON.stringify(error));
      alert(`Error generating PDF: ${error?.message || 'Unknown error'}. Please try again.`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 md:pb-8">
      {/* Header - Dark slate background with blue title */}
      <header className="sticky top-0 z-30 bg-[#1E293B] px-4 py-3 shadow-md no-print md:hidden">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-[#3B82F6]">Quick BOQ</h1>
            <p className="text-xs text-white/50">Build your quantity estimate</p>
          </div>
          <div className="flex items-center gap-2">
            {hasItems && (
              <>
                <button
                  onClick={() => exportToPDF(viewMode)}
                  className="px-3 py-1 text-xs font-semibold text-blue-300 bg-blue-900/30 rounded-lg flex items-center gap-1"
                >
                  <Download size={12} />
                  PDF
                </button>
                <button
                  onClick={clearAll}
                  className="px-3 py-1 text-xs font-semibold text-red-300 bg-red-900/30 rounded-lg"
                >
                  Clear
                </button>
              </>
            )}
            <button
              onClick={() => {
                setSelectedNormForModal(null);
                setTempQuantity('');
                setShowAddModal(true);
              }}
              className="px-3 py-1.5 bg-[#3B82F6] text-white rounded-lg text-xs font-bold shadow-sm"
            >
              Add Item
            </button>
          </div>
        </div>
      </header>

      <main className="w-full md:max-w-5xl md:mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Web Header */}
        <div className="hidden md:flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[#1E293B]">Quick BOQ</h1>
            <p className="text-base text-[#475569] mt-1">Build your quantity estimate</p>
          </div>
          <div className="flex items-center gap-3">
            {hasItems && (
              <>
                <button
                  onClick={() => exportToPDF(viewMode)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0EA5E9] rounded-lg flex items-center gap-2 hover:bg-[#0284C7] transition-colors shadow-md"
                >
                  <Download size={16} />
                  Export PDF
                </button>
                <button
                  onClick={clearAll}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#DC2626] rounded-lg hover:bg-[#B91C1C] transition-colors shadow-md"
                >
                  Clear All
                </button>
              </>
            )}
            <button
              onClick={() => {
                setSelectedNormForModal(null);
                setTempQuantity('');
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg text-sm font-bold shadow-md hover:bg-[#2563EB] transition-colors"
            >
              Add Item
            </button>
          </div>
        </div>

        {!hasItems ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#333333]/40">
            <Calculator size={48} strokeWidth={1} />
            <p className="text-lg font-bold text-[#333333]/60">No BOQ items added</p>
            <p className="text-sm text-center max-w-xs text-[#333333]/40">Tap on any norm below to add it to your BOQ</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Toggle View Buttons */}
            <div className="flex bg-white rounded-xl p-1 border border-[#E2E8F0]">
              <button
                onClick={() => setViewMode('summary')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                  viewMode === 'summary'
                    ? 'bg-[#1E293B] text-white shadow-sm'
                    : 'text-[#333333]/60 hover:text-[#1E293B]'
                }`}
              >
                <TableProperties size={14} />
                Summary View
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                  viewMode === 'detailed'
                    ? 'bg-[#1E293B] text-white shadow-sm'
                    : 'text-[#333333]/60 hover:text-[#1E293B]'
                }`}
              >
                <LayoutList size={14} />
                Detailed View
              </button>
            </div>

            {/* Summary View */}
            {viewMode === 'summary' && (
              <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
                <div className="px-3 md:px-4 py-2 md:py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-[#1E293B]">
                    Resource Summary (Total for all BOQ Items)
                  </h3>
                </div>
                <table className="min-w-full text-sm text-left text-[#333333]">
                  <thead className="bg-[#F8FAFC] text-[10px] md:text-xs uppercase tracking-wider text-[#1E293B]">
                    <tr>
                      <th className="px-3 md:px-4 py-3">Resource</th>
                      <th className="px-3 md:px-4 py-3">Type</th>
                      <th className="px-3 md:px-4 py-3">Total Qty</th>
                      <th className="px-3 md:px-4 py-3">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resourceSummary.map((resource, idx) => (
                      <tr key={`${resource.name}-${idx}`} className="border-t border-[#E2E8F0]">
                        <td className="px-3 md:px-4 py-3 align-top font-semibold text-[#1E293B]">{resource.name}</td>
                        <td className="px-3 md:px-4 py-3 align-top">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${
                            resource.resource_type === 'Labour'
                              ? 'bg-[#1E293B]/10 text-[#1E293B]'
                              : resource.resource_type === 'Material'
                              ? 'bg-[#3B82F6]/10 text-[#3B82F6]'
                              : 'bg-[#333333]/10 text-[#333333]'
                          }`}>
                            {resource.resource_type}
                          </span>
                        </td>
                        <td className="px-3 md:px-4 py-3 align-top font-semibold text-[#1E293B]">{Number(resource.totalQuantity.toFixed(2)).toLocaleString()}</td>
                        <td className="px-3 md:px-4 py-3 align-top text-[#333333]/50">{resource.unit}</td>
                      </tr>
                    ))}
                    {resourceSummary.length === 0 && (
                      <tr className="border-t border-[#E2E8F0]">
                        <td colSpan={4} className="px-3 md:px-4 py-6 text-center text-[#333333]/30 text-xs">
                          No resources to summarize
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Detailed View */}
            {viewMode === 'detailed' && (
              <div className="space-y-4">
                {/* Resource Summary (also shown in Detailed View) */}
                <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
                  <div className="px-3 md:px-4 py-2 md:py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-[#1E293B]">
                      Resource Summary (Total for all BOQ Items)
                    </h3>
                  </div>
                  <table className="min-w-full text-sm text-left text-[#333333]">
                    <thead className="bg-[#F8FAFC] text-[10px] md:text-xs uppercase tracking-wider text-[#1E293B]">
                      <tr>
                        <th className="px-3 md:px-4 py-3">Resource</th>
                        <th className="px-3 md:px-4 py-3">Type</th>
                        <th className="px-3 md:px-4 py-3">Total Qty</th>
                        <th className="px-3 md:px-4 py-3">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resourceSummary.map((resource, idx) => (
                        <tr key={`${resource.name}-${idx}`} className="border-t border-[#E2E8F0]">
                          <td className="px-3 md:px-4 py-3 align-top font-semibold text-[#1E293B]">{resource.name}</td>
                          <td className="px-3 md:px-4 py-3 align-top">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${
                              resource.resource_type === 'Labour'
                                ? 'bg-[#1E293B]/10 text-[#1E293B]'
                                : resource.resource_type === 'Material'
                                ? 'bg-[#3B82F6]/10 text-[#3B82F6]'
                                : 'bg-[#333333]/10 text-[#333333]'
                            }`}>
                              {resource.resource_type}
                            </span>
                          </td>
                          <td className="px-3 md:px-4 py-3 align-top font-semibold text-[#1E293B]">{Number(resource.totalQuantity.toFixed(2)).toLocaleString()}</td>
                          <td className="px-3 md:px-4 py-3 align-top text-[#333333]/50">{resource.unit}</td>
                        </tr>
                      ))}
                      {resourceSummary.length === 0 && (
                        <tr className="border-t border-[#E2E8F0]">
                          <td colSpan={4} className="px-3 md:px-4 py-6 text-center text-[#333333]/30 text-xs">
                            No resources to summarize
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Item-wise Resource Breakdown */}
                <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
                  <div className="px-3 md:px-4 py-2 md:py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-[#1E293B]">
                      Item-wise Resource Breakdown
                    </h3>
                  </div>
                  <table className="min-w-[800px] text-sm text-left text-[#333333]">
                    <thead className="bg-[#F8FAFC] text-[10px] uppercase tracking-wider text-[#1E293B]">
                      <tr>
                        <th className="px-3 py-3 w-12">S.N.</th>
                        <th className="px-3 py-3 min-w-[200px]">Work Item</th>
                        <th className="px-3 py-3 w-16">Unit</th>
                        <th className="px-3 py-3 w-20">Qty</th>
                        {detailedResourceNames.map(resource => (
                          <th key={resource} className="px-3 py-3 min-w-[80px]">{resource}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detailedRows.map((row) => (
                        <tr key={row.id} className="border-t border-[#E2E8F0]">
                          <td className="px-3 py-3 text-[11px] text-[#333333]/50">{row.sNo}</td>
                          <td className="px-3 py-3">
                            <div className="text-xs font-semibold text-[#1E293B] line-clamp-2">{row.description}</div>
                          </td>
                          <td className="px-3 py-3 text-xs text-[#333333]/50">{row.unit}</td>
                          <td className="px-3 py-3 text-xs font-semibold text-[#1E293B]">{row.quantity}</td>
                          {detailedResourceNames.map(resource => (
                            <td key={resource} className="px-3 py-3 text-xs text-[#333333]">
                              {row.resources.has(resource) ? Number(row.resources.get(resource)?.toFixed(2)).toLocaleString() : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {/* Total Row */}
                      <tr className="border-t-2 border-[#E2E8F0] bg-[#F8FAFC]">
                        <td className="px-3 py-3 font-bold text-[#1E293B]" colSpan={4}>Total</td>
                        {detailedResourceNames.map(resource => {
                          const total = detailedRows.reduce((sum, row) => sum + (row.resources.get(resource) || 0), 0);
                          return (
                            <td key={resource} className="px-3 py-3 font-bold text-[#1E293B]">
                              {total > 0 ? Number(total.toFixed(2)).toLocaleString() : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* BOQ Items List */}
            <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
              <div className="px-3 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#1E293B]">
                  Your BOQ Items ({items.length})
                </h3>
              </div>
              <table className="min-w-full text-sm text-left text-[#333333]">
                <thead className="bg-[#F8FAFC] text-[10px] uppercase tracking-wider text-[#1E293B]">
                  <tr>
                    <th className="px-3 py-3">S.N.</th>
                    <th className="px-3 py-3">Work Item</th>
                    <th className="px-3 py-3">Qty</th>
                    <th className="px-3 py-3">Unit</th>
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} className="border-t border-[#E2E8F0]">
                      <td className="px-3 py-3 align-top text-[11px] text-[#333333]/50">{idx + 1}</td>
                      <td className="px-3 py-3 align-top">
                        <div className="font-semibold text-[#1E293B]">{item.norm.ref_ss} {item.norm.sNo || ''}</div>
                        <div className="text-[11px] text-[#333333]/50 line-clamp-2">{item.norm.description}</div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <input
                          type="number"
                          value={item.quantity}
                          min="0"
                          step="0.01"
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItemQuantity(item.id, parseFloat(e.target.value) || 0)}
                          className="w-20 rounded-xl border border-[#E2E8F0] bg-white px-2 py-1 text-sm font-semibold text-[#1E293B]"
                        />
                      </td>
                      <td className="px-3 py-3 align-top text-[#333333]/50">{item.norm.unit}</td>
                      <td className="px-3 py-3 align-top">
                        <button onClick={() => removeItem(item.id)} className="text-red-400 p-1 rounded-full hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Available Norms Section */}
        <div className="space-y-3 no-print">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#1E293B]">Available Norms (Tap to add)</h3>
            <span className="text-[9px] text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-0.5 rounded-full">Tap</span>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#333333]/40" size={14} />
            <input
              type="text"
              placeholder="Search norms..."
              className="w-full pl-9 pr-8 py-2 bg-white rounded-xl border border-[#E2E8F0] text-sm text-[#333333] placeholder:text-[#333333]/30 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#333333]/40 hover:text-[#333333] transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {filteredNorms.map((norm) => (
              <motion.div
                key={norm.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => addItem(norm, 1)}
                className="cursor-pointer p-3 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#3B82F6] active:bg-[#F8FAFC] transition-all duration-150 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase ${
                        norm.type === 'DOR' ? 'bg-[#1E293B] text-white' : 'bg-[#1E293B] text-white'
                      }`}>
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
            {filteredNorms.length === 0 && search && (
              <div className="text-center text-[#333333]/40 py-8">
                No norms found for "{search}"
              </div>
            )}
            {filteredNorms.length === 0 && !search && (
              <div className="text-center text-[#333333]/40 py-8">
                No norms available
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Item Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 no-print"
          >
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
              <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#1E293B]">Add BOQ Item</h2>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-[#F8FAFC] rounded-full transition-colors"
                >
                  <X size={20} className="text-[#333333]/60" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#1E293B]">Select Work Item</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#333333]/40" size={14} />
                    <input
                      type="text"
                      placeholder="Search norms..."
                      className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-[#E2E8F0] text-sm text-[#333333] placeholder:text-[#333333]/30 focus:outline-none focus:border-[#3B82F6]"
                      value={search}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {filteredNorms.map((norm) => (
                    <div
                      key={norm.id}
                      onClick={() => setSelectedNormForModal(norm)}
                      className={`cursor-pointer p-3 rounded-xl border transition-all ${
                        selectedNormForModal?.id === norm.id
                          ? 'border-[#3B82F6] bg-[#F8FAFC]'
                          : 'border-[#E2E8F0] hover:border-[#3B82F6]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase ${
                          norm.type === 'DOR' ? 'bg-[#1E293B] text-white' : 'bg-[#1E293B] text-white'
                        }`}>
                          {norm.type}
                        </span>
                        <span className="text-[9px] font-mono text-[#333333]/50">
                          {norm.ref_ss} {norm.sNo || ''}
                        </span>
                      </div>
                      <p className="font-bold text-xs leading-tight text-[#333333] line-clamp-2">{norm.description}</p>
                      <p className="text-[9px] text-[#333333]/40 mt-1">Unit: {norm.unit} • Basis: {norm.basis_quantity}</p>
                    </div>
                  ))}
                  {filteredNorms.length === 0 && (
                    <div className="text-center text-[#333333]/40 py-4">
                      No norms found
                    </div>
                  )}
                </div>

                {selectedNormForModal && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#1E293B]">Quantity ({selectedNormForModal.unit})</label>
                    <input
                      type="number"
                      value={tempQuantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTempQuantity(e.target.value)}
                      placeholder="Enter quantity"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-[#E2E8F0] text-sm text-[#333333] placeholder:text-[#333333]/30 focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-[#E2E8F0] flex gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-[#F8FAFC] text-[#333333] rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModalAdd}
                  disabled={!selectedNormForModal || !tempQuantity || parseFloat(tempQuantity) <= 0}
                  className="flex-1 px-4 py-2 bg-[#3B82F6] text-white rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to BOQ
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .no-print { display: none !important; }
            .print-break { page-break-before: always; }
            body { font-size: 12px; }
            table { font-size: 10px; }
            .rounded-2xl { border-radius: 0 !important; }
            .shadow-sm { box-shadow: none !important; }
            .bg-white { background: white !important; }
            .border { border: 1px solid #000 !important; }
          }
        `
      }} />
    </div>
  );
}