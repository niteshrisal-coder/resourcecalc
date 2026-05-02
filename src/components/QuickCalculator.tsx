import React, { useState } from 'react';
import { Norm } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useDeviceType } from '../utils/device';
import PGCalculator from './PGCalculator.tsx';

export default function QuickCalculator({ norms }: { norms: Norm[] }) {
  const [search, setSearch] = useState('');
  const [selectedNorm, setSelectedNorm] = useState<Norm | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isSearching, setIsSearching] = useState(false);
  const [showPGPage, setShowPGPage] = useState(false);
  const { isMobile } = useDeviceType();

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

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        {showPGPage ? (
          <PGCalculator onBack={() => setShowPGPage(false)} />
        ) : (
          <>
            <main className="w-full p-4 space-y-4">
              {/* Header Card */}
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-extrabold italic text-cyan-300">ResourceCalc</h1>
                    <p className="text-sm text-slate-300 mt-1">Professional resource estimation</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Left column - Input section */}
                <div className="space-y-4">
                  {/* Work Item Selection */}
                  <section className="border border-sky-200 bg-sky-50 rounded-2xl p-4 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-900 mb-3">Work Item</div>
                    {selectedNorm ? (
                      <div 
                        onClick={() => setIsSearching(true)}
                        className="space-y-3 cursor-pointer rounded-xl p-3 -m-1 transition-all duration-200 bg-sky-100 border-2 border-sky-500 shadow-md"
                      >
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
                      <button
                        onClick={() => setIsSearching(true)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                      >
                        Select work item
                      </button>
                    )}
                  </section>

                  {/* Quantity Input */}
                  <section className="border border-sky-200 bg-sky-50 rounded-2xl p-4 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-900 mb-3">Quantity</div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(parseFloat(e.target.value) || 0)}
                        disabled={!selectedNorm}
                        className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder={selectedNorm ? '0.00' : 'Select work item first'}
                      />
                      <span className="text-sm font-semibold text-slate-500">{selectedNorm?.unit || 'unit'}</span>
                    </div>
                  </section>
                  {!selectedNorm && (
                    <button
                      onClick={() => setShowPGPage(true)}
                      className="w-full px-4 py-3 bg-sky-600 text-white rounded-xl text-sm font-semibold hover:bg-sky-700 transition-colors"
                    >
                      PG Calculator
                    </button>
                  )}
                </div>

                {/* Resource Breakdown - Mobile */}
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
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Resource Breakdown</h3>
                        <span className="px-3 py-1 bg-sky-600 text-white rounded-full text-[8px] font-bold uppercase tracking-wider shadow-sm">
                          Live
                        </span>
                      </div>

                      <div className="space-y-5">
                        {(() => {
                          const breakdown = calculateResourceBreakdown(selectedNorm, quantity);
                          const groups = [
                            { type: 'Labour', color: '#1E293B', bg: '#F8FAFC' },
                            { type: 'Material', color: '#1E293B', bg: '#F8FAFC' },
                            { type: 'Equipment', color: '#1E293B', bg: '#F8FAFC' }
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
                                className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                              >
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
                                          {item.is_percentage ? (
                                            <p className="text-[10px] text-sky-600 font-semibold bg-sky-100 px-2 py-1 rounded-full inline-block mt-2">% of {item.percentage_base || 'Labour'}</p>
                                          ) : (
                                            <p className="text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded-full inline-block mt-2">Basis: {item.quantity} {item.unit}</p>
                                          )}
                                        </div>
                                        <div className="text-right shrink-0">
                                          {item.is_percentage ? (
                                            <div>
                                              <p className="text-base font-bold font-mono text-sky-600">
                                                {item.scaledQuantity}%
                                              </p>
                                              <p className="text-[8px] font-semibold text-slate-500 uppercase mt-1">of {item.percentage_base || 'Labour'}</p>
                                            </div>
                                          ) : (
                                            <div>
                                              <p className="text-base font-bold font-mono text-slate-900">
                                                {item.scaledQuantity.toLocaleString()}
                                              </p>
                                              <p className="text-[8px] font-semibold text-slate-500 uppercase mt-1">{item.displayUnit}</p>
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
              </div>
            </main>

            {/* Search Overlay */}
            <AnimatePresence>
              {isSearching && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-slate-50 flex items-center justify-center overflow-hidden"
                >
                  <div className="flex h-full w-full max-w-md flex-col overflow-hidden bg-slate-50">
                    <div className="sticky top-0 bg-slate-50 z-10 p-4 border-b border-slate-200 shadow-sm flex items-center gap-3">
                      <button 
                        onClick={() => setIsSearching(false)}
                        className="text-slate-500 text-sm font-semibold hover:text-sky-600 transition-colors"
                      >
                        Back
                      </button>
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search work items..."
                        className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-200 focus:border-sky-500 transition-all duration-200 text-sm font-medium text-slate-900 placeholder:text-slate-500/40"
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
                            className={`w-full text-left p-4 rounded-2xl transition-all duration-200 hover:shadow-md border ${
                              selectedNorm?.id === norm.id
                                ? 'bg-sky-100 border-sky-500 ring-1 ring-sky-500/20'
                                : 'bg-white border-slate-200 hover:border-sky-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase shadow-sm ${
                                norm.type === 'DOR' 
                                  ? 'bg-slate-900 text-white' 
                                  : 'bg-slate-900 text-white'
                              }`}>
                                {norm.type}
                              </span>
                              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                {norm.ref_ss} {norm.sNo ? ` ${norm.sNo}` : ''}
                              </span>
                              {selectedNorm?.id === norm.id && (
                                <span className="text-[8px] font-bold text-sky-600 bg-white px-2 py-0.5 rounded-full">Selected</span>
                              )}
                            </div>
                            <p className="font-bold text-sm leading-tight text-slate-900 line-clamp-2">{norm.description}</p>
                            <p className="text-[10px] text-slate-500 mt-2 bg-slate-100 px-2 py-1 rounded-full inline-block">Unit: {norm.unit} • Basis: {norm.basis_quantity}</p>
                          </motion.button>
                        ))
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500/50 space-y-4">
                          <p className="font-bold text-lg text-slate-500/70">No items found</p>
                          <p className="text-sm text-center text-slate-500/50">Try adjusting your search terms</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    );
  }

  // Web Layout
  return (
    <div className="w-full pb-0">
      {showPGPage ? (
        <PGCalculator onBack={() => setShowPGPage(false)} />
      ) : (
        <>
          <main className="w-full space-y-8">
            {/* Page Title */}
            <div className="border-b border-[#E2E8F0] pb-6">
              <h1 className="text-5xl font-bold tracking-tight text-[#1E293B]">Calculator</h1>
              <p className="text-base text-[#64748B] mt-2">Estimate resources for your project in seconds</p>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-8">
              {/* Left Column - Input Panel */}
              <div className="lg:col-span-1">
                <div className="sticky top-8 space-y-6">
                  {/* Work Item Card */}
                  <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
                    <div className="mb-4">
                      <label className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Work Item</label>
                    </div>
                    {selectedNorm ? (
                      <div 
                        onClick={() => setIsSearching(true)}
                        className="space-y-4 cursor-pointer p-4 -m-2 transition-all duration-200 bg-gradient-to-br from-[#0EA5E9]/10 to-[#06B6D4]/10 border-2 border-[#0EA5E9] rounded-2xl hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-[#0EA5E9] uppercase tracking-widest mb-1">{selectedNorm.ref_ss} {selectedNorm.sNo || ''}</div>
                            <p className="text-sm font-semibold text-[#1E293B] line-clamp-2">{selectedNorm.description}</p>
                          </div>
                          <span className="text-[11px] font-bold text-[#0EA5E9] bg-white px-2.5 py-1 rounded-lg whitespace-nowrap">Selected</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-[#64748B] pt-2 border-t border-[#0EA5E9]/20">
                          <span>Unit: <span className="font-semibold text-[#1E293B]">{selectedNorm.unit}</span></span>
                          <span>Basis: <span className="font-semibold text-[#1E293B]">{selectedNorm.basis_quantity}</span></span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsSearching(true)}
                        className="w-full px-4 py-4 bg-gradient-to-br from-[#F0F9FF] to-[#F5F3FF] border-2 border-dashed border-[#E0E7FF] rounded-2xl text-center text-sm font-semibold text-[#64748B] hover:from-[#E0F2FE] hover:to-[#F3E8FF] hover:border-[#C7D2FE] transition-all"
                      >
                        Click to select work item
                      </button>
                    )}
                  </div>

                  {/* Quantity Card */}
                  <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm">
                    <div className="mb-4">
                      <label className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Quantity</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(parseFloat(e.target.value) || 0)}
                        disabled={!selectedNorm}
                        className="flex-1 px-4 py-3 rounded-xl border-2 border-[#E2E8F0] bg-white text-lg font-bold text-[#1E293B] outline-none focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        placeholder="0.00"
                      />
                      <span className="text-sm font-bold text-[#64748B] whitespace-nowrap">{selectedNorm?.unit || 'unit'}</span>
                    </div>
                  </div>

                  {!selectedNorm && (
                    <button
                      onClick={() => setShowPGPage(true)}
                      className="w-full px-6 py-3 bg-gradient-to-r from-[#3B82F6] to-[#0EA5E9] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:from-[#2563EB] hover:to-[#06B6D4] transition-all"
                    >
                      + PG Calculator
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column - Results Panel */}
              <div className="lg:col-span-3">
                <AnimatePresence>
                  {selectedNorm && quantity > 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.4 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-[#1E293B]">Resource Breakdown</h2>
                        <span className="px-4 py-2 bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] text-white rounded-full text-xs font-bold uppercase tracking-wider">
                          Live Calculation
                        </span>
                      </div>

                      <div className="space-y-6">
                        {(() => {
                          const breakdown = calculateResourceBreakdown(selectedNorm, quantity);
                          const groups = [
                            { type: 'Labour', color: 'from-[#F97316] to-[#EA580C]', bgLight: 'bg-[#FFF7ED]', textColor: 'text-[#9A3412]', borderColor: 'border-[#FDBA74]' },
                            { type: 'Material', color: 'from-[#3B82F6] to-[#2563EB]', bgLight: 'bg-[#EFF6FF]', textColor: 'text-[#1E40AF]', borderColor: 'border-[#93C5FD]' },
                            { type: 'Equipment', color: 'from-[#10B981] to-[#059669]', bgLight: 'bg-[#F0FDF4]', textColor: 'text-[#15803D]', borderColor: 'border-[#86EFAC]' }
                          ];

                          return groups.map(group => {
                            const items = breakdown.filter(r => r.resource_type === group.type);
                            if (items.length === 0) return null;

                            return (
                              <motion.div 
                                key={group.type} 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className={`rounded-3xl border-2 ${group.borderColor} ${group.bgLight} p-6 shadow-sm hover:shadow-md transition-shadow`}
                              >
                                <div className={`flex items-center gap-3 mb-6 pb-4 border-b border-current border-opacity-10`}>
                                  <h3 className={`text-lg font-bold uppercase tracking-wider ${group.textColor}`}>{group.type}</h3>
                                  <span className={`ml-auto px-3 py-1 bg-white rounded-full text-xs font-bold ${group.textColor} border border-current border-opacity-20`}>
                                    {items.length} items
                                  </span>
                                </div>
                                
                                <div className="space-y-4">
                                  {items.map((item, idx) => (
                                    <motion.div 
                                      key={idx}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: idx * 0.05 }}
                                      className="flex items-center justify-between p-4 bg-white rounded-xl border border-current border-opacity-10 hover:border-opacity-30 transition-all"
                                    >
                                      <div>
                                        <p className="font-semibold text-[#1E293B]">{item.name}</p>
                                        <p className="text-xs text-[#64748B] mt-1">
                                          {item.is_percentage 
                                            ? `${item.percentage_base || 'Labour'} percentage` 
                                            : `Basis: ${item.quantity} ${item.unit}`}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className={`text-lg font-bold font-mono ${group.textColor}`}>
                                          {item.scaledQuantity.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-[#94A3B8] mt-0.5">{item.is_percentage ? '%' : item.displayUnit}</p>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              </motion.div>
                            );
                          });
                        })()}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-96 rounded-3xl border-2 border-dashed border-[#E2E8F0] bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] flex flex-col items-center justify-center text-center p-8"
                    >
                      <div className="text-6xl mb-4">📊</div>
                      <p className="text-lg font-bold text-[#1E293B]">No data to display</p>
                      <p className="text-sm text-[#64748B] mt-2">Select a work item and enter a quantity to see resource breakdown</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </main>

          {/* Search Overlay */}
          <AnimatePresence>
            {isSearching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
                >
                  <div className="sticky top-0 bg-white z-10 p-6 border-b border-[#E2E8F0] flex items-center gap-4">
                    <button 
                      onClick={() => setIsSearching(false)}
                      className="text-[#64748B] text-sm font-semibold hover:text-[#0EA5E9] transition-colors px-3 py-2 rounded-lg hover:bg-[#F1F5F9]"
                    >
                      ✕ Close
                    </button>
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search work items..."
                      className="flex-1 px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] transition-all text-base font-medium text-[#1E293B] placeholder:text-[#94A3B8]"
                      value={search}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    />
                  </div>
                  
                  <div className="max-h-[60vh] overflow-y-auto p-6 space-y-3">
                    {filteredNorms.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredNorms.map(norm => (
                          <motion.button
                            key={norm.id}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            onClick={() => handleSelectNorm(norm)}
                            className={`text-left p-4 rounded-2xl transition-all border-2 ${
                              selectedNorm?.id === norm.id
                                ? 'bg-[#EFF6FF] border-[#0EA5E9] ring-2 ring-[#0EA5E9]/20'
                                : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#0EA5E9] hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-[#1E293B] text-white shadow-sm">
                                {norm.type}
                              </span>
                              <span className="text-[11px] font-semibold text-[#0EA5E9]">
                                {norm.ref_ss} {norm.sNo ? ` ${norm.sNo}` : ''}
                              </span>
                            </div>
                            <p className="font-bold text-sm leading-snug text-[#1E293B] line-clamp-2">{norm.description}</p>
                            <p className="text-[11px] text-[#64748B] mt-2">Unit: {norm.unit} • Basis: {norm.basis_quantity}</p>
                          </motion.button>
                        ))}
                      </div>
                    ) : (
                      <div className="h-40 flex flex-col items-center justify-center text-center">
                        <p className="text-xl font-bold text-[#94A3B8]">No items found</p>
                        <p className="text-sm text-[#94A3B8]/60 mt-2">Try adjusting your search terms</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
