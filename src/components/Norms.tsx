import React, { useState } from 'react';
import { Search, ChevronDown, Library } from 'lucide-react';
import { Norm, Resource } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useDeviceType } from '../utils/device';

export default function Norms({ norms }: { norms: Norm[] }) {
  const [filter, setFilter] = useState<'ALL' | 'DOR' | 'DUDBC'>('ALL');
  const [search, setSearch] = useState('');
  const [expandedNorm, setExpandedNorm] = useState<number | null>(null);
  const { isMobile } = useDeviceType();

  const sortedNorms = [...norms].sort((a, b) => a.id - b.id);

const filteredNorms = sortedNorms.filter((n: Norm) => {
  const matchesFilter = filter === 'ALL' || n.type === filter;
  const searchTerm = search.toLowerCase();
  const matchesSearch = n.description.toLowerCase().includes(searchTerm) || 
                         n.ref_ss?.toLowerCase().includes(searchTerm) ||
                         n.sNo?.toLowerCase().includes(searchTerm);
  return matchesFilter && matchesSearch;
});
  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] pb-24">
        <header className="sticky top-0 z-30 bg-[#1E293B] px-4 py-3 shadow-md">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <h1 className="text-lg font-bold tracking-tight italic text-[#E5AA44]">Norms Library</h1>
            <div className="w-8 h-8" />
          </div>
        </header>

        <main className="max-w-md mx-auto p-3 space-y-3">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#333333]/40" size={16} />
              <input 
                type="text" 
                placeholder="Search norms..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#E0E0E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E5AA44]/20 focus:border-[#E5AA44] transition-all text-sm text-[#333333] placeholder:text-[#333333]/30"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex bg-white p-1 rounded-xl border border-[#E0E0E0]">
              {(['ALL', 'DOR', 'DUDBC'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                    filter === type ? 'bg-[#1E293B] text-white shadow-sm' : 'text-[#333333]/40 hover:text-[#1E293B]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filteredNorms.map(norm => (
              <motion.div 
                layout
                key={norm.id}
                className={`rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 ${
                  expandedNorm === norm.id 
                    ? 'bg-[#EFF6FF] border-[#3B82F6] ring-1 ring-[#3B82F6]/20' 
                    : 'bg-white border-[#E0E0E0]'
                }`}
              >
                <div 
                  onClick={() => setExpandedNorm(expandedNorm === norm.id ? null : norm.id)}
                  className="p-3 space-y-2 active:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase ${
                        norm.type === 'DOR' ? 'bg-[#1E293B] text-white' : 'bg-[#1E293B] text-white'
                      }`}>
                        {norm.type}
                      </span>
                      <span className="text-[9px] font-mono text-[#333333]/50">
                        {norm.ref_ss} {norm.sNo ? ` ${norm.sNo}` : ''}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-xs leading-tight text-[#333333]">{norm.description}</h3>
                    <p className="text-[9px] text-[#333333]/40 mt-0.5">Unit: {norm.unit} • Basis: {norm.basis_quantity}</p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#E0E0E0]">
                    <span className="text-[8px] font-bold text-[#333333]/30 uppercase tracking-widest">
                      {norm.resources.length} Resources
                    </span>
                    {expandedNorm === norm.id ? <ChevronUp size={12} className="text-[#333333]/30" /> : <ChevronDown size={12} className="text-[#333333]/30" />}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedNorm === norm.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-[#F8FAFC] border-t border-[#E0E0E0] p-3 space-y-3"
                    >
                      <div className="space-y-3">
                        <ResourceGroup title="Labour" resources={norm.resources.filter(r => r.resource_type === 'Labour')} color="#1E293B" />
                        <ResourceGroup title="Material" resources={norm.resources.filter(r => r.resource_type === 'Material')} color="#E5AA44" />
                        <ResourceGroup title="Equipment" resources={norm.resources.filter(r => r.resource_type === 'Equipment')} color="#333333" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Web Layout
  return (
    <div className="w-full max-w-6xl space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center mt-0.5">
            <Library size={19} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Norms Library</h1>
            <p className="text-slate-500 text-sm mt-0.5">Browse all DOR & DUDBC engineering standards</p>
          </div>
        </div>
        <div className="text-sm text-slate-500">
          Showing <span className="font-bold text-slate-700">{filteredNorms.length}</span> of <span className="font-bold text-slate-700">{sortedNorms.length}</span> norms
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by name, code, or description..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-sm text-slate-800 placeholder:text-slate-400"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 gap-0.5 w-fit">
          {(['ALL', 'DOR', 'DUDBC'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                filter === type 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-sm text-indigo-600 hover:text-indigo-500 font-semibold px-3"
          >
            Clear
          </button>
        )}
      </div>

      {/* Norms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNorms.length > 0 ? (
          filteredNorms.map(norm => (
            <motion.div 
              layout
              key={norm.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer ${
                expandedNorm === norm.id 
                  ? 'bg-violet-50 border-violet-200 shadow-md ring-1 ring-violet-200' 
                  : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-md'
              }`}
            >
              <div 
                onClick={() => setExpandedNorm(expandedNorm === norm.id ? null : norm.id)}
                className="p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                      norm.type === 'DOR' 
                        ? 'bg-violet-100 text-violet-700' 
                        : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {norm.type}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {norm.ref_ss}{norm.sNo ? ` ${norm.sNo}` : ''}
                    </span>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${expandedNorm === norm.id ? 'rotate-180' : ''}`} />
                </div>
                
                <h3 className="font-semibold text-sm leading-snug text-slate-800 line-clamp-3">{norm.description}</h3>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>Unit: <span className="font-semibold text-slate-700">{norm.unit}</span></span>
                    <span>Basis: <span className="font-semibold text-slate-700">{norm.basis_quantity}</span></span>
                  </div>
                  <span className="px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full text-[10px] font-bold">
                    {norm.resources.length} res.
                  </span>
                </div>
              </div>

              <AnimatePresence>
                {expandedNorm === norm.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="bg-white border-t border-violet-100 px-5 py-4 space-y-4"
                  >
                    <ResourceGroupWeb title="Labour" resources={norm.resources.filter(r => r.resource_type === 'Labour')} color="text-orange-600" bgColor="bg-orange-50" />
                    <ResourceGroupWeb title="Material" resources={norm.resources.filter(r => r.resource_type === 'Material')} color="text-blue-600" bgColor="bg-blue-50" />
                    <ResourceGroupWeb title="Equipment" resources={norm.resources.filter(r => r.resource_type === 'Equipment')} color="text-emerald-600" bgColor="bg-emerald-50" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-16 flex flex-col items-center text-center bg-white rounded-2xl border border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
              <Library size={26} className="text-violet-300" />
            </div>
            <p className="font-bold text-slate-400 text-lg">No norms found</p>
            <p className="text-sm text-slate-300 mt-1">Try adjusting your search or filter</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ResourceGroup({ title, resources, color }: { title: string; resources: Resource[]; color: string }) {
  if (resources.length === 0) return null;
  
  return (
    <div className="space-y-1.5">
      <h4 className={`text-[9px] font-bold uppercase tracking-widest`} style={{ color: color }}>
        {title}
      </h4>
      <div className="space-y-1">
        {resources.map((r, i) => (
          <div key={i} className="flex justify-between items-center text-[11px]">
            <span className="text-[#333333] truncate flex-1 pr-2">{r.name}</span>
            {r.is_percentage ? (
              <span className="font-mono font-bold text-[#E5AA44] text-[11px] shrink-0">
                {r.quantity}% <span className="text-[8px] text-[#333333]/40">of {r.percentage_base}</span>
              </span>
            ) : (
              <span className="font-mono font-bold text-[#1E293B] text-[11px] shrink-0">
                {r.quantity} <span className="text-[8px] text-[#333333]/40">{r.unit || ''}</span>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourceGroupWeb({ title, resources, color, bgColor }: { title: string; resources: Resource[]; color: string; bgColor: string }) {
  if (resources.length === 0) return null;
  
  return (
    <div className={`${bgColor} rounded-xl p-4 space-y-3`}>
      <h4 className={`text-sm font-bold uppercase tracking-widest ${color}`}>
        {title}
      </h4>
      <div className="space-y-2">
        {resources.map((r, i) => (
          <div key={i} className="flex justify-between items-start text-sm bg-white p-3 rounded-lg border border-current border-opacity-10">
            <span className="text-[#1E293B] font-medium flex-1">{r.name}</span>
            {r.is_percentage ? (
              <span className={`font-mono font-bold ${color}`}>
                {r.quantity}%
              </span>
            ) : (
              <span className="font-mono font-bold text-[#1E293B]">
                {r.quantity} <span className="text-xs text-[#94A3B8]">{r.unit}</span>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
