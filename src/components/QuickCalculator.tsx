import React, { useState } from 'react';
import { Norm } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function QuickCalculator({ norms }: { norms: Norm[] }) {
  const [search, setSearch] = useState('');
  const [selectedNorm, setSelectedNorm] = useState<Norm | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isSearching, setIsSearching] = useState(false);

  const sortedNorms = [...norms].sort((a, b) => a.id - b.id);

  const calculateResourceBreakdown = (norm: Norm, inputQuantity: number) => {
    const scaleFactor = inputQuantity / (norm.basis_quantity || 1);
    
    return norm.resources.map(resource => {
      if (resource.is_percentage) {
        return {
          ...resource,
          scaledQuantity: resource.quantity,
          displayUnit: '%',
          scaleFactor: 1
        };
      } else {
        return {
          ...resource,
          scaledQuantity: Math.round(resource.quantity * scaleFactor * 100) / 100,
          displayUnit: resource.unit,
          scaleFactor
        };
      }
    });
  };

  const filteredNorms = sortedNorms.filter(n =>
    n.description.toLowerCase().includes(search.toLowerCase()) ||
    n.ref_ss?.toLowerCase().includes(search.toLowerCase()) ||
    n.sNo?.toLowerCase().includes(search.toLowerCase())
  );

  const reset = () => {
    setSelectedNorm(null);
    setQuantity(1);
    setSearch('');
  };

  const handleSelectNorm = (norm: Norm) => {
    setSelectedNorm(norm);
    setIsSearching(false);
  };

  return (
    <div className="min-h-screen bg-[#FFF5F2] pb-24">
      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Header Card */}
        <div className="rounded-2xl border border-[#E0E0E0] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-[#2C1338]">ResourceCalc</h1>
              <p className="text-sm text-[#333333]/60 mt-1">Professional resource estimation</p>
            </div>
          </div>
        </div>

        {/* Work Item Selection */}
        <section className="border border-[#E0E0E0] bg-white rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2C1338] mb-3">Work Item</div>
          {selectedNorm ? (
            <div 
              onClick={() => setIsSearching(true)}
              className="space-y-3 cursor-pointer hover:bg-[#FFF5F2] rounded-xl p-2 -m-2 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-[#E5AA44]">{selectedNorm.ref_ss} {selectedNorm.sNo || ''}</div>
                <span className="text-[10px] text-[#333333]/40 bg-[#FFF5F2] px-2 py-1 rounded-full">Tap to change</span>
              </div>
              <p className="text-sm text-[#333333] leading-6">{selectedNorm.description}</p>
              <div className="flex flex-wrap gap-3 text-xs text-[#333333]/50 mt-2">
                <span>Unit: {selectedNorm.unit}</span>
                <span>Basis: {selectedNorm.basis_quantity}</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsSearching(true)}
              className="w-full rounded-2xl border border-[#E0E0E0] bg-white px-4 py-4 text-left text-sm font-semibold text-[#333333]/50 hover:bg-[#FFF5F2] transition-colors"
            >
              Select work item
            </button>
          )}
        </section>

        {/* Quantity Input */}
        <section className="border border-[#E0E0E0] bg-white rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2C1338] mb-3">Quantity</div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={quantity}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(parseFloat(e.target.value) || 0)}
              disabled={!selectedNorm}
              className="flex-1 rounded-2xl border border-[#E0E0E0] bg-white px-3 py-2 text-base font-semibold text-[#333333] outline-none focus:border-[#E5AA44] focus:ring-2 focus:ring-[#E5AA44]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder={selectedNorm ? '0.00' : 'Select work item first'}
            />
            <span className="text-sm font-semibold text-[#333333]/60">{selectedNorm?.unit || 'unit'}</span>
          </div>
        </section>

        {/* Resource Breakdown */}
        <AnimatePresence>
          {selectedNorm && quantity > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="space-y-5 pt-2"
            >
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2C1338]">Resource Breakdown</h3>
                <span className="px-3 py-1 bg-[#E5AA44] text-white rounded-full text-[8px] font-bold uppercase tracking-wider shadow-sm">
                  Live
                </span>
              </div>

              <div className="space-y-5">
                {(() => {
                  const breakdown = calculateResourceBreakdown(selectedNorm, quantity);
                  const groups = [
                    { type: 'Labour', color: '#2C1338', bg: '#FFF5F2' },
                    { type: 'Material', color: '#2C1338', bg: '#FFF5F2' },
                    { type: 'Equipment', color: '#2C1338', bg: '#FFF5F2' }
                  ];

                  return groups.map(group => {
                    const items = breakdown.filter(r => r.resource_type === group.type);
                    if (items.length === 0) return null;

                    return (
                      <motion.div 
                        key={group.type} 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="rounded-2xl border border-[#E0E0E0] bg-white shadow-sm"
                      >
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E0E0E0]">
                          <div className="w-2 h-2 rounded-full bg-[#E5AA44]" />
                          <h4 className="text-sm font-bold uppercase tracking-wide text-[#2C1338]">{group.type}</h4>
                        </div>
                        <div className="divide-y divide-[#E0E0E0]">
                          {items.map((item, idx) => (
                            <div key={idx} className="px-4 py-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 pr-3">
                                  <p className="font-bold text-sm leading-tight text-[#333333]">{item.name}</p>
                                  {item.is_percentage ? (
                                    <p className="text-[10px] text-[#E5AA44] font-semibold bg-[#FFF5F2] px-2 py-1 rounded-full inline-block mt-2">% of {item.percentage_base || 'Labour'}</p>
                                  ) : (
                                    <p className="text-[10px] text-[#333333]/50 bg-[#FFF5F2] px-2 py-1 rounded-full inline-block mt-2">Basis: {item.quantity} {item.unit}</p>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  {item.is_percentage ? (
                                    <div>
                                      <p className="text-lg font-bold font-mono text-[#E5AA44]">
                                        {item.scaledQuantity}%
                                      </p>
                                      <p className="text-[8px] font-semibold text-[#333333]/50 uppercase mt-1">of {item.percentage_base || 'Labour'}</p>
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="text-lg font-bold font-mono text-[#2C1338]">
                                        {item.scaledQuantity.toLocaleString()}
                                      </p>
                                      <p className="text-[8px] font-semibold text-[#333333]/50 uppercase mt-1">{item.displayUnit}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  });
                })()}
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
            className="fixed inset-0 z-50 bg-[#FFF5F2] flex items-center justify-center overflow-hidden"
          >
            <div className="flex h-full w-full max-w-md flex-col overflow-hidden bg-[#FFF5F2]">
              <div className="sticky top-0 bg-white z-10 p-4 border-b border-[#E0E0E0] shadow-sm flex items-center gap-3">
                <button 
                  onClick={() => setIsSearching(false)}
                  className="text-[#333333] text-sm font-semibold hover:text-[#E5AA44] transition-colors"
                >
                  Back
                </button>
                <input
                  autoFocus
                  type="text"
                  placeholder="Search work items..."
                  className="flex-1 px-4 py-3 bg-white border border-[#E0E0E0] rounded-2xl focus:ring-2 focus:ring-[#E5AA44]/20 focus:border-[#E5AA44] transition-all duration-200 text-sm font-medium text-[#333333] placeholder:text-[#333333]/30"
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredNorms.length > 0 ? (
                  filteredNorms.map(norm => (
                    <motion.button
                      key={norm.id}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      onClick={() => handleSelectNorm(norm)}
                      className="w-full text-left p-4 rounded-2xl hover:bg-white active:bg-white transition-all duration-200 hover:shadow-md border border-[#E0E0E0] bg-white"
                    >
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase shadow-sm ${
                          norm.type === 'DOR' 
                            ? 'bg-[#2C1338] text-white' 
                            : 'bg-[#2C1338] text-white'
                        }`}>
                          {norm.type}
                        </span>
                        <span className="text-[10px] font-medium text-[#333333]/50 bg-[#FFF5F2] px-2 py-1 rounded-full">
                          {norm.ref_ss} {norm.sNo ? ` ${norm.sNo}` : ''}
                        </span>
                      </div>
                      <p className="font-bold text-sm leading-tight text-[#333333] line-clamp-2">{norm.description}</p>
                      <p className="text-[10px] text-[#333333]/50 mt-2 bg-[#FFF5F2] px-2 py-1 rounded-full inline-block">Unit: {norm.unit} • Basis: {norm.basis_quantity}</p>
                    </motion.button>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-[#333333]/40 space-y-4">
                    <p className="font-bold text-lg text-[#333333]/60">No items found</p>
                    <p className="text-sm text-center text-[#333333]/40">Try adjusting your search terms</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}