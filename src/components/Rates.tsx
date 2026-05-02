import React, { useEffect, useMemo, useRef, useState, ChangeEvent } from 'react';
import { Plus, Search, Trash2, Edit, X } from 'lucide-react';
import { Rate } from '../types';
import { motion } from 'motion/react';
import { getRates, saveRate, deleteRate } from '../utils/storage';
import { useDeviceType } from '../utils/device';

export default function Rates() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'Labour' | 'Material' | 'Equipment'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<Rate | null>(null);
  const [rateInputs, setRateInputs] = useState<Record<number, string>>({});
  const { isMobile } = useDeviceType();
  const saveTimersRef = useRef<Record<number, number | undefined>>({});

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = () => {
    const loadedRates = getRates();
    setRates(loadedRates);
    setRateInputs(prev => {
      const next = { ...prev };
      loadedRates.forEach(r => {
        if (next[r.id] === undefined) next[r.id] = String(r.rate ?? 0);
      });
      return next;
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm('Delete this rate?')) return;
    deleteRate(id);
    setRates(prev => prev.filter(r => r.id !== id));
    setRateInputs(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const filteredRates = useMemo(() => {
    return rates.filter(r => {
      const matchesFilter = filter === 'ALL' || r.resource_type === filter;
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [rates, filter, search]);

  const commitRate = (updated: Rate) => {
    saveRate(updated);
    setRates(prev => prev.map(r => (r.id === updated.id ? updated : r)));
  };

  const scheduleCommitRate = (updated: Rate) => {
    const existing = saveTimersRef.current[updated.id];
    if (existing) window.clearTimeout(existing);
    saveTimersRef.current[updated.id] = window.setTimeout(() => {
      commitRate(updated);
      saveTimersRef.current[updated.id] = undefined;
    }, 400);
  };

  const parseRateInput = (raw: string): number | null => {
    if (raw.trim() === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return n < 0 ? 0 : n;
  };

  // Mobile layout
  if (isMobile) {
    return (
      <div className="p-4 space-y-4 pb-24">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter italic">Resource Rates</h1>
          <p className="text-black/50 text-sm">Define unit rates for labour, materials, and equipment.</p>
        </div>

        <button 
          onClick={() => { setEditingRate(null); setIsModalOpen(true); }}
          className="w-full bg-[#141414] text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg shadow-black/10"
        >
          <Plus size={20} />
          Add Rate
        </button>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" size={18} />
          <input 
            type="text" 
            placeholder="Search resources..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(['ALL', 'Labour', 'Material', 'Equipment'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${filter === type ? 'bg-[#141414] text-white shadow-md' : 'bg-white text-black/40 border border-black/5'}`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filteredRates.length === 0 ? (
            <div className="text-center py-8 text-black/20 italic">
              No resources found matching your search.
            </div>
          ) : (
            filteredRates.map(rate => {
              const inputValue = rateInputs[rate.id] ?? String(rate.rate ?? 0);
              const parsed = parseRateInput(inputValue);
              const effectiveRate = parsed ?? (rate.rate ?? 0);
              const vatAmount = rate.apply_vat ? effectiveRate * 0.13 : 0;
              const totalWithVat = effectiveRate + vatAmount;

              return (
                <div key={rate.id} className="bg-white rounded-2xl p-4 border border-black/5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tighter ${
                          rate.resource_type === 'Labour' ? 'bg-blue-100 text-blue-700' : 
                          rate.resource_type === 'Material' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {rate.resource_type}
                        </span>
                      </div>
                      <p className="font-bold text-sm">{rate.name}</p>
                      <p className="text-xs text-black/40">{rate.unit}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setEditingRate(rate); setIsModalOpen(true); }} 
                        className="p-2 hover:bg-black/5 rounded-xl text-black/40 hover:text-black transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(rate.id)} 
                        className="p-2 hover:bg-red-50 rounded-xl text-red-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-black/5">
                    <div className="flex justify-between items-center text-sm mb-2 gap-3">
                      <span className="text-black/40 text-xs font-bold uppercase">Rate (Excl. VAT)</span>
                      <input
                        inputMode="decimal"
                        type="number"
                        className="w-32 p-2 bg-[#F5F5F0] rounded-xl border-none text-right font-bold focus:ring-2 focus:ring-black/10"
                        value={inputValue}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const nextVal = e.target.value;
                          setRateInputs(prev => ({ ...prev, [rate.id]: nextVal }));
                          const nextParsed = parseRateInput(nextVal);
                          if (nextParsed === null) return;
                          scheduleCommitRate({ ...rate, rate: nextParsed });
                        }}
                        onBlur={() => {
                          const nextParsed = parseRateInput(rateInputs[rate.id] ?? '');
                          if (nextParsed === null) {
                            setRateInputs(prev => ({ ...prev, [rate.id]: String(rate.rate ?? 0) }));
                            return;
                          }
                          commitRate({ ...rate, rate: nextParsed });
                        }}
                        min="0"
                        step="1"
                      />
                    </div>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-black/40 text-xs font-bold uppercase">Apply VAT (13%)</span>
                      <input
                        type="checkbox"
                        checked={!!rate.apply_vat}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => commitRate({ ...rate, apply_vat: (e.target as HTMLInputElement).checked })}
                        className="w-5 h-5 rounded border-black/10 text-black focus:ring-black/5"
                      />
                    </div>
                    {rate.apply_vat && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-black/40 text-xs font-bold uppercase">Total with VAT</span>
                        <span className="font-bold text-emerald-600">Rs. {totalWithVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {isModalOpen && (
          <RateModal 
            rate={editingRate} 
            onClose={() => setIsModalOpen(false)} 
            onSave={() => { loadRates(); setIsModalOpen(false); }} 
          />
        )}
      </div>
    );
  }

  // Web layout
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tighter italic">Resource Rates</h1>
          <p className="text-black/50">Define unit rates for labour, materials, and equipment.</p>
        </div>
        <button 
          onClick={() => { setEditingRate(null); setIsModalOpen(true); }}
          className="bg-[#141414] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-black/10"
        >
          <Plus size={20} />
          Add Rate
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" size={18} />
          <input 
            type="text" 
            placeholder="Search resources..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-black/5">
          {(['ALL', 'Labour', 'Material', 'Equipment'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${filter === type ? 'bg-[#141414] text-white shadow-md' : 'text-black/40 hover:text-black/60'}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F5F5F0]/50 border-b border-black/5">
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40">Type</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40">Resource Name</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40">Unit</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right">Rate (Excl. VAT)</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 text-center">Apply VAT</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right">Total with VAT</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {filteredRates.map(rate => {
              const inputValue = rateInputs[rate.id] ?? String(rate.rate ?? 0);
              const parsed = parseRateInput(inputValue);
              const effectiveRate = parsed ?? (rate.rate ?? 0);
              const vatAmount = rate.apply_vat ? effectiveRate * 0.13 : 0;
              const totalWithVat = effectiveRate + vatAmount;

              return (
                <tr key={rate.id} className="hover:bg-black/5 transition-colors group">
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tighter ${
                      rate.resource_type === 'Labour' ? 'bg-blue-100 text-blue-700' : 
                      rate.resource_type === 'Material' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {rate.resource_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-sm">{rate.name}</td>
                  <td className="px-6 py-4 text-xs font-mono text-black/40">{rate.unit}</td>
                  <td className="px-6 py-4 text-right">
                    <input
                      inputMode="decimal"
                      type="number"
                      className="w-32 p-2 bg-[#F5F5F0] rounded-lg border-none text-right font-bold focus:ring-2 focus:ring-black/10"
                      value={inputValue}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const nextVal = e.target.value;
                        setRateInputs(prev => ({ ...prev, [rate.id]: nextVal }));
                        const nextParsed = parseRateInput(nextVal);
                        if (nextParsed === null) return;
                        scheduleCommitRate({ ...rate, rate: nextParsed });
                      }}
                      onBlur={() => {
                        const nextParsed = parseRateInput(rateInputs[rate.id] ?? '');
                        if (nextParsed === null) {
                          setRateInputs(prev => ({ ...prev, [rate.id]: String(rate.rate ?? 0) }));
                          return;
                        }
                        commitRate({ ...rate, rate: nextParsed });
                      }}
                      min="0"
                      step="1"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={!!rate.apply_vat}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => commitRate({ ...rate, apply_vat: (e.target as HTMLInputElement).checked })}
                      className="w-4 h-4 rounded border-black/10 text-black focus:ring-black/5"
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-bold tracking-tighter">Rs. {totalWithVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingRate(rate); setIsModalOpen(true); }} 
                        className="p-2 hover:bg-black/5 rounded-xl text-black/40 hover:text-black transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(rate.id)} 
                        className="p-2 hover:bg-red-50 rounded-xl text-red-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredRates.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-black/20 italic">
                  No resources found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <RateModal 
          rate={editingRate} 
          onClose={() => setIsModalOpen(false)} 
          onSave={() => { loadRates(); setIsModalOpen(false); }} 
        />
      )}
    </div>
  );
}

function RateModal({ rate, onClose, onSave }: { rate: Rate | null, onClose: () => void, onSave: () => void }) {
  const [formData, setFormData] = useState<Partial<Rate>>(rate || {
    resource_type: 'Labour',
    name: '',
    unit: '',
    rate: 0,
    apply_vat: false
  });

  const handleSave = () => {
    if (!formData.name || !formData.unit || !formData.rate === undefined) {
      alert('Please fill in all fields');
      return;
    }
    
    const rateToSave: Rate = {
      id: rate?.id || 0,
      name: formData.name || '',
      unit: formData.unit || '',
      rate: formData.rate || 0,
      resource_type: formData.resource_type || 'Labour',
      apply_vat: formData.apply_vat || false
    };
    
    saveRate(rateToSave);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-black/5 flex items-center justify-between bg-[#F5F5F0]/50">
          <h2 className="text-2xl font-bold tracking-tight">{rate ? 'Edit Rate' : 'Add New Rate'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Resource Type</label>
            <select 
              className="w-full p-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-black/5 font-bold text-sm"
              value={formData.resource_type}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, resource_type: e.target.value as any })}
            >
              <option value="Labour">Labour</option>
              <option value="Material">Material</option>
              <option value="Equipment">Equipment</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Resource Name</label>
            <input 
              type="text" 
              className="w-full p-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-black/5 text-sm"
              placeholder="e.g. Skilled Labour, Cement, Excavator"
              value={formData.name || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Unit</label>
              <input 
                type="text" 
                className="w-full p-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-black/5 text-sm font-mono"
                placeholder="md, bag, hr"
                value={formData.unit || ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Rate (Rs.)</label>
              <input 
                type="number" 
                className="w-full p-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-black/5 text-sm font-bold"
                placeholder="0.00"
                value={formData.rate || ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 bg-[#F5F5F0] p-4 rounded-xl">
            <input 
              type="checkbox" 
              id="modal-vat"
              checked={!!formData.apply_vat}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, apply_vat: (e.target as HTMLInputElement).checked })}
              className="w-5 h-5 rounded border-black/10 text-black focus:ring-black/5"
            />
            <label htmlFor="modal-vat" className="text-sm font-bold cursor-pointer">Apply 13% VAT to this resource</label>
          </div>
        </div>

        <div className="p-8 bg-[#F5F5F0]/50 border-t border-black/5 flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-3 rounded-2xl font-bold text-sm hover:bg-black/5 transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="bg-[#141414] text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-lg shadow-black/10"
          >
            Save Rate
          </button>
        </div>
      </motion.div>
    </div>
  );
}
