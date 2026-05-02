import { useState, useEffect } from 'react';
import { Calculator, Library, DollarSign, FolderKanban, TrendingUp, Users, BarChart3 } from 'lucide-react';
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

    // Calculate total resources across all norms
    const totalResources = norms.reduce((sum, norm) => sum + norm.resources.length, 0);

    // Get recent projects (last 3)
    const recentProjects = projects
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);

    setStats({
      totalNorms: norms.length,
      totalRates: rates.length,
      totalProjects: projects.length,
      totalResources,
      recentProjects
    });
  }, []);

  const statCards = [
    {
      title: 'Total Norms',
      value: stats.totalNorms,
      icon: Library,
      description: 'Engineering standards available',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Rates',
      value: stats.totalRates,
      icon: DollarSign,
      description: 'Resource rates configured',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Active Projects',
      value: stats.totalProjects,
      icon: FolderKanban,
      description: 'Projects created',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Total Resources',
      value: stats.totalResources,
      icon: BarChart3,
      description: 'Resources in norms',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold italic tracking-tighter text-[#1E293B]">
          ResourceCalc Dashboard
        </h1>
        <p className="text-lg text-[#64748B]">
          Overview of your engineering calculation tools
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <span className="text-2xl font-bold text-[#1E293B]">{stat.value}</span>
            </div>
            <h3 className="text-sm font-semibold text-[#374151] mb-1">{stat.title}</h3>
            <p className="text-xs text-[#6B7280]">{stat.description}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <h2 className="text-xl font-bold text-[#1E293B] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => onNavigate('calc')}
            className="flex items-center gap-3 p-4 bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg transition-colors"
          >
            <Calculator className="w-5 h-5 text-[#3B82F6]" />
            <div className="text-left">
              <div className="font-medium text-[#1E293B]">Quick Calculator</div>
              <div className="text-sm text-[#64748B]">Calculate resources instantly</div>
            </div>
          </button>
          <button 
            onClick={() => onNavigate('projects')}
            className="flex items-center gap-3 p-4 bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg transition-colors"
          >
            <FolderKanban className="w-5 h-5 text-[#8B5CF6]" />
            <div className="text-left">
              <div className="font-medium text-[#1E293B]">New Project</div>
              <div className="text-sm text-[#64748B]">Start a new project</div>
            </div>
          </button>
          <button 
            onClick={() => onNavigate('analysis')}
            className="flex items-center gap-3 p-4 bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg transition-colors"
          >
            <TrendingUp className="w-5 h-5 text-[#10B981]" />
            <div className="text-left">
              <div className="font-medium text-[#1E293B]">Rate Analysis</div>
              <div className="text-sm text-[#64748B]">Analyze resource rates</div>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Projects */}
      {stats.recentProjects.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <h2 className="text-xl font-bold text-[#1E293B] mb-4">Recent Projects</h2>
          <div className="space-y-3">
            {stats.recentProjects.map((project) => (
              <div key={project.id} className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg">
                <div className="flex items-center gap-3">
                  <FolderKanban className="w-5 h-5 text-[#64748B]" />
                  <div>
                    <div className="font-medium text-[#1E293B]">{project.name}</div>
                    <div className="text-sm text-[#64748B]">{project.location || 'Location not set'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-[#64748B]">{project.mode}</div>
                  <div className="text-xs text-[#94A3B8]">
                    {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* App Features Overview */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <h2 className="text-xl font-bold text-[#1E293B] mb-4">Application Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calculator className="w-5 h-5 text-[#3B82F6] mt-0.5" />
              <div>
                <h3 className="font-medium text-[#1E293B]">Quick Calculator</h3>
                <p className="text-sm text-[#64748B]">Instant resource calculations based on engineering norms</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Library className="w-5 h-5 text-[#8B5CF6] mt-0.5" />
              <div>
                <h3 className="font-medium text-[#1E293B]">Norms Library</h3>
                <p className="text-sm text-[#64748B]">Comprehensive DOR & DUDBC standards database</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FolderKanban className="w-5 h-5 text-[#10B981] mt-0.5" />
              <div>
                <h3 className="font-medium text-[#1E293B]">Project Management</h3>
                <p className="text-sm text-[#64748B]">Organize and manage multiple construction projects</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-[#F59E0B] mt-0.5" />
              <div>
                <h3 className="font-medium text-[#1E293B]">Rate Management</h3>
                <p className="text-sm text-[#64748B]">Configure and update resource pricing</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-[#EF4444] mt-0.5" />
              <div>
                <h3 className="font-medium text-[#1E293B]">Rate Analysis</h3>
                <p className="text-sm text-[#64748B]">Dynamic cost analysis and comparisons</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-[#06B6D4] mt-0.5" />
              <div>
                <h3 className="font-medium text-[#1E293B]">Offline Operation</h3>
                <p className="text-sm text-[#64748B]">Works completely offline for field use</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}