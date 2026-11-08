/**
 * Name dictionary and spelling suggestion engine for Clinic Reception
 * Provides comprehensive Ethiopian and common international names,
 * fuzzy matching / Levenshtein distance spell-checking, and local persistence.
 */

export const COMMON_ETHIOPIAN_FIRST_NAMES: string[] = [
  // A
  'Abeba', 'Abebe', 'Abel', 'Abenezer', 'Abinet', 'Abraham', 'Addis', 'Addisu', 
  'Alazar', 'Alemitu', 'Alex', 'Alexander', 'Almaz', 'Amanuel', 'Anteneh', 
  'Aschalew', 'Ashenafi', 'Aster', 'Ayana',
  // B
  'Belete', 'Belay', 'Belaynesh', 'Bereket', 'Berhanu', 'Betelhem', 'Bethlehem', 
  'Bezawit', 'Biniam', 'Birhan', 'Biruk', 'Birtukan', 'Bizunesh', 'Brook',
  // D
  'Dagmawi', 'Daniel', 'David', 'Dawit', 'Demeke', 'Derartu', 'Desta',
  // E
  'Eden', 'Efrata', 'Eleni', 'Emnet', 'Endale', 'Ephrem', 'Ermias', 'Eskinder', 
  'Esmael', 'Eyob', 'Eyasu',
  // F
  'Fasil', 'Fatuma', 'Fikadu', 'Fikir', 'Fikirte', 'Fikru', 'Fitsum', 'Frehiwot',
  // G
  'Genet', 'Getachew', 'Getnet', 'Girma', 'Girum', 'Gizachew',
  // H
  'Habtamu', 'Haile', 'Hailu', 'Hamza', 'Hanna', 'Hassen', 'Hayat', 'Haymanot', 
  'Helen', 'Hiwot',
  // I, J, K
  'Ibrahim', 'Idris', 'John', 'Joseph', 'Kalkidan', 'Kassahun', 'Kebede', 
  'Kidist', 'Kidus', 'Kinfe', 'Kokeb',
  // L
  'Lemlem', 'Liya', 'Luel',
  // M
  'Mahlet', 'Makda', 'Marta', 'Mary', 'Medhanit', 'Mehari', 'Mekdes', 'Melaku', 
  'Melat', 'Menelik', 'Meron', 'Meselech', 'Mesfin', 'Meskerem', 'Michael', 
  'Mulu', 'Mulugeta', 'Mustafa',
  // N
  'Natan', 'Natnael', 'Nati', 'Nebiyu', 'Nebiat', 'Netsanet', 'Nigist',
  // R
  'Rahel', 'Rediet', 'Reeyot', 'Robel', 'Roman', 'Ruth',
  // S
  'Sabona', 'Salem', 'Samrawit', 'Samson', 'Samuel', 'Sara', 'Sarah', 'Seble', 
  'Selam', 'Selamawit', 'Semhar', 'Senait', 'Sileshi', 'Simret', 'Solomon', 
  'Sosina', 'Surafel',
  // T
  'Tadesse', 'Tamrat', 'Tariku', 'Tedros', 'Teffera', 'Tekle', 'Temesgen', 
  'Tenkir', 'Tesfaye', 'Teshale', 'Teshome', 'Tewodros', 'Tigist', 'Tinsae', 
  'Tirhas', 'Tizita', 'Tsion', 'Tsehay', 'Tsehaynesh',
  // W
  'Winta', 'Worknesh', 'Worku', 'Wondwossen',
  // Y
  'Yared', 'Yasin', 'Yehualashet', 'Yemane', 'Yohannes', 'Yonas', 'Yonatan', 
  'Yordanos', 'Yosef',
  // Z
  'Zelalem', 'Zemen', 'Zenebech', 'Zewdu', 'Zinash'
];

export const COMMON_ETHIOPIAN_LAST_NAMES: string[] = [
  // A
  'Abate', 'Abebe', 'Abera', 'Adane', 'Addis', 'Agonafir', 'Ahmed', 'Alemu', 
  'Ali', 'Amare', 'Argaw', 'Asefa', 'Asrat', 'Assefa', 'Ayele',
  // B
  'Badeg', 'Bedada', 'Bekele', 'Belay', 'Berhe', 'Berhanu', 'Beyene', 
  'Birhanu', 'Birru', 'Bogale',
  // C, D
  'Chala', 'Chernet', 'Dagne', 'Damte', 'Debebe', 'Defabachew', 'Dejene', 
  'Demissie', 'Desalegn', 'Desta',
  // E, F
  'Endale', 'Endrias', 'Eshetu', 'Fantahun', 'Fekadu', 'Fisseha',
  // G
  'Gebre', 'Gebremariam', 'Gebremeskel', 'Gebresilassie', 'Getachew', 
  'Girma', 'Gizaw', 'Gobeze',
  // H
  'Haile', 'Hailu', 'Hassen', 'Hussein',
  // K, L
  'Kassa', 'Kassahun', 'Kebede', 'Kifle', 'Kinfe', 'Legesse', 'Lemma', 'Lema',
  // M
  'Makonnen', 'Mamo', 'Megersa', 'Mehari', 'Mekonnen', 'Mengistu', 'Mersha', 
  'Mesfin', 'Moges', 'Mohammed', 'Mulugeta',
  // N, O, R
  'Negash', 'Negussie', 'Nigatu', 'Nigussie', 'Omer', 'Osman', 'Regassa', 'Robele',
  // S
  'Seifu', 'Seyoum', 'Shewarega', 'Shiferaw', 'Shimelis', 'Sileshi', 'Sisay',
  // T
  'Tadesse', 'Tafesse', 'Tariku', 'Tefera', 'Tekle', 'Tesfaye', 'Tessema', 
  'Tolessa', 'Tsegaye',
  // W, Y, Z
  'Wami', 'Wolde', 'Woldemariam', 'Worku', 'Yilma', 'Yimer', 'Yohannes', 
  'Zeleke', 'Zewde', 'Zewdu'
];

const FIRST_NAMES_KEY = 'clinic_saved_first_names';
const LAST_NAMES_KEY = 'clinic_saved_last_names';

/**
 * Capitalizes string to Title Case (e.g. "natan" -> "Natan")
 */
export function toTitleCase(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  return trimmed
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Calculate Levenshtein distance between two strings (case-insensitive)
 */
export function levenshteinDistance(a: string, b: string): number {
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[s1.length][s2.length];
}

/**
 * Read locally saved custom names from localStorage
 */
export function getSavedNamesFromStorage(type: 'first' | 'last'): string[] {
  try {
    const key = type === 'first' ? FIRST_NAMES_KEY : LAST_NAMES_KEY;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.map(n => toTitleCase(String(n))).filter(Boolean);
      }
    }
  } catch (e) {
    console.warn('Failed to read saved names from localStorage', e);
  }
  return [];
}

/**
 * Save a newly used name to localStorage so reception can quickly select it next time
 */
export function saveNameToStorage(name: string, type: 'first' | 'last'): void {
  if (!name || typeof name !== 'string') return;
  const cleanName = toTitleCase(name);
  if (cleanName.length < 2) return;

  try {
    const existing = getSavedNamesFromStorage(type);
    const set = new Set(existing);
    set.add(cleanName);
    const updated = Array.from(set).sort();
    const key = type === 'first' ? FIRST_NAMES_KEY : LAST_NAMES_KEY;
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save name to localStorage', e);
  }
}

export interface NameSuggestion {
  name: string;
  source: 'saved' | 'database' | 'common';
  distance?: number;
}

/**
 * Filter names and detect spelling suggestions
 */
export function getNameSuggestionsAndSpellCheck(
  input: string,
  allCandidates: { name: string; source: 'saved' | 'database' | 'common' }[],
  limit: number = 8
): {
  prefixMatches: NameSuggestion[];
  spellingSuggestion: NameSuggestion | null;
  isExactMatch: boolean;
} {
  const query = (input || '').trim().toLowerCase();
  if (!query) {
    // Return most popular/saved names when empty or clicked
    const defaultSaved = allCandidates.slice(0, limit);
    return {
      prefixMatches: defaultSaved,
      spellingSuggestion: null,
      isExactMatch: false,
    };
  }

  // Exact match check
  const exact = allCandidates.find(c => c.name.toLowerCase() === query);
  const isExactMatch = !!exact;

  // 1. Prefix matches (starts with typed letters)
  const prefixMatches: NameSuggestion[] = [];
  const substringMatches: NameSuggestion[] = [];

  for (const candidate of allCandidates) {
    const candLower = candidate.name.toLowerCase();
    if (candLower.startsWith(query)) {
      prefixMatches.push(candidate);
    } else if (query.length >= 2 && candLower.includes(query)) {
      substringMatches.push(candidate);
    }
  }

  // Merge prefix matches first, then substring matches
  const combinedSuggestions = [...prefixMatches, ...substringMatches].slice(0, limit);

  // 2. Spell-check check: if query is >= 3 chars, find closest name with edit distance <= 2
  let spellingSuggestion: NameSuggestion | null = null;
  if (!isExactMatch && query.length >= 3) {
    let minDistance = 99;
    let closestCandidate: NameSuggestion | null = null;

    for (const candidate of allCandidates) {
      const candLower = candidate.name.toLowerCase();
      // Skip if it's already an exact match or exact prefix match
      if (candLower === query || candLower.startsWith(query)) continue;

      const dist = levenshteinDistance(query, candLower);
      // Allow distance 1 for length 3-4, distance <= 2 for length 5+
      const maxAllowed = query.length <= 4 ? 1 : 2;

      if (dist <= maxAllowed && dist < minDistance) {
        minDistance = dist;
        closestCandidate = {
          name: candidate.name,
          source: candidate.source,
          distance: dist
        };
      }
    }

    if (closestCandidate && minDistance <= 2) {
      spellingSuggestion = closestCandidate;
    }
  }

  return {
    prefixMatches: combinedSuggestions,
    spellingSuggestion,
    isExactMatch
  };
}
