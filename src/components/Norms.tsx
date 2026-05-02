import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
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
    <div className="w-full">
      <main className="w-full space-y-8 pb-8">
        {/* Page Header */}
        <div className="border-b border-[#E2E8F0] pb-6">
          <h1 className="text-5xl font-bold tracking-tight text-[#1E293B]">Norms Library</h1>
          <p className="text-base text-[#64748B] mt-2">Browse all available DOR & DUDBC standards for resource estimation</p>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-6 items-end">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] size-5" />
            <input 
              type="text" 
              placeholder="Search norms by name, code, or description..."
              className="w-full pl-12 pr-4 py-3 bg-white border-2 border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] transition-all text-base text-[#1E293B] placeholder:text-[#94A3B8]"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex bg-white rounded-xl p-1.5 border-2 border-[#E2E8F0] w-fit gap-1">
            {(['ALL', 'DOR', 'DUDBC'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-all ${
                  filter === type 
                    ? 'bg-gradient-to-r from-[#1E293B] to-[#334155] text-white shadow-md' 
                    : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-[#64748B]">
            Showing <span className="font-bold text-[#1E293B]">{filteredNorms.length}</span> of <span className="font-bold text-[#1E293B]">{sortedNorms.length}</span> norms
          </div>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-sm text-[#0EA5E9] hover:text-[#06B6D4] font-semibold underline"
            >
              Clear search
            </button>
          )}
        </div>

        {/* Norms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNorms.length > 0 ? (
            filteredNorms.map(norm => (
              <motion.div 
                layout
                key={norm.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`rounded-3xl border-2 overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer ${
                  expandedNorm === norm.id 
                    ? 'bg-gradient-to-br from-[#EFF6FF] to-[#E0F2FE] border-[#0EA5E9] ring-2 ring-[#0EA5E9]/20 shadow-lg' 
                    : 'bg-white border-[#E2E8F0] hover:border-[#0EA5E9] shadow-sm'
                }`}
              >
                <div 
                  onClick={() => setExpandedNorm(expandedNorm === norm.id ? null : norm.id)}
                  className="p-6 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase shadow-md ${
                        norm.type === 'DOR' 
                          ? 'bg-gradient-to-r from-[#1E293B] to-[#334155] text-white' 
                          : 'bg-gradient-to-r from-[#1E293B] to-[#334155] text-white'
                      }`}>
                        {norm.type}
                      </span>
                    </div>
                    <ChevronDown size={20} className={`text-[#0EA5E9] transition-transform duration-300 ${expandedNorm === norm.id ? 'rotate-180' : ''}`} />
                  </div>
                  
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-[#64748B] mb-2">
                      {norm.ref_ss} {norm.sNo ? ` ${norm.sNo}` : ''}
                    </div>
                    <h3 className="font-bold text-base leading-snug text-[#1E293B] line-clamp-3">{norm.description}</h3>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-[#64748B] pt-2 border-t border-[#E2E8F0]">
                    <span>Unit: <span className="font-semibold text-[#1E293B]">{norm.unit}</span></span>
                    <span>Basis: <span className="font-semibold text-[#1E293B]">{norm.basis_quantity}</span></span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-3 py-1 bg-[#0EA5E9]/10 text-[#0EA5E9] rounded-full font-semibold">
                      {norm.resources.length} Resources
                    </span>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedNorm === norm.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-gradient-to-b from-[#F8FAFC] to-white border-t-2 border-[#E2E8F0] px-6 py-6 space-y-6"
                    >
                      <ResourceGroupWeb title="Labour" resources={norm.resources.filter(r => r.resource_type === 'Labour')} color="text-[#F97316]" bgColor="bg-[#FFF7ED]" />
                      <ResourceGroupWeb title="Material" resources={norm.resources.filter(r => r.resource_type === 'Material')} color="text-[#3B82F6]" bgColor="bg-[#EFF6FF]" />
                      <ResourceGroupWeb title="Equipment" resources={norm.resources.filter(r => r.resource_type === 'Equipment')} color="text-[#10B981]" bgColor="bg-[#F0FDF4]" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center">
              <p className="text-xl font-bold text-[#94A3B8]">No norms found</p>
              <p className="text-sm text-[#94A3B8] mt-2">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </main>
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
