import { useState, useEffect } from 'react';
import QuickCalculator from './components/QuickCalculator';
import Norms from './components/Norms';
import BOQ from './components/BOQ';
import Rates from './components/Rates';
import RateAnalysis from './components/RateAnalysis';
import Projects from './components/Projects';
import ProjectBOQ from './components/ProjectBOQ';
import Dashboard from './components/Dashboard';
import { Calculator, Library, Info, ClipboardList, DollarSign, TrendingUp, FolderKanban, Menu, X, Home } from 'lucide-react';
import { Norm } from './types';
import { getNorms } from './utils/storage';
import { useDeviceType } from './utils/device';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calc' | 'norms' | 'boq' | 'rates' | 'analysis' | 'projects' | 'about'>('dashboard');
  const [norms, setNorms] = useState<Norm[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const { isMobile } = useDeviceType();

  useEffect(() => {
    const loadedNorms = getNorms();
    setNorms(loadedNorms);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <p className="text-[#64748B]">Loading...</p>
      </div>
    );
  }

  // Navigation items
  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Home },
    { id: 'calc' as const, label: 'Calculator', icon: Calculator },
    { id: 'norms' as const, label: 'Norms', icon: Library },
    { id: 'rates' as const, label: 'Rates', icon: DollarSign },
    { id: 'analysis' as const, label: 'Analysis', icon: TrendingUp },
    { id: 'boq' as const, label: 'Quick BOQ', icon: ClipboardList },
    { id: 'projects' as const, label: 'Projects', icon: FolderKanban },
    { id: 'about' as const, label: 'About', icon: Info },
  ];

  // Mobile layout with hamburger menu
  if (isMobile) {
    // Show ProjectBOQ if a project is selected
    if (selectedProjectId !== null) {
      return (
        <div className="min-h-screen bg-[#F8FAFC]">
          <div className="p-6">
            <ProjectBOQ 
              projectId={selectedProjectId} 
              onBack={() => {
                setSelectedProjectId(null);
                setActiveTab('projects');
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Mobile Header with Hamburger */}
        <header className="bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-[#F1F5F9] transition-colors"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h1 className="text-lg font-bold italic tracking-tighter text-[#1E293B]">ResourceCalc</h1>
          <div className="w-10"></div> {/* Spacer for centering */}
        </header>

        {/* Mobile Navigation Drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)}></div>
            <div className="relative w-64 bg-white shadow-xl flex flex-col">
              <div className="p-6 border-b border-[#E2E8F0]">
                <h2 className="text-xl font-bold italic tracking-tighter text-[#1E293B]">ResourceCalc</h2>
                <p className="text-xs text-[#94A3B8] mt-1">Engineering Calculator</p>
              </div>
              
              <nav className="flex-1 p-4 space-y-2">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                      if (item.id !== 'projects') {
                        setSelectedProjectId(null);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeTab === item.id && selectedProjectId === null
                        ? 'bg-[#3B82F6] text-white shadow-sm'
                        : 'text-[#475569] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Mobile Main Content */}
        <main className="p-4">
          {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
          {activeTab === 'calc' && <QuickCalculator norms={norms} />}
          {activeTab === 'norms' && <Norms norms={norms} />}
          {activeTab === 'projects' && <Projects onSelectProject={(id) => setSelectedProjectId(id)} />}
          {activeTab === 'boq' && <BOQ norms={norms} />}
          {activeTab === 'rates' && <Rates />}
          {activeTab === 'analysis' && <RateAnalysis />}
          {activeTab === 'about' && (
            <div className="p-4 space-y-6">
              <h1 className="text-3xl font-bold italic tracking-tighter text-[#1E293B]">About ResourceCalc</h1>
              <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
                <p className="text-sm text-[#475569] leading-relaxed">
                  ResourceCalc is a professional tool for civil engineers to quickly estimate resource requirements based on standard norms (DOR & DUDBC).
                </p>
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#1E293B]">Features</h3>
                  <ul className="text-sm space-y-1 text-[#475569]">
                    <li>• Instant resource breakdown</li>
                    <li>• DOR & DUDBC Norms Library</li>
                    <li>• BOQ Calculator with resource summary</li>
                    <li>• Resource Rate Management</li>
                    <li>• Dynamic Rate Analysis</li>
                    <li>• Works completely offline</li>
                    <li>• Professional engineering tool</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Web layout with collapsible sidebar
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar Navigation - Web */}
      <aside className={`bg-white border-r border-[#E2E8F0] shadow-sm flex flex-col transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-16'
      }`}>
        <div className={`p-6 border-b border-[#E2E8F0] ${sidebarOpen ? '' : 'px-4'}`}>
          {sidebarOpen ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold italic tracking-tighter text-[#1E293B]">ResourceCalc</h1>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded-lg hover:bg-[#F1F5F9] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs text-[#94A3B8]">Engineering Calculator</p>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-[#F1F5F9] transition-colors"
            >
              <Menu size={20} />
            </button>
          )}
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (item.id !== 'projects') {
                  setSelectedProjectId(null);
                }
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                (activeTab === item.id && selectedProjectId === null)
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[#475569] hover:bg-[#F1F5F9]'
              } ${sidebarOpen ? '' : 'justify-center px-2'}`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <item.icon size={20} />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="p-4 border-t border-[#E2E8F0] text-xs text-[#94A3B8]">
            <p>v1.0.0</p>
            <p className="mt-1">Professional engineering tool</p>
          </div>
        )}
      </aside>

      {/* Main Content - Web */}
      <main className="flex-1 overflow-auto bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#F8FAFC]">
        <div className="w-full h-full p-8">
          {selectedProjectId !== null ? (
            <ProjectBOQ 
              projectId={selectedProjectId} 
              onBack={() => setSelectedProjectId(null)}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
              {activeTab === 'calc' && <QuickCalculator norms={norms} />}
              {activeTab === 'norms' && <Norms norms={norms} />}
              {activeTab === 'projects' && <Projects onSelectProject={(id) => setSelectedProjectId(id)} />}
              {activeTab === 'boq' && <BOQ norms={norms} />}
              {activeTab === 'rates' && <Rates />}
              {activeTab === 'analysis' && <RateAnalysis />}
              {activeTab === 'about' && (
                <div className="p-8 space-y-6">
                  <h1 className="text-4xl font-bold italic tracking-tighter text-[#1E293B]">About ResourceCalc</h1>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
                      <p className="text-base text-[#475569] leading-relaxed">
                        ResourceCalc is a professional tool for civil engineers to quickly estimate resource requirements based on standard norms (DOR & DUDBC).
                      </p>
                      <div className="space-y-2">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-[#1E293B]">Features</h3>
                        <ul className="text-sm space-y-1 text-[#475569]">
                          <li>• Instant resource breakdown</li>
                          <li>• DOR & DUDBC Norms Library</li>
                          <li>• BOQ Calculator with resource summary</li>
                          <li>• Resource Rate Management</li>
                          <li>• Dynamic Rate Analysis</li>
                          <li>• Works completely offline</li>
                          <li>• Professional engineering tool</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}