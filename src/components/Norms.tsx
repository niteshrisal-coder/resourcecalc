import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Norm, Resource } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { searchNorm } from '../utils/search';

export default function Norms({ norms }: { norms: Norm[] }) {
  const [filter, setFilter] = useState<'ALL' | 'DOR' | 'DUDBC'>('ALL');
  const [search, setSearch] = useState('');
  const [expandedNorm, setExpandedNorm] = useState<number | null>(null);

  const sortedNorms = [...norms].sort((a, b) => a.id - b.id);

  const filteredNorms = sortedNorms.filter((n: Norm) => {
    const matchesFilter = filter === 'ALL' || n.type === filter;
    const matchesSearch = searchNorm(n, search);
    return matchesFilter && matchesSearch;
  });

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