import React, { useState, useEffect } from 'react';import { Trash2, Calculator, X, Search } from 'lucide-react';
import { Norm } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface BOQItem {
  id: string;
  normId: number;
  norm: Norm;
  quantity: number;
}

export default function BOQ({ norms }: { norms: Norm[] }) {
  const [items, setItems] = useState<BOQItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [longPressFeedback, setLongPressFeedback] = useState<number | null>(null);

  // Load saved BOQ from localStorage
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

  // Save BOQ to localStorage
  useEffect(() => {
    localStorage.setItem('boq_items', JSON.stringify(items));
  }, [items]);

  const addItem = (norm: Norm) => {
    const newItem: BOQItem = {
      id: Date.now().toString(),
      normId: norm.id,
      norm: norm,
      quantity: 1
    };

    setItems([...items, newItem]);
    setShowAddModal(false);
    setSearch('');
    
    // Show feedback
    setLongPressFeedback(norm.id);
    setTimeout(() => setLongPressFeedback(null), 800);
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

  // Long press handlers
  const handleTouchStart = (norm: Norm) => {
    const timer = setTimeout(() => {
      addItem(norm);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleMouseDown = (norm: Norm) => {
    const timer = setTimeout(() => {
      addItem(norm);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
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

  const resourceSummary = calculateResourceSummary();
  const hasItems = items.length > 0;

  return (
    <div className="min-h-screen bg-black pb-24">
      <header className="sticky top-0 z-30 bg-black border-b border-zinc-800 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white">BOQ</h1>
            <p className="text-xs text-zinc-500">Long press on any norm to add</p>
          </div>
          <div className="flex items-center gap-2">
            {hasItems && (
              <button
                onClick={clearAll}
                className="px-3 py-1 text-xs font-semibold text-red-400 bg-red-950/50 rounded-lg"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
            >
              Add Item
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {!hasItems ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-zinc-600">
            <Calculator size={48} strokeWidth={1} />
            <p className="text-lg font-bold text-zinc-400">No BOQ items added</p>
            <p className="text-sm text-center max-w-xs text-zinc-500">Long press on any norm from the list below or tap "Add Item"</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* BOQ Items Table */}
            <div className="overflow-x-auto rounded-3xl border border-zinc-800 bg-zinc-900 shadow-sm">
              <table className="min-w-full text-sm text-left text-zinc-300">
                <thead className="bg-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400">
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
                    <tr key={item.id} className="border-t border-zinc-800">
                      <td className="px-3 py-3 align-top text-[11px] text-zinc-500">{idx + 1}</td>
                      <td className="px-3 py-3 align-top">
                        <div className="font-semibold text-white">{item.norm.ref_ss} {item.norm.sNo || ''}</div>
                        <div className="text-[11px] text-zinc-400 line-clamp-2">{item.norm.description}</div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <input
                          type="number"
                          value={item.quantity}
                          min="0"
                          step="0.01"
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItemQuantity(item.id, parseFloat(e.target.value) || 0)}
                          className="w-20 rounded-2xl border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm font-semibold text-white"
                        />
                      </td>
                      <td className="px-3 py-3 align-top text-zinc-400">{item.norm.unit}</td>
                      <td className="px-3 py-3 align-top">
                        <button onClick={() => removeItem(item.id)} className="text-red-500 p-1 rounded-full hover:bg-red-950/50">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resource Summary Table */}
            <div className="overflow-x-auto rounded-3xl border border-zinc-800 bg-zinc-900 shadow-sm">
              <div className="px-3 py-2 bg-emerald-950/30 border-b border-emerald-800/30">
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  Resource Summary (Total for all BOQ Items)
                </h3>
              </div>
              <table className="min-w-full text-sm text-left text-zinc-300">
                <thead className="bg-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-3 py-3">Resource</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Total Qty</th>
                    <th className="px-3 py-3">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {resourceSummary.map((resource, idx) => (
                    <tr key={`${resource.name}-${idx}`} className="border-t border-zinc-800">
                      <td className="px-3 py-3 align-top font-semibold text-white">{resource.name}</td>
                      <td className="px-3 py-3 align-top">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${
                          resource.resource_type === 'Labour'
                            ? 'bg-blue-950 text-blue-300'
                            : resource.resource_type === 'Material'
                            ? 'bg-emerald-950 text-emerald-300'
                            : 'bg-orange-950 text-orange-300'
                        }`}>
                          {resource.resource_type}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top font-semibold text-white">{Number(resource.totalQuantity.toFixed(2)).toLocaleString()}</td>
                      <td className="px-3 py-3 align-top text-zinc-400">{resource.unit}</td>
                    </tr>
                  ))}
                  {resourceSummary.length === 0 && (
                    <tr className="border-t border-zinc-800">
                      <td colSpan={4} className="px-3 py-6 text-center text-zinc-500 text-xs">
                        No resources to summarize
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Norms List for Quick Add (Always Visible) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Available Norms (Long press to add)</h3>
            <span className="text-[9px] text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded-full">Hold 0.5s</span>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input
              type="text"
              placeholder="Search norms to quick add..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-900 rounded-2xl border border-zinc-800 text-sm text-white placeholder:text-zinc-600"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {filteredNorms.map((norm) => (
              <motion.div
                key={norm.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onTouchStart={() => handleTouchStart(norm)}
                onTouchEnd={handleTouchEnd}
                onMouseDown={() => handleMouseDown(norm)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                className={`cursor-pointer p-3 rounded-2xl border transition-all duration-200 ${
                  longPressFeedback === norm.id
                    ? 'bg-emerald-900 border-emerald-500 scale-95'
                    : 'bg-zinc-900 border-zinc-800 hover:border-emerald-500/50 active:scale-98'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase ${
                        norm.type === 'DOR' ? 'bg-blue-950 text-blue-300' : 'bg-purple-950 text-purple-300'
                      }`}>
                        {norm.type}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500">
                        {norm.ref_ss} {norm.sNo || ''}
                      </span>
                    </div>
                    <p className="font-bold text-xs leading-tight text-white line-clamp-2">{norm.description}</p>
                    <p className="text-[9px] text-zinc-500 mt-1">Unit: {norm.unit} • Basis: {norm.basis_quantity}</p>
                  </div>
                  <div className="ml-2 text-[10px] text-zinc-600 bg-zinc-800 px-2 py-1 rounded-full">
                    Hold
                  </div>
                </div>
              </motion.div>
            ))}
            {filteredNorms.length === 0 && (
              <div className="text-center text-zinc-500 py-8">
                No norms found
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Item Modal (Keep for manual selection) */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden"
          >
            <div className="flex h-full w-full max-w-md flex-col overflow-hidden bg-black">
              <div className="sticky top-0 bg-black z-10 p-3 border-b border-zinc-800 flex items-center gap-3">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 hover:bg-zinc-800 rounded-full transition-colors shrink-0 text-white"
                >
                  <X size={18} />
                </button>
                <h2 className="flex-1 text-base font-bold text-white">Add BOQ Item</h2>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 w-full">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Select Work Item</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                    <input
                      type="text"
                      placeholder="Search norms..."
                      className="w-full pl-9 pr-3 py-2 bg-zinc-900 rounded-2xl border border-zinc-800 text-sm text-white placeholder:text-zinc-600"
                      value={search}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* Norms List */}
                <div className="overflow-x-auto rounded-3xl border border-zinc-800 bg-zinc-900 shadow-sm">
                  <table className="min-w-full text-sm text-left text-zinc-300">
                    <thead className="bg-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400">
                      <tr>
                        <th className="px-3 py-3">S.N.</th>
                        <th className="px-3 py-3">Work Item</th>
                        <th className="px-3 py-3">Unit</th>
                        <th className="px-3 py-3">Basis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredNorms.map((norm, idx) => (
                        <tr
                          key={norm.id}
                          onClick={() => addItem(norm)}
                          className="cursor-pointer border-t border-zinc-800 hover:bg-zinc-800 transition-colors"
                        >
                          <td className="px-3 py-3 align-top text-[11px] text-zinc-500">{idx + 1}</td>
                          <td className="px-3 py-3 align-top">
                            <div className="font-semibold text-white line-clamp-1">{norm.ref_ss} {norm.sNo || ''}</div>
                            <div className="text-[11px] text-zinc-400 line-clamp-2">{norm.description}</div>
                          </td>
                          <td className="px-3 py-3 align-top text-zinc-400">{norm.unit}</td>
                          <td className="px-3 py-3 align-top text-zinc-400">{norm.basis_quantity}</td>
                        </tr>
                      ))}
                      {filteredNorms.length === 0 && (
                        <tr className="border-t border-zinc-800">
                          <td colSpan={4} className="px-3 py-6 text-center text-zinc-500 text-xs">
                            No norms found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}