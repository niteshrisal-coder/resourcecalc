import { useState, useEffect } from 'react';
import QuickCalculator from './components/QuickCalculator';
import PGCalculator from './components/PGCalculator';
import Norms from './components/Norms';
import BOQ from './components/BOQ';
import Rates from './components/Rates';
import RateAnalysis from './components/RateAnalysis';
import Projects from './components/Projects';
import ProjectBOQ from './components/ProjectBOQ';
import Dashboard from './components/Dashboard';
import {
  Calculator, Library, ClipboardList, DollarSign,
  TrendingUp, FolderKanban, Menu, X, Home, Info,
  ChevronRight, Zap, BadgePercent
} from 'lucide-react';
import { Norm } from './types';
import { getNorms, getProjectById } from './utils/storage';
import { useDeviceType } from './utils/device';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calc' | 'pg' | 'norms' | 'boq' | 'rates' | 'analysis' | 'projects' | 'about'>('dashboard');
  const [norms, setNorms] = useState<Norm[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const { isMobile } = useDeviceType();

  useEffect(() => {
    const loadedNorms = getNorms();
    setNorms(loadedNorms);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center animate-pulse">
            <Zap size={20} className="text-white" />
          </div>
          <p className="text-slate-400 text-sm font-medium">Loading ResourceCalc…</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Home, color: 'text-slate-400' },
    { id: 'calc' as const, label: 'Calculator', icon: Calculator, color: 'text-sky-400' },
    { id: 'pg' as const, label: 'PG Calculator', icon: BadgePercent, color: 'text-slate-400' },
    { id: 'norms' as const, label: 'Norms Library', icon: Library, color: 'text-slate-400' },
    { id: 'rates' as const, label: 'Rates', icon: DollarSign, color: 'text-emerald-400' },
    { id: 'analysis' as const, label: 'Rate Analysis', icon: TrendingUp, color: 'text-amber-400' },
    { id: 'boq' as const, label: 'Quick BOQ', icon: ClipboardList, color: 'text-rose-400' },
    { id: 'projects' as const, label: 'Projects', icon: FolderKanban, color: 'text-cyan-400' },
    { id: 'about' as const, label: 'About', icon: Info, color: 'text-slate-400' },
  ];

  // ── Mobile layout ──────────────────────────────────────────────────────────
  const selectedProject = selectedProjectId !== null ? getProjectById(selectedProjectId) : null;

  if (isMobile) {
    if (selectedProjectId !== null) {
      return (
        <div className="min-h-screen bg-[#F1F5F9]">
          <div className="p-4">
            {selectedProject ? (
              <ProjectBOQ
                project={selectedProject}
                norms={norms}
                onBack={() => { setSelectedProjectId(null); setActiveTab('projects'); }}
              />
            ) : (
              <div className="p-6 rounded-3xl bg-white shadow-sm text-center text-sm text-slate-600">
                Project not found. Please return to Projects and select a valid project.
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F1F5F9]">
        {/* Mobile Header */}
        <header className="bg-[#0D1117] px-4 py-3 flex items-center justify-between shadow-lg">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="text-white font-bold tracking-tight text-lg">ResourceCalc</span>
          </div>
          <div className="w-10" />
        </header>

        {/* Mobile Drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <div className="relative w-72 bg-[#0D1117] shadow-2xl flex flex-col">
              <div className="p-6 border-b border-white/8">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center shadow-lg shadow-black/50">
                    <Zap size={18} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg tracking-tight">ResourceCalc</h2>
                    <p className="text-slate-500 text-[11px]">Engineering Calculator</p>
                  </div>
                </div>
              </div>

              <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {navItems.map(item => {
                  const isActive = activeTab === item.id && selectedProjectId === null;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                        if (item.id !== 'projects') setSelectedProjectId(null);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                        isActive
                          ? 'bg-white/10 text-white border-l-2 border-white/60'
                          : 'text-slate-400 hover:bg-white/6 hover:text-slate-200'
                      }`}
                    >
                      <item.icon size={17} className={isActive ? 'text-white' : item.color} />
                      <span>{item.label}</span>
                      {isActive && <ChevronRight size={14} className="ml-auto text-white/50" />}
                    </button>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-white/8">
                <p className="text-slate-600 text-xs">v1.0.0 · Professional engineering tool</p>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Content */}
        <main className="p-4">
          {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
          {activeTab === 'calc' && <QuickCalculator norms={norms} />}
          {activeTab === 'pg' && <PGCalculator onBack={() => setActiveTab('calc')} />}
          {activeTab === 'norms' && <Norms norms={norms} />}
          {activeTab === 'projects' && <Projects onSelectProject={(id) => setSelectedProjectId(id)} />}
          {activeTab === 'boq' && <BOQ norms={norms} />}
          {activeTab === 'rates' && <Rates />}
          {activeTab === 'analysis' && <RateAnalysis />}
          {activeTab === 'about' && <AboutPage />}
        </main>
      </div>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F1F5F9] flex">
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 bg-[#0D1117] border-r border-white/6 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-64' : 'w-[68px]'
        }`}
        style={{ minHeight: '100vh' }}
      >
        {/* Logo area */}
        <div className={`flex items-center border-b border-white/6 ${sidebarOpen ? 'gap-3 px-5 py-5' : 'justify-center px-3 py-5'}`}>
          <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center shadow-lg shadow-black/40 flex-shrink-0">
            <Zap size={17} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-base tracking-tight leading-tight">ResourceCalc</h1>
              <p className="text-slate-600 text-[10px] mt-0.5 tracking-wide uppercase font-medium">Engineering Suite</p>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/8 transition-all flex-shrink-0"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Toggle when collapsed */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="mx-auto mt-3 p-2 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/8 transition-all"
            title="Expand sidebar"
          >
            <Menu size={17} />
          </button>
        )}

        {/* Nav */}
        <nav className={`flex-1 py-3 space-y-0.5 overflow-y-auto ${sidebarOpen ? 'px-3' : 'px-2'}`}>
          {sidebarOpen && (
            <p className="text-slate-600 text-[9px] uppercase tracking-widest font-bold px-3 pb-2 pt-1">Navigation</p>
          )}
          {navItems.map(item => {
            const isActive = activeTab === item.id && selectedProjectId === null;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id !== 'projects') setSelectedProjectId(null);
                }}
                title={!sidebarOpen ? item.label : undefined}
                className={`w-full flex items-center transition-all duration-150 rounded-xl text-sm font-medium group relative ${
                  sidebarOpen ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5'
                } ${
                  isActive
                    ? 'bg-white/10 text-white border border-white/15'
                    : 'text-slate-500 hover:bg-white/6 hover:text-slate-200 border border-transparent'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white/70 rounded-r-full" />
                )}
                <item.icon
                  size={17}
                  className={`flex-shrink-0 ${isActive ? 'text-white' : item.color + ' opacity-70 group-hover:opacity-100'}`}
                />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {isActive && <ChevronRight size={13} className="text-white/50" />}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="px-4 py-4 border-t border-white/6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-white/8 flex items-center justify-center">
                <Zap size={11} className="text-slate-400" />
              </div>
              <div>
                <p className="text-slate-500 text-[10px] font-semibold">v1.0.0</p>
                <p className="text-slate-700 text-[9px]">Professional engineering tool</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="w-full h-full p-8">
          {selectedProjectId !== null ? (
            selectedProject ? (
              <ProjectBOQ
                project={selectedProject}
                norms={norms}
                onBack={() => setSelectedProjectId(null)}
              />
            ) : (
              <div className="min-h-screen flex items-center justify-center">
                <div className="p-6 rounded-3xl bg-white shadow-sm text-center text-sm text-slate-600">
                  Project not found. Please return to Projects and select a valid project.
                </div>
              </div>
            )
          ) : (
            <>
              {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
              {activeTab === 'calc' && <QuickCalculator norms={norms} />}
              {activeTab === 'pg' && <PGCalculator onBack={() => setActiveTab('calc')} />}
              {activeTab === 'norms' && <Norms norms={norms} />}
              {activeTab === 'projects' && <Projects onSelectProject={(id) => setSelectedProjectId(id)} />}
              {activeTab === 'boq' && <BOQ norms={norms} />}
              {activeTab === 'rates' && <Rates />}
              {activeTab === 'analysis' && <RateAnalysis />}
              {activeTab === 'about' && <AboutPage />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function AboutPage() {
  const features = [
    { icon: Calculator, color: 'text-sky-500', bg: 'bg-sky-50', title: 'Quick Calculator', desc: 'Instant resource breakdowns based on DOR & DUDBC engineering norms' },
    { icon: Library, color: 'text-slate-600', bg: 'bg-slate-100', title: 'Norms Library', desc: 'Comprehensive database of 270+ engineering standards' },
    { icon: FolderKanban, color: 'text-emerald-500', bg: 'bg-emerald-50', title: 'Project Management', desc: 'Organize and manage multiple construction projects with BOQ support' },
    { icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-50', title: 'Rate Management', desc: 'Configure and update resource pricing with VAT support' },
    { icon: TrendingUp, color: 'text-rose-500', bg: 'bg-rose-50', title: 'Rate Analysis', desc: 'Dynamic cost analysis in Contractor and Users Committee modes' },
    { icon: ClipboardList, color: 'text-cyan-500', bg: 'bg-cyan-50', title: 'BOQ Export', desc: 'Generate professional PDF reports in summary or detailed format' },
  ];

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
          <Zap size={12} />
          Professional Engineering Suite
        </div>
        <h1 className="text-4xl font-bold text-[#0F172A] tracking-tight">About ResourceCalc</h1>
        <p className="mt-3 text-lg text-slate-500 leading-relaxed">
          A professional tool built for civil engineers to quickly estimate resource requirements based on standard norms — DOR & DUDBC.
          Works completely offline, right in your browser.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((f, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center flex-shrink-0`}>
              <f.icon size={18} className={f.color} />
            </div>
            <div>
              <h3 className="font-semibold text-[#0F172A] text-sm mb-1">{f.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#0D1117] rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="text-slate-300 font-semibold text-sm">ResourceCalc v1.0.0</p>
          <p className="text-slate-600 text-xs mt-1">Built for Nepali civil engineers · Works offline · No data leaves your device</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
          <Zap size={18} className="text-white" />
        </div>
      </div>
    </div>
  );
}
