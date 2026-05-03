import { useState, useEffect } from 'react';
import {
  Calculator, Library, DollarSign, FolderKanban,
  TrendingUp, ClipboardList, ArrowRight, Zap,
  BarChart3, Activity, Layers
} from 'lucide-react';
import { getNorms, getRates, getProjects } from '../utils/storage';
import { Norm, Rate, Project } from '../types';

interface DashboardStats {
  totalNorms: number;
  totalRates: number;
  totalProjects: number;
  totalResources: number;
  recentProjects: Project[];
}

interface DashboardProps {
  onNavigate: (tab: 'calc' | 'norms' | 'boq' | 'rates' | 'analysis' | 'projects' | 'about') => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalNorms: 0,
    totalRates: 0,
    totalProjects: 0,
    totalResources: 0,
    recentProjects: []
  });

  useEffect(() => {
    const norms = getNorms();
    const rates = getRates();
    const projects = getProjects();
    const totalResources = norms.reduce((sum, norm) => sum + norm.resources.length, 0);
    const recentProjects = projects
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
    setStats({ totalNorms: norms.length, totalRates: rates.length, totalProjects: projects.length, totalResources, recentProjects });
  }, []);

  const statCards = [
    {
      title: 'Engineering Norms',
      value: stats.totalNorms,
      icon: Library,
      description: 'DOR & DUDBC standards',
      iconColor: 'text-slate-600',
      iconBg: 'bg-slate-100',
      accent: 'border-t-slate-500',
      change: 'DOR + DUDBC'
    },
    {
      title: 'Resource Rates',
      value: stats.totalRates,
      icon: DollarSign,
      description: 'Unit rates configured',
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-50',
      accent: 'border-t-emerald-500',
      change: 'Labour · Material · Equipment'
    },
    {
      title: 'Active Projects',
      value: stats.totalProjects,
      icon: FolderKanban,
      description: 'BOQ projects created',
      iconColor: 'text-sky-500',
      iconBg: 'bg-sky-50',
      accent: 'border-t-sky-500',
      change: 'Contractor · Users'
    },
    {
      title: 'Total Resources',
      value: stats.totalResources,
      icon: BarChart3,
      description: 'Resources across all norms',
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-50',
      accent: 'border-t-amber-500',
      change: 'Across all norms'
    },
  ];

  const quickActions = [
    {
      label: 'Quick Calculator',
      desc: 'Estimate resources instantly',
      icon: Calculator,
      tab: 'calc' as const,
      gradient: 'from-sky-500 to-sky-700',
      shadow: 'shadow-sky-200',
    },
    {
      label: 'New Project',
      desc: 'Create a BOQ project',
      icon: FolderKanban,
      tab: 'projects' as const,
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-200',
    },
    {
      label: 'Rate Analysis',
      desc: 'Calculate item rates',
      icon: TrendingUp,
      tab: 'analysis' as const,
      gradient: 'from-slate-700 to-slate-900',
      shadow: 'shadow-slate-300',
    },
    {
      label: 'Norms Library',
      desc: 'Browse 270+ standards',
      icon: Library,
      tab: 'norms' as const,
      gradient: 'from-rose-500 to-pink-600',
      shadow: 'shadow-rose-200',
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl">

      {/* ── Hero Header ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0D1117] px-8 py-10">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-slate-500/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-10 w-60 h-60 rounded-full bg-slate-500/8 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-40 bg-slate-800/10 blur-3xl rounded-full" />
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />
        </div>

        <div className="relative flex items-start justify-between flex-wrap gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              <Activity size={11} />
              Professional Engineering Suite
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
              Welcome to <span className="text-slate-300">ResourceCalc</span>
            </h1>
            <p className="mt-3 text-slate-400 text-base leading-relaxed max-w-xl">
              Calculate resource requirements, manage rates, and generate BOQ reports — all based on DOR & DUDBC engineering standards.
            </p>

            <div className="flex items-center gap-6 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-400 text-sm">Fully offline</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers size={13} className="text-slate-500" />
                <span className="text-slate-400 text-sm">{stats.totalNorms} norms loaded</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={13} className="text-slate-500" />
                <span className="text-slate-400 text-sm">Real-time calculation</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <button
              onClick={() => onNavigate('calc')}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm px-5 py-3 rounded-xl shadow-lg shadow-black/30 transition-all"
            >
              <Calculator size={16} />
              Open Calculator
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onNavigate('boq')}
              className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/12 text-slate-300 font-medium text-sm px-5 py-2.5 rounded-xl transition-all"
            >
              <ClipboardList size={15} />
              Quick BOQ
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div
            key={i}
            className={`bg-[#FAFBFF] rounded-2xl p-5 border border-slate-100 border-t-4 ${card.accent} shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-default`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                <card.icon size={18} className={card.iconColor} />
              </div>
              <span className="text-3xl font-bold text-slate-800 tabular-nums">{card.value}</span>
            </div>
            <p className="font-semibold text-slate-700 text-sm">{card.title}</p>
            <p className="text-slate-400 text-xs mt-0.5">{card.description}</p>
            <div className="mt-3 pt-3 border-t border-slate-50">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{card.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Quick Actions</h2>
          <span className="text-xs text-slate-400 font-medium">Jump to any tool</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => onNavigate(action.tab)}
              className="group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
              style={{ background: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))` }}
            >
              <div className={`relative z-10 bg-gradient-to-br ${action.gradient} rounded-2xl p-5`}>
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                  <action.icon size={20} className="text-white" />
                </div>
                <p className="text-white font-bold text-sm">{action.label}</p>
                <p className="text-white/70 text-xs mt-0.5">{action.desc}</p>
                <div className="flex items-center gap-1 mt-4 text-white/60 group-hover:text-white/90 transition-colors">
                  <span className="text-xs font-semibold">Open</span>
                  <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Recent Projects + Features ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Projects */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
            <h2 className="font-bold text-slate-800">Recent Projects</h2>
            <button
              onClick={() => onNavigate('projects')}
              className="text-xs text-slate-500 font-semibold hover:text-slate-700 flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {stats.recentProjects.length > 0 ? (
              stats.recentProjects.map((project) => (
                <div key={project.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <FolderKanban size={16} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{project.name}</p>
                      <p className="text-slate-400 text-xs">{project.location || 'Location not set'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      project.mode === 'CONTRACTOR' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {project.mode}
                    </span>
                    <p className="text-slate-400 text-[10px] mt-1">{new Date(project.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                  <FolderKanban size={22} className="text-slate-300" />
                </div>
                <p className="text-slate-400 font-medium text-sm">No projects yet</p>
                <button
                  onClick={() => onNavigate('projects')}
                  className="mt-3 text-slate-500 text-xs font-semibold hover:underline"
                >
                  Create your first project →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* App Features */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50">
            <h2 className="font-bold text-slate-800">Application Features</h2>
          </div>
          <div className="p-5 space-y-3">
            {[
              { icon: Calculator, color: 'text-sky-500', bg: 'bg-sky-50', title: 'Quick Calculator', desc: 'Instant resource calculations', tab: 'calc' as const },
              { icon: Library, color: 'text-slate-600', bg: 'bg-slate-100', title: 'Norms Library', desc: '270+ DOR & DUDBC standards', tab: 'norms' as const },
              { icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50', title: 'Rate Management', desc: 'Configure pricing with VAT', tab: 'rates' as const },
              { icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50', title: 'Rate Analysis', desc: 'Dynamic cost breakdown', tab: 'analysis' as const },
              { icon: ClipboardList, color: 'text-rose-500', bg: 'bg-rose-50', title: 'BOQ Generator', desc: 'Export professional PDF reports', tab: 'boq' as const },
              { icon: FolderKanban, color: 'text-cyan-500', bg: 'bg-cyan-50', title: 'Project Management', desc: 'Multi-project BOQ tracking', tab: 'projects' as const },
            ].map((f, i) => (
              <button
                key={i}
                onClick={() => onNavigate(f.tab)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left group"
              >
                <div className={`w-8 h-8 rounded-lg ${f.bg} flex items-center justify-center flex-shrink-0`}>
                  <f.icon size={15} className={f.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-700 text-sm">{f.title}</p>
                  <p className="text-slate-400 text-xs">{f.desc}</p>
                </div>
                <ArrowRight size={13} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
