import React, { useState, useEffect, ChangeEvent } from 'react';
import { Search, Calculator, ChevronLeft, TrendingUp } from 'lucide-react';
import { Norm, Rate } from '../types';
import { motion } from 'motion/react';
import { getNorms, getRates } from '../utils/storage';
import { useDeviceType } from '../utils/device';

export default function RateAnalysis() {
  const [norms, setNorms] = useState<Norm[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [search, setSearch] = useState('');
  const [selectedNorm, setSelectedNorm] = useState<Norm | null>(null);
  const [mode, setMode] = useState<'CONTRACTOR' | 'USERS'>('CONTRACTOR');
  const [normType, setNormType] = useState<'ALL' | 'DOR' | 'DUDBC'>('ALL');
  const { isMobile } = useDeviceType();

  useEffect(() => {
    const loadedNorms = getNorms();
    const loadedRates = getRates();
    setNorms(loadedNorms);
    setRates(loadedRates);
  }, []);

  const safeResourceList = (resources: any): any[] => Array.isArray(resources) ? resources : [];

  const calculateRawTotal = (norm: Norm): number => {
    const resources = safeResourceList(norm.resources);
    let labourTotal = 0;
    let materialTotal = 0;
    let equipmentTotal = 0;
    const percentageResources: any[] = [];

    resources.forEach(res => {
      if (res.is_percentage) {
        percentageResources.push(res);
      } else {
        const rateObj = rates.find(r => r.name.toLowerCase() === res.name.toLowerCase());
        if (rateObj) {
          let rate = rateObj.rate;
          if (mode === 'USERS' && rateObj.apply_vat) {
            rate = rate * 1.13;
          }
          const amount = res.quantity * rate;
          if (res.resource_type === 'Labour') labourTotal += amount;
          else if (res.resource_type === 'Material') materialTotal += amount;
          else if (res.resource_type === 'Equipment') equipmentTotal += amount;
        }
      }
    });

    const fixedTotal = labourTotal + materialTotal + equipmentTotal;
    let percentageTotal = 0;

    percentageResources.forEach(res => {
      let base = 0;
      if (res.percentage_base === 'TOTAL') base = fixedTotal;
      else if (res.percentage_base === 'LABOUR') base = labourTotal;
      else if (res.percentage_base === 'MATERIAL') base = materialTotal;
      else if (res.percentage_base === 'EQUIPMENT') base = equipmentTotal;
      else {
        const baseRes = safeResourceList(norm.resources).find(r => r.name === res.percentage_base && !r.is_percentage);
        if (baseRes) {
          const rateObj = rates.find(r => r.name.toLowerCase() === baseRes.name.toLowerCase());
          if (rateObj) {
            let rate = rateObj.rate;
            if (mode === 'USERS' && rateObj.apply_vat) rate = rate * 1.13;
            base = baseRes.quantity * rate;
          }
        }
      }
      percentageTotal += (res.quantity / 100) * base;
    });

    return fixedTotal + percentageTotal;
  };

  const calculateTotalCost = (norm: Norm): number => {
    const rawTotal = calculateRawTotal(norm);
    if (mode === 'CONTRACTOR') {
      return rawTotal * 1.15;
    }
    return rawTotal;
  };

  const calculateItemRate = (norm: Norm): number => {
    const totalCost = calculateTotalCost(norm);
    return totalCost / (norm.basis_quantity || 1);
  };

  const filteredNorms = norms.filter(n => 
    (n.description || '').toLowerCase().includes(search.toLowerCase()) &&
    (normType === 'ALL' || n.type === normType)
  );

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="p-4 pb-24 space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter italic">Rate Analysis</h1>
          <p className="text-black/50 text-sm">Dynamic calculation of item rates based on current resource prices.</p>
        </div>

        {selectedNorm ? (
          // Mobile Detail View
          <div className="space-y-4">
            <button 
              onClick={() => setSelectedNorm(null)}
              className="flex items-center gap-2 text-black/40 hover:text-black py-2 px-2 -mx-2"
            >
              <ChevronLeft size={18} />
              <span className="text-sm font-bold">Back</span>
            </button>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-black/5 overflow-hidden space-y-4"
            >
              <div className="p-4 bg-[#141414] text-white">
                <div className="flex items-start justify-between mb-2">
                  <span className="px-2 py-1 bg-white/10 rounded-lg text-xs font-bold uppercase tracking-widest">{selectedNorm.type}</span>
                  <span className="text-xs font-mono opacity-50">Ref: {selectedNorm.ref_ss || 'N/A'}</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight">{selectedNorm.description}</h2>
                <p className="text-xs opacity-60 mt-2">Analysis for {selectedNorm.basis_quantity} {selectedNorm.unit}</p>
              </div>

              <div className="p-4 space-y-4">
                <div className="flex gap-2 bg-[#F5F5F0] p-2 rounded-xl">
                  <button
                    onClick={() => setMode('CONTRACTOR')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${mode === 'CONTRACTOR' ? 'bg-[#141414] text-white' : 'text-black/40'}`}
                  >
                    Contractor
                  </button>
                  <button
                    onClick={() => setMode('USERS')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${mode === 'USERS' ? 'bg-[#141414] text-white' : 'text-black/40'}`}
                  >
                    Users
                  </button>
                </div>

                <AnalysisTableMobile 
                  title="Labour" 
                  resources={safeResourceList(selectedNorm.resources).filter(r => r.resource_type === 'Labour')} 
                  rates={rates} 
                  mode={mode}
                  allResources={safeResourceList(selectedNorm.resources)}
                />
                <AnalysisTableMobile 
                  title="Material" 
                  resources={safeResourceList(selectedNorm.resources).filter(r => r.resource_type === 'Material')} 
                  rates={rates} 
                  mode={mode}
                  allResources={safeResourceList(selectedNorm.resources)}
                />
                <AnalysisTableMobile 
                  title="Equipment" 
                  resources={safeResourceList(selectedNorm.resources).filter(r => r.resource_type === 'Equipment')} 
                  rates={rates} 
                  mode={mode}
                  allResources={safeResourceList(selectedNorm.resources)}
                />

                <div className="pt-4 border-t border-black/5 space-y-3">
                  {mode === 'CONTRACTOR' && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-black/40 font-bold text-xs uppercase">Total (Excl. CP&O)</span>
                        <span className="font-bold">Rs. {calculateRawTotal(selectedNorm).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-black/40 font-bold text-xs uppercase">CP&O (15%)</span>
                        <span className="font-bold">Rs. {(calculateRawTotal(selectedNorm) * 0.15).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="bg-[#F5F5F0] p-4 rounded-xl space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs font-bold uppercase text-black/40">Total Cost</span>
                      <span className="text-lg font-bold">Rs. {calculateTotalCost(selectedNorm).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs font-bold uppercase text-black/40">Rate per {selectedNorm.unit}</span>
                      <span className="text-lg font-bold text-emerald-600">{calculateItemRate(selectedNorm).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          // Mobile List View
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" size={18} />
              <input 
                type="text" 
                placeholder="Search items..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              />
            </div>

            <select 
              value={normType}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setNormType(e.target.value as any)}
              className="w-full px-4 py-2 bg-white rounded-lg border border-black/5 text-xs font-bold uppercase tracking-widest focus:outline-none"
            >
              <option value="ALL">All Norms</option>
              <option value="DOR">DOR Norms</option>
              <option value="DUDBC">DUDBC Norms</option>
            </select>

            <div className="space-y-2">
              {filteredNorms.length === 0 ? (
                <div className="text-center py-8 text-black/20 italic text-sm">
                  No norms found
                </div>
              ) : (
                filteredNorms.map(norm => {
                  const unitRate = calculateItemRate(norm);
                  return (
                    <button
                      key={norm.id}
                      onClick={() => setSelectedNorm(norm)}
                      className="w-full text-left p-3 bg-white rounded-lg border border-black/5 transition-all active:bg-black/5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono opacity-60 mb-1">{norm.ref_ss || 'Ref'}</p>
                          <p className="text-sm font-bold line-clamp-2">{norm.description}</p>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <p className="text-sm font-bold text-emerald-600">{unitRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                          <p className="text-xs text-black/40 font-mono">per {norm.unit}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Web Layout
  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center mt-0.5">
            <TrendingUp size={19} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Rate Analysis</h1>
            <p className="text-slate-500 text-sm mt-0.5">Dynamic calculation of item rates based on current resource prices</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={normType}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setNormType(e.target.value as any)}
            className="bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-600 focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all"
          >
            <option value="ALL">All Norms</option>
            <option value="DOR">DOR Norms</option>
            <option value="DUDBC">DUDBC Norms</option>
          </select>
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 gap-0.5">
            <button
              onClick={() => setMode('CONTRACTOR')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${mode === 'CONTRACTOR' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              Contractor
            </button>
            <button
              onClick={() => setMode('USERS')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${mode === 'USERS' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              Users Committee
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Norm Selection List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search items..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-500 transition-all text-sm text-slate-800 placeholder:text-slate-400"
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden max-h-[600px] overflow-y-auto">
            <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-100 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <div className="col-span-3">Ref</div>
              <div className="col-span-6">Description</div>
              <div className="col-span-3 text-right">Rate</div>
            </div>
            {filteredNorms.map(norm => {
              const unitRate = calculateItemRate(norm);
              const isSelected = selectedNorm?.id === norm.id;
              return (
                <button
                  key={norm.id}
                  onClick={() => setSelectedNorm(norm)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 transition-colors grid grid-cols-12 items-center gap-2 ${isSelected ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  <div className={`col-span-3 text-[10px] font-mono truncate ${isSelected ? 'text-slate-200' : 'text-slate-400'}`}>
                    {norm.ref_ss || '-'}
                  </div>
                  <div className="col-span-6">
                    <p className="text-xs font-medium line-clamp-2">{norm.description}</p>
                  </div>
                  <div className="col-span-3 text-right">
                    <p className={`text-xs font-bold font-mono ${isSelected ? 'text-slate-100' : 'text-emerald-600'}`}>
                      {unitRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Analysis Detail */}
        <div className="lg:col-span-2">
          {selectedNorm ? (
            <motion.div 
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            >
              <div className="p-6 bg-slate-900 text-white">
                <div className="flex items-start justify-between mb-3">
                  <span className="px-2.5 py-1 bg-white/10 rounded-lg text-xs font-bold uppercase tracking-widest">{selectedNorm.type} Norm</span>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-mono opacity-50">Ref: {selectedNorm.ref_ss || 'N/A'}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${mode === 'CONTRACTOR' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {mode === 'CONTRACTOR' ? 'Contractor Mode (+15% CP&O)' : 'Users Mode (Incl. VAT)'}
                    </span>
                  </div>
                </div>
                <h2 className="text-xl font-bold tracking-tight mb-1">{selectedNorm.description}</h2>
                <p className="text-sm opacity-50">Analysis for {selectedNorm.basis_quantity} {selectedNorm.unit} of work</p>
              </div>

              <div className="p-6 space-y-6">
                <AnalysisTable 
                  title="Labour Component" 
                  resources={safeResourceList(selectedNorm.resources).filter(r => r.resource_type === 'Labour')} 
                  rates={rates} 
                  color="blue"
                  mode={mode}
                  allResources={safeResourceList(selectedNorm.resources)}
                />
                <AnalysisTable 
                  title="Material Component" 
                  resources={safeResourceList(selectedNorm.resources).filter(r => r.resource_type === 'Material')} 
                  rates={rates} 
                  color="emerald"
                  mode={mode}
                  allResources={safeResourceList(selectedNorm.resources)}
                />
                <AnalysisTable 
                  title="Equipment Component" 
                  resources={safeResourceList(selectedNorm.resources).filter(r => r.resource_type === 'Equipment')} 
                  rates={rates} 
                  color="orange"
                  mode={mode}
                  allResources={safeResourceList(selectedNorm.resources)}
                />

                <div className="pt-6 border-t border-slate-100 space-y-3">
                  {mode === 'CONTRACTOR' && (
                    <>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Subtotal (Excl. CP&O)</p>
                          <p className="text-[10px] text-slate-300 mt-0.5">Rate per {selectedNorm.unit}: Rs. {(calculateRawTotal(selectedNorm) / (selectedNorm.basis_quantity || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <span className="font-semibold text-sm text-slate-700">Rs. {calculateRawTotal(selectedNorm).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">CP&O (15%)</p>
                          <p className="text-[10px] text-slate-300 mt-0.5">Rate per {selectedNorm.unit}: Rs. {(calculateRawTotal(selectedNorm) * 0.15 / (selectedNorm.basis_quantity || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <span className="font-semibold text-sm text-slate-700">Rs. {(calculateRawTotal(selectedNorm) * 0.15).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Total Cost ({selectedNorm.basis_quantity} {selectedNorm.unit})</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-medium text-slate-400">Rs.</span>
                        <span className="text-2xl font-bold text-slate-800">{calculateTotalCost(selectedNorm).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="bg-emerald-50 rounded-xl p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">Rate per {selectedNorm.unit}</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-medium text-emerald-500">Rs.</span>
                        <span className="text-2xl font-bold text-emerald-700">{calculateItemRate(selectedNorm).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-200">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                <Calculator size={26} className="text-amber-300" />
              </div>
              <p className="font-semibold text-slate-400">Select an item to view rate analysis</p>
              <p className="text-sm text-slate-300 mt-1">Click any norm from the list on the left</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalysisTable({ title, resources, rates, color, mode, allResources }: { title: string, resources: any[], rates: Rate[], color: string, mode: 'CONTRACTOR' | 'USERS', allResources: any[] }) {
  const safeAllResources = Array.isArray(allResources) ? allResources : [];
  const safeResources = Array.isArray(resources) ? resources : [];

  const labourTotal = safeAllResources.reduce((acc, res) => {
    if (res.is_percentage || res.resource_type !== 'Labour') return acc;
    const rateObj = rates.find(r => r.name.toLowerCase() === res.name.toLowerCase());
    if (!rateObj) return acc;
    let rate = rateObj.rate;
    if (mode === 'USERS' && rateObj.apply_vat) rate = rate * 1.13;
    return acc + (res.quantity * rate);
  }, 0);

  const materialTotal = safeAllResources.reduce((acc, res) => {
    if (res.is_percentage || res.resource_type !== 'Material') return acc;
    const rateObj = rates.find(r => r.name.toLowerCase() === res.name.toLowerCase());
    if (!rateObj) return acc;
    let rate = rateObj.rate;
    if (mode === 'USERS' && rateObj.apply_vat) rate = rate * 1.13;
    return acc + (res.quantity * rate);
  }, 0);

  const equipmentTotal = safeAllResources.reduce((acc, res) => {
    if (res.is_percentage || res.resource_type !== 'Equipment') return acc;
    const rateObj = rates.find(r => r.name.toLowerCase() === res.name.toLowerCase());
    if (!rateObj) return acc;
    let rate = rateObj.rate;
    if (mode === 'USERS' && rateObj.apply_vat) rate = rate * 1.13;
    return acc + (res.quantity * rate);
  }, 0);

  const fixedTotal = labourTotal + materialTotal + equipmentTotal;

  const subtotal = resources.reduce((acc, res) => {
    if (res.is_percentage) {
      let base = 0;
      if (res.percentage_base === 'TOTAL') base = fixedTotal;
      else if (res.percentage_base === 'LABOUR') base = labourTotal;
      else if (res.percentage_base === 'MATERIAL') base = materialTotal;
      else if (res.percentage_base === 'EQUIPMENT') base = equipmentTotal;
      else {
        const baseRes = allResources.find(r => r.name === res.percentage_base && !r.is_percentage);
        if (baseRes) {
          const rateObj = rates.find(r => r.name.toLowerCase() === baseRes.name.toLowerCase());
          if (rateObj) {
            let rate = rateObj.rate;
            if (mode === 'USERS' && rateObj.apply_vat) rate = rate * 1.13;
            base = baseRes.quantity * rate;
          }
        }
      }
      return acc + (res.quantity / 100 * base);
    }
    const rateObj = rates.find(r => r.name.toLowerCase() === res.name.toLowerCase());
    if (!rateObj) return acc;
    let rate = rateObj.rate;
    if (mode === 'USERS' && rateObj.apply_vat) rate = rate * 1.13;
    return acc + (res.quantity * rate);
  }, 0);

  if (safeResources.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-black/5 pb-2">
        <h3 className={`text-xs font-bold uppercase tracking-widest text-${color}-600`}>{title}</h3>
        <span className="text-xs font-bold text-black/40">Subtotal: Rs. {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left opacity-40">
            <th className="pb-2 font-medium">Description</th>
            <th className="pb-2 font-medium text-center">Quantity</th>
            <th className="pb-2 font-medium text-right">Unit Rate</th>
            <th className="pb-2 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {safeResources.map((res, i) => {
            let amount = 0;
            let rateDisplay = '';

            if (res.is_percentage) {
              let base = 0;
              if (res.percentage_base === 'TOTAL') base = fixedTotal;
              else if (res.percentage_base === 'LABOUR') base = labourTotal;
              else if (res.percentage_base === 'MATERIAL') base = materialTotal;
              else if (res.percentage_base === 'EQUIPMENT') base = equipmentTotal;
              else {
                const baseRes = safeAllResources.find(r => r.name === res.percentage_base && !r.is_percentage);
                if (baseRes) {
                  const rateObj = rates.find(r => r.name.toLowerCase() === baseRes.name.toLowerCase());
                  if (rateObj) {
                    let rate = rateObj.rate;
                    if (mode === 'USERS' && rateObj.apply_vat) rate = rate * 1.13;
                    base = baseRes.quantity * rate;
                  }
                }
              }
              amount = (res.quantity / 100) * base;
              rateDisplay = `${res.quantity}% of ${res.percentage_base}`;
            } else {
              const rateObj = rates.find(r => r.name.toLowerCase() === res.name.toLowerCase());
              let rate = rateObj?.rate || 0;
              if (mode === 'USERS' && rateObj?.apply_vat) {
                rate = rate * 1.13;
              }
              amount = res.quantity * rate;
              rateDisplay = rateObj ? rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Rate missing';
            }

            return (
              <tr key={i} className="group">
                <td className="py-2 font-medium">
                  {res.name}
                  {mode === 'USERS' && !res.is_percentage && !!rates.find(r => r.name.toLowerCase() === res.name.toLowerCase())?.apply_vat && (
                    <span className="text-[8px] ml-2 text-emerald-600 font-bold uppercase tracking-tighter">Incl. 13% VAT</span>
                  )}
                  {!!res.is_percentage && (
                    <span className="text-[8px] ml-2 text-blue-600 font-bold uppercase tracking-tighter">Percentage Based</span>
                  )}
                </td>
                <td className="py-2 text-center font-mono">
                  {res.is_percentage ? `${res.quantity}%` : res.quantity} 
                  <span className="text-[10px] opacity-40 ml-1">{res.unit || '-'}</span>
                </td>
                <td className="py-2 text-right font-mono text-black/40">{rateDisplay}</td>
                <td className="py-2 text-right font-mono font-bold">{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AnalysisTableMobile({ title, resources, rates, mode, allResources }: { title: string, resources: any[], rates: Rate[], mode: 'CONTRACTOR' | 'USERS', allResources: any[] }) {
  const safeAllResources = Array.isArray(allResources) ? allResources : [];
  const safeResources = Array.isArray(resources) ? resources : [];

  const labourTotal = safeAllResources.reduce((acc, res) => {
    if (res.is_percentage || res.resource_type !== 'Labour') return acc;
    const rateObj = rates.find(r => r.name.toLowerCase() === res.name.toLowerCase());
    if (!rateObj) return acc;
    let rate = rateObj.rate;
    if (mode === 'USERS' && rateObj.apply_vat) rate = rate * 1.13;
    return acc + (res.quantity * rate);
  }, 0);

  const materialTotal = safeAllResources.reduce((acc, res) => {
    if (res.is_percentage || res.resource_type !== 'Material') return acc;
    const rateObj = rates.find(r => r.name.toLowerCase() === res.name.toLowerCase());
    if (!rateObj) return acc;
    let rate = rateObj.rate;
    if (mode === 'USERS' && rateObj.apply_vat) rate = rate * 1.13;
    return acc + (res.quantity * rate);
  }, 0);

  const equipmentTotal = safeAllResources.reduce((acc, res) => {
    if (res.is_percentage || res.resource_type !== 'Equipment') return acc;
    const rateObj = rates.find(r => r.name.toLowerCase() === res.name.toLowerCase());
    if (!rateObj) return acc;
    let rate = rateObj.rate;
    if (mode === 'USERS' && rateObj.apply_vat) rate = rate * 1.13;
    return acc + (res.quantity * rate);
  }, 0);

  const fixedTotal = labourTotal + materialTotal + equipmentTotal;

  const subtotal = safeResources.reduce((acc, res) => {
    if (res.is_percentage) {
      let base = 0;
      if (res.percentage_base === 'TOTAL') base = fixedTotal;
      else if (res.percentage_base === 'LABOUR') base = labourTotal;
      else if (res.percentage_base === 'MATERIAL') base = materialTotal;
      else if (res.percentage_base === 'EQUIPMENT') base = equipmentTotal;
      else {
        const baseRes = safeAllResources.find(r => r.name === res.percentage_base && !r.is_percentage);
        if (baseRes) {
          const rateObj = rates.find(r => r.name.toLowerCase() === baseRes.name.toLowerCase());
          if (rateObj) {
            let rate = rateObj.rate;
            if (mode === 'USERS' && rateObj.apply_vat) rate = rate * 1.13;
            base = baseRes.quantity * rate;
          }
        }
      }
      return acc + (res.quantity / 100 * base);
    }
    const rateObj = rates.find(r => r.name.toLowerCase() === res.name.toLowerCase());
    if (!rateObj) return acc;
    let rate = rateObj.rate;
    if (mode === 'USERS' && rateObj.apply_vat) rate = rate * 1.13;
    return acc + (res.quantity * rate);
  }, 0);

  if (safeResources.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-xs font-bold uppercase tracking-widest">{title}</h3>
        <span className="text-xs font-bold text-black/40">Rs. {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      <div className="space-y-1">
        {safeResources.map((res, i) => {
          let amount = 0;

          if (res.is_percentage) {
            let base = 0;
            if (res.percentage_base === 'TOTAL') base = fixedTotal;
            else if (res.percentage_base === 'LABOUR') base = labourTotal;
            else if (res.percentage_base === 'MATERIAL') base = materialTotal;
            else if (res.percentage_base === 'EQUIPMENT') base = equipmentTotal;
            else {
              const baseRes = safeAllResources.find(r => r.name === res.percentage_base && !r.is_percentage);
              if (baseRes) {
                const rateObj = rates.find(r => r.name.toLowerCase() === baseRes.name.toLowerCase());
                if (rateObj) {
                  let rate = rateObj.rate;
                  if (mode === 'USERS' && rateObj.apply_vat) rate = rate * 1.13;
                  base = baseRes.quantity * rate;
                }
              }
            }
            amount = (res.quantity / 100) * base;
          } else {
            const rateObj = rates.find(r => r.name.toLowerCase() === res.name.toLowerCase());
            let rate = rateObj?.rate || 0;
            if (mode === 'USERS' && rateObj?.apply_vat) {
              rate = rate * 1.13;
            }
            amount = res.quantity * rate;
          }

          return (
            <div key={i} className="flex justify-between text-xs">
              <span className="flex-1">{res.name}</span>
              <span className="font-mono font-bold">Rs. {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
