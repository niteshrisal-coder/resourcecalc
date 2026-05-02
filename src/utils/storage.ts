import { Norm, Rate, Project } from '../types';
import normsData from '../data/norms.json';
import ratesData from '../data/rates.json';

const STORAGE_KEY = 'resourcecalc_norms';
const RATES_STORAGE_KEY = 'resourcecalc_rates';
const VERSION_KEY = 'resourcecalc_version';
const CURRENT_VERSION = '1.0.0';
const PROJECTS_KEY = 'resourcecalc_projects';

// Extract unique resources from norms and convert to rates
function extractResourcesFromNorms(): Rate[] {
  const resourceMap = new Map<string, Rate>();
  let nextId = 1000;
  
  normsData.forEach((norm: any) => {
    if (norm.resources && Array.isArray(norm.resources)) {
      norm.resources.forEach((resource: any) => {
        // Use name + unit as key to avoid duplicates
        const key = `${resource.name.toLowerCase()}|${resource.unit.toLowerCase()}`;
        
        if (!resourceMap.has(key)) {
          resourceMap.set(key, {
            id: nextId++,
            name: resource.name,
            unit: resource.unit,
            rate: 0, // Default rate, user will update
            resource_type: resource.resource_type,
            apply_vat: false
          });
        }
      });
    }
  });
  
  return Array.from(resourceMap.values());
}

export function getNorms(): Norm[] {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  const stored = localStorage.getItem(STORAGE_KEY);
  
  // If version mismatch or no data, load from JSON
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

export function getRates(): Rate[] {
  const stored = localStorage.getItem(RATES_STORAGE_KEY);
  let rates: Rate[] = [];
  
  // If no data, initialize with both default rates and resources from norms
  if (!stored) {
    const defaultRates = ratesData as Rate[];
    const normsResources = extractResourcesFromNorms();
    
    // Create a set of unique resources by name+unit (case-insensitive)
    const rateSet = new Map<string, Rate>();
    
    // Add default rates first
    defaultRates.forEach(rate => {
      const key = `${rate.name.toLowerCase()}|${rate.unit.toLowerCase()}`;
      rateSet.set(key, rate);
    });
    
    // Add norms resources, skipping if already exists
    normsResources.forEach(resource => {
      const key = `${resource.name.toLowerCase()}|${resource.unit.toLowerCase()}`;
      if (!rateSet.has(key)) {
        rateSet.set(key, resource);
      }
    });
    
    rates = Array.from(rateSet.values());
    localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(rates));
    return rates;
  }
  
  rates = JSON.parse(stored);
  
  // Normalize labour units: convert "day" to "md" for Labour resource types
  rates = rates.map(rate => {
    if (rate.resource_type === 'Labour' && rate.unit === 'day') {
      return { ...rate, unit: 'md' };
    }
    return rate;
  });
  
  // Remove duplicates after normalization using Map (last one wins)
  const uniqueRatesMap = new Map<string, Rate>();
  rates.forEach(rate => {
    const key = `${rate.name.toLowerCase()}|${rate.unit.toLowerCase()}`;
    uniqueRatesMap.set(key, rate);
  });
  rates = Array.from(uniqueRatesMap.values());
  
  // Auto-add any new resources from norms that aren't in rates
  const normsResources = extractResourcesFromNorms();
  const existingResourceSet = new Set(
    rates.map(r => `${r.name.toLowerCase()}|${r.unit.toLowerCase()}`)
  );
  
  let updated = false;
  normsResources.forEach(resource => {
    const key = `${resource.name.toLowerCase()}|${resource.unit.toLowerCase()}`;
    if (!existingResourceSet.has(key)) {
      resource.id = Math.max(...rates.map(r => r.id), 999) + 1;
      rates.push(resource);
      updated = true;
    }
  });
  
  if (updated) {
    localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(rates));
  }
  
  return rates;
}

export function saveRate(rate: Rate): void {
  const rates = getRates();
  const index = rates.findIndex(r => r.id === rate.id);
  
  if (index >= 0) {
    rates[index] = rate;
  } else {
    rate.id = Math.max(...rates.map(r => r.id), 0) + 1;
    rates.push(rate);
  }
  
  localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(rates));
}

export function deleteRate(id: number): void {
  const rates = getRates();
  const filtered = rates.filter(r => r.id !== id);
  localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(filtered));
}

export function resetToDefaultRates(): void {
  localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(ratesData));
}

// ============ PROJECTS FUNCTIONS ============

export function getProjects(): Project[] {
  const stored = localStorage.getItem(PROJECTS_KEY);
  if (stored) {
    const parsed = JSON.parse(stored) as any[];
    return parsed.map(project => ({
      ...project,
      location: project.location ?? project.description ?? '',
    }));
  }
  return [];
}

export function saveProject(project: Project): void {
  const projects = getProjects();
  const index = projects.findIndex((p: Project) => p.id === project.id);
  
  if (index >= 0) {
    projects[index] = project;
  } else {
    projects.push(project);
  }
  
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function deleteProject(projectId: number): void {
  const projects = getProjects();
  const filtered = projects.filter((p: Project) => p.id !== projectId);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));
}

export function getProjectById(projectId: number): Project | undefined {
  const projects = getProjects();
  return projects.find((p: Project) => p.id === projectId);
}