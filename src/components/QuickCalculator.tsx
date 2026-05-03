import React, { useState } from 'react';
import { Norm } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useDeviceType } from '../utils/device';

export default function QuickCalculator({ norms }: { norms: Norm[] }) {
  const [search, setSearch] = useState('');
  const [selectedNorm, setSelectedNorm] = useState<Norm | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isSearching, setIsSearching] = useState(false);
  const { isMobile } = useDeviceType();

  const sortedNorms = [...norms].sort((a, b) => a.id - b.id);

  const calculateResourceBreakdown = (norm: Norm, inputQuantity: number) => {
    const scaleFactor = inputQuantity / (norm.basis_quantity || 1);
    return norm.resources.map(resource => {
      if (resource.is_percentage) {
        return { ...resource, scaledQuantity: resource.quantity, displayUnit: '%', scaleFactor: 1 };
      }
      return {
        ...resource,
        scaledQuantity: Math.round(resource.quantity * scaleFactor * 100) / 100,
        displayUnit: resource.unit,
        scaleFactor
      };
    });
  };

  const getFilteredNorms = () => {
    const searchLower = search.toLowerCase().trim();
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
      return `${n.ref_ss} ${n.sNo || ''} ${n.description}`.toLowerCase().includes(searchTerm);
    });
  };

  const filteredNorms = getFilteredNorms();

  const reset = () => {
    setSelectedNorm(null);
    setQuantity(1);
    setSearch('');
  };

  const handleSelectNorm = (norm: Norm) => {
    setSelectedNorm(norm);
    setIsSearching(false);
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <main className="w-full p-4 space-y-4">
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-extrabold italic text-cyan-300">ResourceCalc</h1>
                <p className="text-sm text-slate-300 mt-1">Professional resource estimation</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-4">
              <section className="border border-sky-200 bg-sky-50 rounded-2xl p-4 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-900 mb-3">Work Item</div>
                {selectedNorm ? (
                  <div onClick={() => setIsSearching(true)} className="space-y-3 cursor-pointer rounded-xl p-3 -m-1 transition-all duration-200 bg-sky-100 border-2 border-sky-500 shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-sky-700">{selectedNorm.ref_ss} {selectedNorm.sNo || ''}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-sky-700 bg-white px-2 py-0.5 rounded-full">✓ Selected</span>
                        <span className="text-[10px] text-slate-500 bg-white px-2 py-1 rounded-full">Tap to change</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-900 leading-6 font-medium">{selectedNorm.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-2">
                      <span>Unit: {selectedNorm.unit}</span>
                      <span>Basis: {selectedNorm.basis_quantity}</span>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setIsSearching(true)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
                    Select work item
                  </button>
                )}
              </section>
              <section className="border border-sky-200 bg-sky-50 rounded-2xl p-4 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-900 mb-3">Quantity</div>
                <div className="flex items-center gap-3">
                  <input type="number" value={quantity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(parseFloat(e.target.value) || 0)} disabled={!selectedNorm} className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:opacity-50 disabled:cursor-not-allowed" placeholder={selectedNorm ? '0.00' : 'Select work item first'} />
                  <span className="text-sm font-semibold text-slate-500">{selectedNorm?.unit || 'unit'}</span>
                </div>
              </section>
            </div>
            <AnimatePresence>
              {selectedNorm && quantity > 0 && (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} transition={{ duration: 0.5, ease: 'easeOut' }} className="space-y-5 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Resource Breakdown</h3>
                    <span className="px-3 py-1 bg-sky-600 text-white rounded-full text-[8px] font-bold uppercase tracking-wider shadow-sm">Live</span>
                  </div>
                  <div className="space-y-5">
                    {(() => {
                      const breakdown = calculateResourceBreakdown(selectedNorm, quantity);
                      const groups = [
                        { type: 'Labour' },
                        { type: 'Material' },
                        { type: 'Equipment' }
                      ];
                      return groups.map(group => {
                        const items = breakdown.filter(r => r.resource_type === group.type);
                        if (!items.length) return null;
                        return (
                          <motion.div key={group.type} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
                              <div className="w-2 h-2 rounded-full bg-sky-600" />
                              <h4 className="text-sm font-bold uppercase tracking-wide text-slate-900">{group.type}</h4>
                            </div>
                            <div className="divide-y divide-slate-200">
                              {items.map((item, idx) => (
                                <div key={idx} className="px-4 py-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 pr-3">
                                      <p className="font-bold text-sm leading-tight text-slate-900">{item.name}</p>
                                      <p className={`text-[10px] font-semibold ${item.is_percentage ? 'text-sky-600 bg-sky-100' : 'text-slate-500 bg-slate-100'} px-2 py-1 rounded-full inline-block mt-2`}>{item.is_percentage ? `% of ${item.percentage_base || 'Labour'}` : `Basis: ${item.quantity} ${item.unit}`}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className={`text-base font-bold font-mono ${item.is_percentage ? 'text-sky-600' : 'text-slate-900'}`}>{item.is_percentage ? `${item.scaledQuantity}%` : item.scaledQuantity.toLocaleString()}</p>
                                      <p className="text-[8px] font-semibold text-slate-500 uppercase mt-1">{item.is_percentage ? `of ${item.percentage_base || 'Labour'}` : item.displayUnit}</p>
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
          </div>
        </main>
        <AnimatePresence>
          {isSearching && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-50 flex items-center justify-center overflow-hidden">
              <div className="flex h-full w-full max-w-md flex-col overflow-hidden bg-slate-50">
                <div className="sticky top-0 bg-slate-50 z-10 p-4 border-b border-slate-200 shadow-sm flex items-center gap-3">
                  <button onClick={() => setIsSearching(false)} className="text-slate-500 text-sm font-semibold hover:text-sky-600 transition-colors">Back</button>
                  <input autoFocus type="text" placeholder="Search work items..." className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-200 focus:border-sky-500 transition-all duration-200 text-sm font-medium text-slate-900 placeholder:text-slate-500/40" value={search} onChange={(e) => setSearch(e.target.value)} />
                  <button onClick={reset} className="text-slate-500 text-xs font-semibold hover:text-sky-600 transition-colors">Reset</button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <div className="space-y-2">
                    {filteredNorms.map(norm => (
                      <button key={norm.id} onClick={() => handleSelectNorm(norm)} className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300">
                        <div className="text-sm font-semibold text-sky-700">{norm.ref_ss} {norm.sNo || ''}</div>
                        <div className="text-sm text-slate-900 mt-1">{norm.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return <div className="min-h-[60vh] bg-white rounded-2xl border border-slate-200 shadow-sm p-8">QuickCalculator desktop view restored.</div>;
}