import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Trash2, Edit, ChevronDown, ChevronUp, Info, X, ArrowLeft } from 'lucide-react';
import { Norm, Resource, Rate } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function Norms({ norms, setNorms }: { norms: Norm[], setNorms: React.Dispatch<React.SetStateAction<Norm[]>> }) {
  const [filter, setFilter] = useState<'ALL' | 'DOR' | 'DUDBC'>('ALL');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNorm, setEditingNorm] = useState<Norm | null>(null);
  const [expandedNorm, setExpandedNorm] = useState<number | null>(null);

  const handleDelete = (id: number) => {
    if (!confirm('Are you sure you want to delete this norm?')) return;
    setNorms(prev => prev.filter(n => n.id !== id));
  };

  const handleSave = (normData: Norm) => {
    if (editingNorm) {
      setNorms(prev => prev.map(n => n.id === editingNorm.id ? normData : n));
    } else {
      const newId = norms.length > 0 ? Math.max(...norms.map(n => n.id)) + 1 : 1;
      setNorms(prev => [...prev, { ...normData, id: newId }]);
    }
    setIsModalOpen(false);
  };

  const filteredNorms = norms.filter(n => {
    const matchesFilter = filter === 'ALL' || n.type === filter;
    const matchesSearch = n.description.toLowerCase().includes(search.toLowerCase()) || 
                         n.ref_ss?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1 className="text-xl font-bold tracking-tight italic">Norms Library</h1>
          <button 
            onClick={() => { setEditingNorm(null); setIsModalOpen(true); }}
            className="w-10 h-10 bg-[#141414] text-white rounded-xl flex items-center justify-center shadow-lg shadow-black/10 active:scale-95 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Search & Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" size={18} />
            <input 
              type="text" 
              placeholder="Search norms..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex bg-white p-1 rounded-2xl border border-black/5 overflow-x-auto no-scrollbar">
            {(['ALL', 'DOR', 'DUDBC'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`flex-1 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                  filter === type ? 'bg-[#141414] text-white shadow-md' : 'text-black/40 hover:text-black/60'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Norm Cards */}
        <div className="space-y-3">
          {filteredNorms.map(norm => (
            <motion.div 
              layout
              key={norm.id}
              className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden"
            >
              <div 
                onClick={() => setExpandedNorm(expandedNorm === norm.id ? null : norm.id)}
                className="p-5 space-y-3 active:bg-black/5 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                      norm.type === 'DOR' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {norm.type}
                    </span>
                    <span className="text-[10px] font-mono text-black/30">{norm.ref_ss}</span>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => { setEditingNorm(norm); setIsModalOpen(true); }}
                      className="p-2 text-black/30 hover:text-black transition-colors"
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(norm.id)}
                      className="p-2 text-red-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-bold text-sm leading-tight">{norm.description}</h3>
                  <p className="text-[10px] text-black/40 mt-1">Unit: {norm.unit} • Basis: {norm.basis_quantity}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-black/5">
                  <span className="text-[10px] font-bold text-black/20 uppercase tracking-widest">
                    {norm.resources.length} Resources
                  </span>
                  {expandedNorm === norm.id ? <ChevronUp size={16} className="text-black/20" /> : <ChevronDown size={16} className="text-black/20" />}
                </div>
              </div>

              <AnimatePresence>
                {expandedNorm === norm.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-[#F5F5F0]/50 border-t border-black/5 p-5 space-y-4"
                  >
                    <div className="space-y-4">
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

      {isModalOpen && (
        <NormModal 
          norm={editingNorm} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSave} 
        />
      )}
    </div>
  );
}

function ResourceGroup({ title, resources, color }: { title: string, resources: Resource[], color: string }) {
  if (resources.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className={`text-[9px] font-bold uppercase tracking-widest text-${color}-600/60`}>{title}</h4>
      <div className="space-y-1">
        {resources.map((r, i) => (
          <div key={i} className="flex justify-between items-center text-xs">
            <span className="text-black/60">{r.name}</span>
            <span className="font-mono font-bold">
              {r.quantity} <span className="text-[9px] opacity-40">{r.unit}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NormModal({ norm, onClose, onSave }: { norm: Norm | null, onClose: () => void, onSave: (norm: Norm) => void }) {
  const [formData, setFormData] = useState<Norm>(norm || {
    id: 0,
    type: 'DOR',
    description: '',
    unit: '',
    basis_quantity: 1,
    ref_ss: '',
    resources: []
  });

  const [newResource, setNewResource] = useState<Resource>({
    resource_type: 'Labour',
    name: '',
    unit: '',
    quantity: 0
  });

  const addResource = () => {
    if (!newResource.name || newResource.quantity <= 0) return;
    setFormData({
      ...formData,
      resources: [...formData.resources, { ...newResource }]
    });
    setNewResource({ ...newResource, name: '', unit: '', quantity: 0 });
  };

  const removeResource = (index: number) => {
    setFormData({
      ...formData,
      resources: formData.resources.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      <header className="p-6 border-b border-black/5 flex items-center justify-between bg-white sticky top-0">
        <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold">{norm ? 'Edit Norm' : 'New Norm'}</h2>
        <button 
          onClick={() => onSave(formData)}
          className="bg-[#141414] text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-black/10 active:scale-95 transition-all"
        >
          Save
        </button>
      </header>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-black/40 px-1">Basic Information</h3>
          <div className="space-y-4 bg-[#F5F5F0] p-6 rounded-3xl">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Type</label>
              <div className="flex bg-white p-1 rounded-xl border border-black/5">
                {(['DOR', 'DUDBC'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFormData({ ...formData, type: t })}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
                      formData.type === t ? 'bg-[#141414] text-white shadow-sm' : 'text-black/40'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Description</label>
              <textarea 
                className="w-full p-4 bg-white rounded-xl border-none focus:ring-2 focus:ring-emerald-500/20 text-sm min-h-[100px]"
                placeholder="e.g. Earthwork in excavation..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Unit</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-white rounded-xl border-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-mono"
                  placeholder="m3"
                  value={formData.unit}
                  onChange={e => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Basis Qty</label>
                <input 
                  type="number" 
                  className="w-full p-3 bg-white rounded-xl border-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-mono"
                  value={formData.basis_quantity}
                  onChange={e => setFormData({ ...formData, basis_quantity: parseFloat(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Ref to SS</label>
              <input 
                type="text" 
                className="w-full p-3 bg-white rounded-xl border-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                placeholder="Clause 601"
                value={formData.ref_ss}
                onChange={e => setFormData({ ...formData, ref_ss: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Resources */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-black/40 px-1">Resource Breakdown</h3>
          
          {/* Add Resource Form */}
          <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <select 
                className="p-3 bg-white rounded-xl border-none text-xs font-bold"
                value={newResource.resource_type}
                onChange={e => setNewResource({ ...newResource, resource_type: e.target.value as any })}
              >
                <option value="Labour">Labour</option>
                <option value="Material">Material</option>
                <option value="Equipment">Equipment</option>
              </select>
              <input 
                type="text" 
                placeholder="Unit"
                className="p-3 bg-white rounded-xl border-none text-xs font-mono"
                value={newResource.unit}
                onChange={e => setNewResource({ ...newResource, unit: e.target.value })}
              />
            </div>
            <input 
              type="text" 
              placeholder="Resource Name"
              className="w-full p-3 bg-white rounded-xl border-none text-xs"
              value={newResource.name}
              onChange={e => setNewResource({ ...newResource, name: e.target.value })}
            />
            <div className="flex gap-3">
              <input 
                type="number" 
                placeholder="Qty"
                className="flex-1 p-3 bg-white rounded-xl border-none text-xs font-mono"
                value={newResource.quantity || ''}
                onChange={e => setNewResource({ ...newResource, quantity: parseFloat(e.target.value) || 0 })}
              />
              <button 
                onClick={addResource}
                className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold text-xs active:scale-95 transition-all"
              >
                Add
              </button>
            </div>
          </div>

          {/* Resource List */}
          <div className="space-y-2">
            {formData.resources.map((res, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-black/5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${
                    res.resource_type === 'Labour' ? 'bg-blue-500' : 
                    res.resource_type === 'Material' ? 'bg-emerald-500' : 'bg-orange-500'
                  }`} />
                  <div>
                    <p className="text-xs font-bold">{res.name}</p>
                    <p className="text-[10px] text-black/30 uppercase">{res.resource_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono">{res.quantity}</p>
                    <p className="text-[10px] text-black/30 uppercase">{res.unit}</p>
                  </div>
                  <button 
                    onClick={() => removeResource(idx)}
                    className="p-2 text-red-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {formData.resources.length === 0 && (
              <div className="text-center py-8 text-black/20 italic text-sm">
                No resources added yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
