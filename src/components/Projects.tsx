import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Trash2, Edit2, Calendar, ArrowRight } from 'lucide-react';
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

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    const loaded = getProjects();
    setProjects(loaded);
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-black/40">Manage your BOQ projects</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#141414] text-white px-4 py-2 rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-black/10"
        >
          <Plus size={20} />
          New Project
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative group"
            >
              <button
                onClick={() => onSelectProject(project.id)}
                className="w-full text-left p-6 bg-white rounded-3xl border border-black/5 shadow-sm hover:shadow-md transition-all hover:border-black/10"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <FolderOpen size={24} className="text-emerald-600" />
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tighter ${
                    project.mode === 'CONTRACTOR' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {project.mode}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold mb-1 line-clamp-1">{project.name}</h3>
                <p className="text-sm text-black/40 line-clamp-2 mb-3">{project.location || 'Location not set'}</p>
                
                <div className="flex items-center gap-2 text-xs text-black/30">
                  <Calendar size={12} />
                  <span>{new Date(project.created_at).toLocaleDateString()}</span>
                  <span className="mx-1">•</span>
                  <span>{project.items.length} items</span>
                </div>
              </button>

              {/* Delete Button */}
              <button
onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleDeleteClick(e, project.id)}                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 z-10"
                aria-label="Delete project"
              >
                <Trash2 size={16} />
              </button>

              {/* Delete Confirmation */}
              <AnimatePresence>
                {deleteConfirm === project.id && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-3xl flex items-center justify-center z-20"
                  >
                    <div className="text-center p-4">
                      <p className="text-sm font-bold mb-3">Delete "{project.name}"?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmDelete(project.id)}
                          className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-4 py-2 bg-black/5 rounded-xl text-xs font-bold"
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
        <div className="text-center py-16 bg-white rounded-3xl border border-black/5">
          <FolderOpen size={48} className="text-black/20 mx-auto mb-4" />
          <p className="text-black/40">No projects yet</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 text-emerald-600 font-bold hover:underline"
          >
            Create your first project
          </button>
        </div>
      )}

      {/* New Project Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-black/5">
                <h2 className="text-2xl font-bold">New Project</h2>
                <p className="text-sm text-black/40 mt-1">Create a new BOQ project</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Project Name</label>
                  <input
                    type="text"
                    className="w-full p-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-black/5"
                    placeholder="e.g., Bridge Construction"
                    value={newProject.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProject({ ...newProject, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Location</label>
                  <input
                    type="text"
                    className="w-full p-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-black/5"
                    placeholder="e.g., Kathmandu, Nepal"
                    value={newProject.location}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProject({ ...newProject, location: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Mode</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setNewProject({ ...newProject, mode: 'CONTRACTOR' })}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                        newProject.mode === 'CONTRACTOR'
                          ? 'bg-[#141414] text-white shadow-md'
                          : 'bg-[#F5F5F0] text-black/40'
                      }`}
                    >
                      CONTRACTOR
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewProject({ ...newProject, mode: 'USERS' })}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                        newProject.mode === 'USERS'
                          ? 'bg-[#141414] text-white shadow-md'
                          : 'bg-[#F5F5F0] text-black/40'
                      }`}
                    >
                      USERS
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-[#F5F5F0]/50 border-t border-black/5 flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 rounded-xl font-bold text-sm hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProject.name.trim()}
                  className="bg-[#141414] text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
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