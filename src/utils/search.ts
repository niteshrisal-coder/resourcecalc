import { Norm, Rate } from '../types';
import normsData from '../data/norms.json';

const STORAGE_KEY = 'resourcecalc_norms';
const VERSION_KEY = 'resourcecalc_version';
const CURRENT_VERSION = '1.1.0';
const PROJECTS_KEY = 'resourcecalc_projects';
const RATES_KEY = 'resourcecalc_rates';

export function getNorms(): Norm[] {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  const stored = localStorage.getItem(STORAGE_KEY);
  
  if (!stored || storedVersion !== CURRENT_VERSION) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normsData));
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    return normsData as Norm[];
  }
  
  return JSON.parse(stored);
}

export function resetToDefaultNorms(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normsData));
  localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
}

// Get all rates (for future use - returns empty array for now)
export function getRates(): Rate[] {
  const stored = localStorage.getItem(RATES_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
}

// Save rates (for future use)
export function saveRates(rates: Rate[]): void {
  localStorage.setItem(RATES_KEY, JSON.stringify(rates));
}

// Get all projects
export function getProjects(): any[] {
  const stored = localStorage.getItem(PROJECTS_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
}

// Save a single project
export function saveProject(project: any): void {
  const projects = getProjects();
  const index = projects.findIndex((p: any) => p.id === project.id);
  
  if (index >= 0) {
    projects[index] = project;
  } else {
    projects.push(project);
  }
  
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

// Delete a project
export function deleteProject(projectId: number): void {
  const projects = getProjects();
  const filtered = projects.filter((p: any) => p.id !== projectId);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));
}