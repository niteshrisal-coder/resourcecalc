import { Norm } from '../types';
import normsData from '../data/norms.json';

const STORAGE_KEY = 'resourcecalc_norms';
const VERSION_KEY = 'resourcecalc_version';
const CURRENT_VERSION = '1.0.0';

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