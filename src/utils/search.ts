import { Norm } from '../types';

// Intelligent search function for norms
export const searchNorm = (norm: Norm, searchTerm: string): boolean => {
  const lowerSearch = searchTerm.toLowerCase().trim();
  
  // Exact text match in description, ref_ss, or sNo
  if (norm.description.toLowerCase().includes(lowerSearch) || 
      norm.ref_ss?.toLowerCase().includes(lowerSearch) ||
      norm.sNo?.toLowerCase().includes(lowerSearch)) {
    return true;
  }

  // Extract numeric prefix from search term
  const numericMatch = lowerSearch.match(/^(\d+)/);
  if (numericMatch) {
    const searchNum = numericMatch[1];
    
    // Check ref_ss for matching numeric prefix or range
    if (norm.ref_ss) {
      const refNums = norm.ref_ss.split(',').map(s => s.trim());
      for (const ref of refNums) {
        const refNumMatch = ref.match(/^(\d+)/);
        if (refNumMatch) {
          const refNum = parseInt(refNumMatch[1]);
          const searchNumInt = parseInt(searchNum);
          // Match if ref_ss starts with search number or is within 10 of it
          if (ref.startsWith(searchNum) || 
              (Math.abs(refNum - searchNumInt) <= 10 && refNum >= searchNumInt)) {
            return true;
          }
        }
      }
    }
    
    // Check sNo for matching numeric prefix
    if (norm.sNo) {
      const sNoNumMatch = norm.sNo.match(/^(\d+)/);
      if (sNoNumMatch && norm.sNo.startsWith(searchNum)) {
        return true;
      }
    }
  }

  return false;
};
