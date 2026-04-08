/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import QuickCalculator from './components/QuickCalculator';
import Norms from './components/Norms';
import { Calculator, Library, Info } from 'lucide-react';
import { Norm } from './types';

const INITIAL_NORMS: Norm[] = [
  {
    id: 1,
    description: "Earthwork in excavation in all types of soil",
    unit: "m3",
    basis_quantity: 10,
    type: 'DOR',
    ref_ss: "Clause 601",
    resources: [
      { name: "Unskilled Labour", quantity: 2.5, unit: "md", resource_type: 'Labour' },
      { name: "Excavator", quantity: 0.5, unit: "hr", resource_type: 'Equipment' }
    ]
  },
  {
    id: 2,
    description: "Stone masonry work in 1:4 cement sand mortar",
    unit: "m3",
    basis_quantity: 1,
    type: 'DUDBC',
    ref_ss: "Clause 12.1",
    resources: [
      { name: "Skilled Labour", quantity: 1.2, unit: "md", resource_type: 'Labour' },
      { name: "Unskilled Labour", quantity: 2.0, unit: "md", resource_type: 'Labour' },
      { name: "Stone", quantity: 1.1, unit: "m3", resource_type: 'Material' },
      { name: "Cement", quantity: 2.5, unit: "bags", resource_type: 'Material' },
      { name: "Sand", quantity: 0.35, unit: "m3", resource_type: 'Material' }
    ]
  },
  {
    id: 3,
    description: "PCC 1:2:4 for reinforced concrete work",
    unit: "m3",
    basis_quantity: 1,
    type: 'DUDBC',
    ref_ss: "Clause 10.2",
    resources: [
      { name: "Skilled Labour", quantity: 0.8, unit: "md", resource_type: 'Labour' },
      { name: "Unskilled Labour", quantity: 1.5, unit: "md", resource_type: 'Labour' },
      { name: "Cement", quantity: 6.5, unit: "bags", resource_type: 'Material' },
      { name: "Sand", quantity: 0.45, unit: "m3", resource_type: 'Material' },
      { name: "Aggregate", quantity: 0.9, unit: "m3", resource_type: 'Material' }
    ]
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'calc' | 'norms' | 'about'>('calc');
  const [norms, setNorms] = useState<Norm[]>(INITIAL_NORMS);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {activeTab === 'calc' && <QuickCalculator norms={norms} />}
      {activeTab === 'norms' && <Norms norms={norms} setNorms={setNorms} />}
      {activeTab === 'about' && (
        <div className="p-8 max-w-md mx-auto space-y-6">
          <h1 className="text-3xl font-bold italic tracking-tighter">About ResourceCalc</h1>
          <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4">
            <p className="text-sm text-black/60 leading-relaxed">
              ResourceCalc is a professional tool designed for civil engineers and contractors to quickly estimate resource requirements based on standard norms (DOR & DUDBC).
            </p>
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-black/40">Features</h3>
              <ul className="text-sm space-y-1 text-black/60">
                <li>• Instant resource breakdown</li>
                <li>• DOR & DUDBC Norms Library</li>
                <li>• Mobile-first professional UI</li>
                <li>• Offline-ready calculations</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Global Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-black/5 px-8 py-4 z-40">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button 
            onClick={() => setActiveTab('calc')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'calc' ? 'text-emerald-500' : 'text-black/20'}`}
          >
            <Calculator size={20} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Calc</span>
          </button>
          <button 
            onClick={() => setActiveTab('norms')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'norms' ? 'text-emerald-500' : 'text-black/20'}`}
          >
            <Library size={20} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Library</span>
          </button>
          <button 
            onClick={() => setActiveTab('about')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'about' ? 'text-emerald-500' : 'text-black/20'}`}
          >
            <Info size={20} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">About</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
