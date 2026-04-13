import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Norm, Resource } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function Norms({ norms }: { norms: Norm[] }) {
  const [filter, setFilter] = useState<'ALL' | 'DOR' | 'DUDBC'>('ALL');
  const [search, setSearch] = useState('');
  const [expandedNorm, setExpandedNorm] = useState<number | null>(null);

  // Sort norms by id in ascending order
  const sortedNorms = [...norms].sort((a, b) => a.id - b.id);

  const filteredNorms = sortedNorms.filter((n: Norm) => {
    const matchesFilter = filter === 'ALL' || n.type === filter;
    const matchesSearch = n.description.toLowerCase().includes(search.toLowerCase()) || 
                         n.ref_ss?.toLowerCase().includes(search.toLowerCase()) ||
                         n.sNo?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-black pb-24">
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1 className="text-lg font-bold tracking-tight italic text-white">Norms Library</h1>
          <div className="w-8 h-8" />
        </div>
      </header>

      <main className="max-w-md mx-auto p-3 space-y-3">
        {/* Search & Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="Search norms..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm text-white placeholder:text-zinc-600"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {(['ALL', 'DOR', 'DUDBC'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  filter === type ? 'bg-emerald-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Norm Cards - View Only */}
        <div className="space-y-2">
          {filteredNorms.map(norm => (
            <motion.div 
              layout
              key={norm.id}
              className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm overflow-hidden"
            >
              <div 
                onClick={() => setExpandedNorm(expandedNorm === norm.id ? null : norm.id)}
                className="p-3 space-y-2 active:bg-zinc-800 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase ${
                      norm.type === 'DOR' ? 'bg-blue-950 text-blue-300' : 'bg-purple-950 text-purple-300'
                    }`}>
                      {norm.type}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400">
                      {norm.ref_ss} {norm.sNo ? ` ${norm.sNo}` : ''}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-bold text-xs leading-tight text-white">{norm.description}</h3>
                  <p className="text-[9px] text-zinc-500 mt-0.5">Unit: {norm.unit} • Basis: {norm.basis_quantity}</p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                    {norm.resources.length} Resources
                  </span>
                  {expandedNorm === norm.id ? <ChevronUp size={12} className="text-zinc-500" /> : <ChevronDown size={12} className="text-zinc-500" />}
                </div>
              </div>

              <AnimatePresence>
                {expandedNorm === norm.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-zinc-800/50 border-t border-zinc-800 p-3 space-y-3"
                  >
                    <div className="space-y-3">
                      <ResourceGroup title="Labour" resources={norm.resources.filter(r => r.resource_type === 'Labour')} color="blue" />
                      <ResourceGroup title="Material" resources={norm.resources.filter(r => r.resource_type === 'Material')} color="emerald" />
                      <ResourceGroup title="Equipment" resources={norm.resources.filter(r => r.resource_type === 'Equipment')} color="orange" />
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
  
  const colorClasses = {
    blue: 'text-blue-300',
    emerald: 'text-emerald-300',
    orange: 'text-orange-300'
  };
  
  return (
    <div className="space-y-1.5">
      <h4 className={`text-[9px] font-bold uppercase tracking-widest ${colorClasses[color as keyof typeof colorClasses]}`}>{title}</h4>
      <div className="space-y-1">
        {resources.map((r, i) => (
          <div key={i} className="flex justify-between items-center text-[11px]">
            <span className="text-zinc-300 truncate flex-1 pr-2">{r.name}</span>
            {r.is_percentage ? (
              <span className="font-mono font-bold text-purple-400 text-[11px] shrink-0">
                {r.quantity}% <span className="text-[8px] opacity-50">of {r.percentage_base}</span>
              </span>
            ) : (
              <span className="font-mono font-bold text-white text-[11px] shrink-0">
                {r.quantity} <span className="text-[8px] text-zinc-500">{r.unit || ''}</span>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}