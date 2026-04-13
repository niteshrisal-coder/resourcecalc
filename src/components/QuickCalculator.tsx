import React, { useState, useEffect } from 'react';
import { Calculator, Search, Info, Zap, ChevronRight, X, ArrowLeft } from 'lucide-react';
import { Norm, Rate } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function QuickCalculator({ norms }: { norms: Norm[] }) {
  const [search, setSearch] = useState('');
  const [selectedNorm, setSelectedNorm] = useState<Norm | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isSearching, setIsSearching] = useState(false);

  const calculateResourceBreakdown = (norm: Norm, inputQuantity: number) => {
    const scaleFactor = inputQuantity / (norm.basis_quantity || 1);
    
    return norm.resources.map(resource => {
      if (resource.is_percentage) {
        // Percentage resources: show the percentage value, not scaled by quantity
        return {
          ...resource,
          scaledQuantity: resource.quantity, // Keep as percentage (e.g., 3)
          displayUnit: '%',
          scaleFactor: 1
        };
      } else {
        // Fixed resources: scale by quantity
        return {
          ...resource,
          scaledQuantity: Math.round(resource.quantity * scaleFactor * 100) / 100,
          displayUnit: resource.unit,
          scaleFactor
        };
      }
    });
  };

  const filteredNorms = norms.filter(n =>
    n.description.toLowerCase().includes(search.toLowerCase()) ||
    n.ref_ss?.toLowerCase().includes(search.toLowerCase())
  );

  const reset = () => {
    setSelectedNorm(null);
    setQuantity(1);
    setSearch('');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Calculator size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">ResourceCalc</h1>
              <p className="text-[10px] uppercase tracking-widest font-bold text-black/30">Mobile Edition</p>
            </div>
          </div>
          {selectedNorm && (
            <button 
              onClick={reset}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <X size={20} className="text-black/40" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-6">
        {/* Step 1: Norm Selection */}
        <section className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-widest text-black/40 px-1">
            Step 1: Select Work Item
          </label>
          
          {selectedNorm ? (
            <div 
              onClick={() => setIsSearching(true)}
              className="bg-white p-5 rounded-3xl border border-emerald-500/20 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all"
            >
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                    selectedNorm.type === 'DOR' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {selectedNorm.type}
                  </span>
                  <span className="text-[10px] font-mono text-black/30">{selectedNorm.ref_ss}</span>
                </div>
                <p className="font-bold text-sm leading-tight">{selectedNorm.description}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setIsSearching(true)}
              className="w-full bg-white p-6 rounded-3xl border border-dashed border-black/10 flex flex-col items-center justify-center gap-3 text-black/40 hover:border-emerald-500/40 hover:text-emerald-500 transition-all active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center">
                <Search size={24} />
              </div>
              <span className="text-sm font-bold">Tap to search norms...</span>
            </button>
          )}
        </section>

        {/* Step 2: Quantity */}
        <section className={`space-y-3 transition-opacity duration-300 ${!selectedNorm ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <label className="text-xs font-bold uppercase tracking-widest text-black/40 px-1">
            Step 2: Enter Quantity
          </label>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-black/60">Quantity ({selectedNorm?.unit || 'units'})</span>
              <span className="text-[10px] font-mono text-black/30 italic">Basis: {selectedNorm?.basis_quantity}</span>
            </div>
            <input
              type="number"
              value={quantity}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full text-4xl font-bold font-mono bg-[#F5F5F0] border-none rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              placeholder="0.00"
            />
          </div>
        </section>

        {/* Resource Breakdown - Automatically Shown */}
        <AnimatePresence>
          {selectedNorm && quantity > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-6 pt-4"
            >
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-widest text-black/40">Resource Breakdown</h3>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-tighter">
                  Real-time Results
                </span>
              </div>

              <div className="space-y-6">
                {(() => {
                  const breakdown = calculateResourceBreakdown(selectedNorm, quantity);
                  const groups = [
                    { type: 'Labour', color: 'blue', icon: '👷' },
                    { type: 'Material', color: 'emerald', icon: '📦' },
                    { type: 'Equipment', color: 'orange', icon: '🚜' }
                  ];

                  return groups.map(group => {
                    const items = breakdown.filter(r => r.resource_type === group.type);
                    if (items.length === 0) return null;

                    return (
                      <div key={group.type} className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-lg">{group.icon}</span>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-black/40">{group.type}</h4>
                        </div>
                        <div className="space-y-2">
                          {items.map((item, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm flex items-center justify-between">
                              <div className="flex-1 pr-4">
                                <p className="font-bold text-sm">{item.name}</p>
                                {item.is_percentage ? (
                                  <p className="text-[10px] text-purple-600 font-bold">Percentage of {item.percentage_base || 'Labour'} cost</p>
                                ) : (
                                  <p className="text-[10px] text-black/30">Basis: {item.quantity} {item.unit}</p>
                                )}
                              </div>
                              <div className="text-right">
                                {item.is_percentage ? (
                                  <>
                                    <p className="text-lg font-bold font-mono text-purple-600">
                                      {item.scaledQuantity}%
                                    </p>
                                    <p className="text-[10px] font-bold text-black/30 uppercase">of {item.percentage_base || 'Labour'}</p>
                                  </>
                                ) : (
                                  <>
                                    <p className={`text-lg font-bold font-mono text-${group.color}-600`}>
                                      {item.scaledQuantity.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] font-bold text-black/30 uppercase">{item.displayUnit}</p>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="bg-[#141414] text-white p-6 rounded-[2.5rem] shadow-xl mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={16} className="text-emerald-400" />
                  <h3 className="text-sm font-bold uppercase tracking-widest">Calculation Summary</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase">Scale Factor</p>
                    <p className="text-xl font-bold font-mono text-emerald-400">
                      {(quantity / (selectedNorm.basis_quantity || 1)).toFixed(2)}x
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase">Total Items</p>
                    <p className="text-xl font-bold font-mono text-emerald-400">
                      {selectedNorm.resources.length}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white flex flex-col"
          >
            <div className="p-6 border-b border-black/5 flex items-center gap-4">
              <button 
                onClick={() => setIsSearching(false)}
                className="p-2 hover:bg-black/5 rounded-full transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" size={18} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search work items..."
                  className="w-full pl-12 pr-4 py-3 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredNorms.length > 0 ? (
                filteredNorms.map(norm => (
                  <button
                    key={norm.id}
                    onClick={() => {
                      setSelectedNorm(norm);
                      setIsSearching(false);
                    }}
                    className="w-full text-left p-5 rounded-3xl hover:bg-black/5 active:bg-black/5 transition-colors border border-transparent hover:border-black/5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                        norm.type === 'DOR' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {norm.type}
                      </span>
                      <span className="text-[10px] font-mono text-black/30">{norm.ref_ss}</span>
                    </div>
                    <p className="font-bold text-sm leading-tight mb-1">{norm.description}</p>
                    <p className="text-[10px] text-black/40">Unit: {norm.unit} • Basis: {norm.basis_quantity}</p>
                  </button>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-black/20 space-y-4">
                  <Search size={48} strokeWidth={1} />
                  <p className="font-bold">No items found</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}