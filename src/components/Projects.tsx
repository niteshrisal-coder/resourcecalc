import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Trash2, Calendar, ArrowRight, FolderKanban, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getProjects, saveProject, deleteProject } from '../utils/storage';

interface Project {
  id: number;
  name: string;
  location: string;
  mode: 'CONTRACTOR' | 'USERS';
  created_at: string;
  items: any[];
}

export default function Projects({ onSelectProject }: { onSelectProject: (projectId: number) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', location: '', mode: 'CONTRACTOR' as 'CONTRACTOR' | 'USERS' });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = () => setProjects(getProjects());

  const handleCreateProject = () => {
    if (!newProject.name.trim()) return;
    const project: Project = {
      id: Date.now(),
      name: newProject.name,
      location: newProject.location,
      mode: newProject.mode,
      created_at: new Date().toISOString(),
      items: []
    };
    saveProject(project);
    loadProjects();
    setIsModalOpen(false);
    setNewProject({ name: '', location: '', mode: 'CONTRACTOR' });
  };

  const handleDeleteClick = (e: React.MouseEvent, projectId: number) => {
    e.stopPropagation();
    setDeleteConfirm(projectId);
  };

  const confirmDelete = (projectId: number) => {
    deleteProject(projectId);
    loadProjects();
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-cyan-50 flex items-center justify-center mt-0.5">
            <FolderKanban size={20} className="text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Projects</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage your BOQ projects and generate cost estimates</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative group"
            >
              <button
                onClick={() => onSelectProject(project.id)}
                className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200 overflow-hidden"
              >
                {/* Card top accent */}
                <div className={`h-1.5 w-full ${project.mode === 'CONTRACTOR' ? 'bg-gradient-to-r from-sky-400 to-sky-600' : 'bg-gradient-to-r from-slate-400 to-slate-600'}`} />
                
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
                      <FolderOpen size={18} className="text-cyan-600" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${
                      project.mode === 'CONTRACTOR'
                        ? 'bg-sky-50 text-sky-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {project.mode}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-800 text-base mb-1 line-clamp-1">{project.name}</h3>
                  
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-4">
                    <MapPin size={11} />
                    <span>{project.location || 'Location not set'}</span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <Calendar size={11} />
                      <span>{new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-700 text-xs font-semibold group-hover:gap-2 transition-all">
                      <span>Open</span>
                      <ArrowRight size={12} />
                    </div>
                  </div>
                </div>
              </button>

              {/* Delete Button */}
              <button
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleDeleteClick(e, project.id)}
                className="absolute top-7 right-12 w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 z-10"
                aria-label="Delete project"
              >
                <Trash2 size={13} />
              </button>

              {/* Delete Confirmation */}
              <AnimatePresence>
                {deleteConfirm === project.id && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/96 backdrop-blur-sm rounded-2xl flex items-center justify-center z-20"
                  >
                    <div className="text-center p-4">
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-3">
                        <Trash2 size={16} className="text-red-500" />
                      </div>
                      <p className="text-sm font-bold text-slate-800 mb-1">Delete project?</p>
                      <p className="text-xs text-slate-500 mb-4">"{project.name}"</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmDelete(project.id)}
                          className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-cyan-50 flex items-center justify-center mb-4">
            <FolderOpen size={30} className="text-cyan-300" />
          </div>
          <p className="font-bold text-slate-400 text-lg">No projects yet</p>
          <p className="text-slate-400 text-sm mt-1 mb-5">Create your first BOQ project to get started</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all"
          >
            <Plus size={16} />
            Create First Project
          </button>
        </div>
      )}

      {/* New Project Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center">
                  <FolderKanban size={17} className="text-cyan-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">New Project</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Create a new BOQ project</p>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Project Name *</label>
                  <input
                    type="text"
                    autoFocus
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all"
                    placeholder="e.g., Bridge Construction Phase 1"
                    value={newProject.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProject({ ...newProject, name: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Location</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all"
                    placeholder="e.g., Kathmandu, Nepal"
                    value={newProject.location}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProject({ ...newProject, location: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['CONTRACTOR', 'USERS'] as const).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setNewProject({ ...newProject, mode })}
                        className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                          newProject.mode === mode
                            ? 'bg-slate-900 text-white shadow-md '
                            : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 pt-1">
                    {newProject.mode === 'CONTRACTOR' ? 'Includes 15% CP&O overhead, excludes VAT' : 'Includes VAT on applicable resources'}
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProject.name.trim()}
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-2 rounded-xl transition-all"
                >
                  <Plus size={15} />
                  Create Project
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
