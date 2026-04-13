import { useState, useEffect } from 'react';
import QuickCalculator from './components/QuickCalculator';
import Norms from './components/Norms';
import BOQ from './components/BOQ';
import { Calculator, Library, Info, ClipboardList } from 'lucide-react';
import { Norm } from './types';
import { getNorms } from './utils/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<'calc' | 'norms' | 'boq' | 'about'>('calc');
  const [norms, setNorms] = useState<Norm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadedNorms = getNorms();
    setNorms(loadedNorms);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/50">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20 text-white">
      {activeTab === 'calc' && <QuickCalculator norms={norms} />}
      {activeTab === 'norms' && <Norms norms={norms} />}
      {activeTab === 'boq' && <BOQ norms={norms} />}
      {activeTab === 'about' && (
        <div className="p-8 max-w-md mx-auto space-y-6">
          <h1 className="text-3xl font-bold italic tracking-tighter text-white">About ResourceCalc</h1>
          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-sm space-y-4">
            <p className="text-sm text-zinc-400 leading-relaxed">
              ResourceCalc is a professional tool for civil engineers to quickly estimate resource requirements based on standard norms (DOR & DUDBC).
            </p>
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Features</h3>
              <ul className="text-sm space-y-1 text-zinc-400">
                <li>• Instant resource breakdown</li>
                <li>• DOR & DUDBC Norms Library</li>
                <li>• BOQ Calculator with resource summary</li>
                <li>• Works completely offline</li>
                <li>• Mobile-friendly design</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-zinc-800 px-4 py-2 z-40">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button 
            onClick={() => setActiveTab('calc')}
            className={`flex flex-col items-center gap-0.5 transition-colors ${activeTab === 'calc' ? 'text-emerald-500' : 'text-zinc-600'}`}
          >
            <Calculator size={20} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Calc</span>
          </button>
          <button 
            onClick={() => setActiveTab('norms')}
            className={`flex flex-col items-center gap-0.5 transition-colors ${activeTab === 'norms' ? 'text-emerald-500' : 'text-zinc-600'}`}
          >
            <Library size={20} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Norms</span>
          </button>
          <button 
            onClick={() => setActiveTab('boq')}
            className={`flex flex-col items-center gap-0.5 transition-colors ${activeTab === 'boq' ? 'text-emerald-500' : 'text-zinc-600'}`}
          >
            <ClipboardList size={20} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">BOQ</span>
          </button>
          <button 
            onClick={() => setActiveTab('about')}
            className={`flex flex-col items-center gap-0.5 transition-colors ${activeTab === 'about' ? 'text-emerald-500' : 'text-zinc-600'}`}
          >
            <Info size={20} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">About</span>
          </button>
        </div>
      </nav>
    </div>
  );
}