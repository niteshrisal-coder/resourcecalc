import React, { useState, useEffect } from 'react';
import { Trash2, Calculator, X, Search, LayoutList, TableProperties } from 'lucide-react';
import { Norm } from '../types';
import { motion, AnimatePresence } from 'motion/react';

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

  const filteredNorms = norms
    .slice()
    .sort((a, b) => a.id - b.id)
    .filter(n =>
      n.description.toLowerCase().includes(search.toLowerCase()) ||
      n.ref_ss?.toLowerCase().includes(search.toLowerCase()) ||
      n.sNo?.toLowerCase().includes(search.toLowerCase())
    );

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
    const allResourcesSet = new Set<string>();
    const rows: DetailedRow[] = [];

    items.forEach((item, idx) => {
      const scaleFactor = item.quantity / (item.norm.basis_quantity || 1);
      const resourceMap = new Map<string, number>();
      
      item.norm.resources.forEach(resource => {
        const resourceName = resource.name;
        const qty = resource.is_percentage ? resource.quantity : resource.quantity * scaleFactor;
        resourceMap.set(resourceName, qty);
        allResourcesSet.add(resourceName);
      });

      rows.push({
        id: item.id,
        sNo: idx + 1,
        description: `${item.norm.ref_ss} ${item.norm.sNo || ''} - ${item.norm.description.substring(0, 60)}${item.norm.description.length > 60 ? '...' : ''}`,
        unit: item.norm.unit,
        quantity: item.quantity,
        resources: resourceMap
      });
    });

    const allResourceNames = Array.from(allResourcesSet).sort();
    return { rows, allResourceNames };
  };

  const resourceSummary = calculateResourceSummary();
  const { rows: detailedRows, allResourceNames: detailedResourceNames } = calculateDetailedBreakdown();
  const hasItems = items.length > 0;

  return (
    <div className="min-h-screen bg-[#FFF5F2] pb-24">
      {/* Header - Deep Eggplant background with Gold title */}
      <header className="sticky top-0 z-30 bg-[#2C1338] px-4 py-3 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-[#E5AA44]">BOQ</h1>
            <p className="text-xs text-white/50">Build your quantity estimate</p>
          </div>
          <div className="flex items-center gap-2">
            {hasItems && (
              <button
                onClick={clearAll}
                className="px-3 py-1 text-xs font-semibold text-red-300 bg-red-900/30 rounded-lg"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => {
                setSelectedNormForModal(null);
                setTempQuantity('');
                setShowAddModal(true);
              }}
              className="px-3 py-1.5 bg-[#E5AA44] text-[#2C1338] rounded-lg text-xs font-bold shadow-sm"
            >
              Add Item
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {!hasItems ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#333333]/40">
            <Calculator size={48} strokeWidth={1} />
            <p className="text-lg font-bold text-[#333333]/60">No BOQ items added</p>
            <p className="text-sm text-center max-w-xs text-[#333333]/40">Tap on any norm below to add it to your BOQ</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Toggle View Buttons */}
            <div className="flex bg-white rounded-xl p-1 border border-[#E0E0E0]">
              <button
                onClick={() => setViewMode('summary')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'summary'
                    ? 'bg-[#2C1338] text-white shadow-sm'
                    : 'text-[#333333]/60 hover:text-[#2C1338]'
                }`}
              >
                <TableProperties size={14} />
                Summary View
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'detailed'
                    ? 'bg-[#2C1338] text-white shadow-sm'
                    : 'text-[#333333]/60 hover:text-[#2C1338]'
                }`}
              >
                <LayoutList size={14} />
                Detailed View
              </button>
            </div>

            {/* Summary View */}
            {viewMode === 'summary' && (
              <div className="overflow-x-auto rounded-2xl border border-[#E0E0E0] bg-white shadow-sm">
                <div className="px-3 py-2 bg-[#FFF5F2] border-b border-[#E0E0E0]">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#2C1338]">
                    Resource Summary (Total for all BOQ Items)
                  </h3>
                </div>
                <table className="min-w-full text-sm text-left text-[#333333]">
                  <thead className="bg-[#FFF5F2] text-[10px] uppercase tracking-wider text-[#2C1338]">
                    <tr>
                      <th className="px-3 py-3">Resource</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Total Qty</th>
                      <th className="px-3 py-3">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resourceSummary.map((resource, idx) => (
                      <tr key={`${resource.name}-${idx}`} className="border-t border-[#E0E0E0]">
                        <td className="px-3 py-3 align-top font-semibold text-[#2C1338]">{resource.name}</td>
                        <td className="px-3 py-3 align-top">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${
                            resource.resource_type === 'Labour'
                              ? 'bg-[#2C1338]/10 text-[#2C1338]'
                              : resource.resource_type === 'Material'
                              ? 'bg-[#E5AA44]/10 text-[#E5AA44]'
                              : 'bg-[#333333]/10 text-[#333333]'
                          }`}>
                            {resource.resource_type}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top font-semibold text-[#2C1338]">{Number(resource.totalQuantity.toFixed(2)).toLocaleString()}</td>
                        <td className="px-3 py-3 align-top text-[#333333]/50">{resource.unit}</td>
                      </tr>
                    ))}
                    {resourceSummary.length === 0 && (
                      <tr className="border-t border-[#E0E0E0]">
                        <td colSpan={4} className="px-3 py-6 text-center text-[#333333]/30 text-xs">
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
              <div className="overflow-x-auto rounded-2xl border border-[#E0E0E0] bg-white shadow-sm">
                <div className="px-3 py-2 bg-[#FFF5F2] border-b border-[#E0E0E0]">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#2C1338]">
                    Item-wise Resource Breakdown
                  </h3>
                </div>
                <table className="min-w-[800px] text-sm text-left text-[#333333]">
                  <thead className="bg-[#FFF5F2] text-[10px] uppercase tracking-wider text-[#2C1338]">
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
                      <tr key={row.id} className="border-t border-[#E0E0E0]">
                        <td className="px-3 py-3 text-[11px] text-[#333333]/50">{row.sNo}</td>
                        <td className="px-3 py-3">
                          <div className="text-xs font-semibold text-[#2C1338] line-clamp-2">{row.description}</div>
                        </td>
                        <td className="px-3 py-3 text-xs text-[#333333]/50">{row.unit}</td>
                        <td className="px-3 py-3 text-xs font-semibold text-[#2C1338]">{row.quantity}</td>
                        {detailedResourceNames.map(resource => (
                          <td key={resource} className="px-3 py-3 text-xs text-[#333333]">
                            {row.resources.has(resource) ? Number(row.resources.get(resource)?.toFixed(2)).toLocaleString() : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="border-t-2 border-[#E0E0E0] bg-[#FFF5F2]">
                      <td className="px-3 py-3 font-bold text-[#2C1338]" colSpan={4}>Total</td>
                      {detailedResourceNames.map(resource => {
                        const total = detailedRows.reduce((sum, row) => sum + (row.resources.get(resource) || 0), 0);
                        return (
                          <td key={resource} className="px-3 py-3 font-bold text-[#2C1338]">
                            {total > 0 ? Number(total.toFixed(2)).toLocaleString() : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* BOQ Items List */}
            <div className="overflow-x-auto rounded-2xl border border-[#E0E0E0] bg-white shadow-sm">
              <div className="px-3 py-2 bg-[#FFF5F2] border-b border-[#E0E0E0]">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#2C1338]">
                  Your BOQ Items ({items.length})
                </h3>
              </div>
              <table className="min-w-full text-sm text-left text-[#333333]">
                <thead className="bg-[#FFF5F2] text-[10px] uppercase tracking-wider text-[#2C1338]">
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
                    <tr key={item.id} className="border-t border-[#E0E0E0]">
                      <td className="px-3 py-3 align-top text-[11px] text-[#333333]/50">{idx + 1}</td>
                      <td className="px-3 py-3 align-top">
                        <div className="font-semibold text-[#2C1338]">{item.norm.ref_ss} {item.norm.sNo || ''}</div>
                        <div className="text-[11px] text-[#333333]/50 line-clamp-2">{item.norm.description}</div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <input
                          type="number"
                          value={item.quantity}
                          min="0"
                          step="0.01"
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItemQuantity(item.id, parseFloat(e.target.value) || 0)}
                          className="w-20 rounded-xl border border-[#E0E0E0] bg-white px-2 py-1 text-sm font-semibold text-[#2C1338]"
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#2C1338]">Available Norms (Tap to add)</h3>
            <span className="text-[9px] text-[#E5AA44] bg-[#E5AA44]/10 px-2 py-0.5 rounded-full">Tap</span>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#333333]/40" size={14} />
            <input
              type="text"
              placeholder="Search norms..."
              className="w-full pl-9 pr-8 py-2 bg-white rounded-xl border border-[#E0E0E0] text-sm text-[#333333] placeholder:text-[#333333]/30 focus:outline-none focus:border-[#E5AA44] focus:ring-2 focus:ring-[#E5AA44]/20"
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
                className="cursor-pointer p-3 rounded-xl border border-[#E0E0E0] bg-white hover:border-[#E5AA44] active:bg-[#FFF5F2] transition-all duration-150 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase ${
                        norm.type === 'DOR' ? 'bg-[#2C1338] text-white' : 'bg-[#2C1338] text-white'
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
                  <div className="ml-2 text-[10px] text-[#E5AA44] bg-[#E5AA44]/10 px-2 py-1 rounded-full">
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
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
              <div className="p-4 border-b border-[#E0E0E0] flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#2C1338]">Add BOQ Item</h2>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-[#FFF5F2] rounded-full transition-colors"
                >
                  <X size={20} className="text-[#333333]/60" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#2C1338]">Select Work Item</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#333333]/40" size={14} />
                    <input
                      type="text"
                      placeholder="Search norms..."
                      className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-[#E0E0E0] text-sm text-[#333333] placeholder:text-[#333333]/30 focus:outline-none focus:border-[#E5AA44]"
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
                          ? 'border-[#E5AA44] bg-[#FFF5F2]'
                          : 'border-[#E0E0E0] hover:border-[#E5AA44]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase ${
                          norm.type === 'DOR' ? 'bg-[#2C1338] text-white' : 'bg-[#2C1338] text-white'
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
                    <label className="text-xs font-bold uppercase tracking-widest text-[#2C1338]">Quantity ({selectedNormForModal.unit})</label>
                    <input
                      type="number"
                      value={tempQuantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTempQuantity(e.target.value)}
                      placeholder="Enter quantity"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-[#E0E0E0] text-sm text-[#333333] placeholder:text-[#333333]/30 focus:outline-none focus:border-[#E5AA44]"
                    />
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-[#E0E0E0] flex gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-[#FFF5F2] text-[#333333] rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModalAdd}
                  disabled={!selectedNormForModal || !tempQuantity || parseFloat(tempQuantity) <= 0}
                  className="flex-1 px-4 py-2 bg-[#E5AA44] text-[#2C1338] rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to BOQ
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}