import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Check, Sparkles, Bookmark, User, Plus } from 'lucide-react';
import {
  COMMON_ETHIOPIAN_FIRST_NAMES,
  COMMON_ETHIOPIAN_LAST_NAMES,
  toTitleCase,
  getSavedNamesFromStorage,
  saveNameToStorage,
  getNameSuggestionsAndSpellCheck,
  NameSuggestion
} from '../../utils/nameDictionary';
import patientService from '../../services/patientService';

// Module-level in-memory cache of backend database names
let dbFirstNamesCache: string[] | null = null;
let dbLastNamesCache: string[] | null = null;
let isFetchingDbNames = false;

interface NameSpellCheckInputProps {
  id: string;
  name: string;
  label: string;
  value: string;
  type: 'first' | 'last';
  placeholder?: string;
  required?: boolean;
  error?: string;
  touched?: boolean;
  className?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  setFieldValue?: (field: string, value: any, shouldValidate?: boolean) => void;
}

export const NameSpellCheckInput: React.FC<NameSpellCheckInputProps> = ({
  id,
  name,
  label,
  value,
  type,
  placeholder = 'Enter name',
  required = false,
  error,
  touched,
  className = '',
  onChange,
  onBlur,
  setFieldValue
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dbNames, setDbNames] = useState<string[]>([]);
  const [localSavedNames, setLocalSavedNames] = useState<string[]>([]);
  const [justAppliedSpelling, setJustAppliedSpelling] = useState(false);
  const [justSavedName, setJustSavedName] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load saved and database names on mount
  useEffect(() => {
    // 1. Load from localStorage
    setLocalSavedNames(getSavedNamesFromStorage(type));

    // 2. Load from backend if not cached
    if (type === 'first' && dbFirstNamesCache) {
      setDbNames(dbFirstNamesCache);
      return;
    }
    if (type === 'last' && dbLastNamesCache) {
      setDbNames(dbLastNamesCache);
      return;
    }

    if (!isFetchingDbNames) {
      isFetchingDbNames = true;
      patientService.getNameSuggestions()
        .then(result => {
          dbFirstNamesCache = result.firstNames || [];
          dbLastNamesCache = result.lastNames || [];
          setDbNames(type === 'first' ? dbFirstNamesCache : dbLastNamesCache);
        })
        .catch(err => {
          console.warn('Could not load patient name suggestions from API:', err);
        })
        .finally(() => {
          isFetchingDbNames = false;
        });
    }
  }, [type]);

  // Combine and deduplicate all candidate names with priority (saved > database > dictionary)
  const allCandidates = useMemo(() => {
    const list: { name: string; source: 'saved' | 'database' | 'common' }[] = [];
    const seen = new Set<string>();

    // 1. Locally saved by receptionist
    for (const n of localSavedNames) {
      const lower = n.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push({ name: n, source: 'saved' });
      }
    }

    // 2. Existing patients in database
    for (const n of dbNames) {
      const lower = n.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push({ name: n, source: 'database' });
      }
    }

    // 3. Built-in common Ethiopian & standard names
    const dictionary = type === 'first' ? COMMON_ETHIOPIAN_FIRST_NAMES : COMMON_ETHIOPIAN_LAST_NAMES;
    for (const n of dictionary) {
      const lower = n.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push({ name: n, source: 'common' });
      }
    }

    return list;
  }, [localSavedNames, dbNames, type]);

  // Compute matching suggestions and spelling corrections
  const { prefixMatches, spellingSuggestion, isExactMatch } = useMemo(() => {
    return getNameSuggestionsAndSpellCheck(value, allCandidates, 7);
  }, [value, allCandidates]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle selecting a name from suggestions
  const handleSelectName = (selectedName: string) => {
    const formatted = toTitleCase(selectedName);
    if (setFieldValue) {
      setFieldValue(name, formatted, true);
    } else {
      // Create synthetic event if setFieldValue not provided
      const event = {
        target: { name, value: formatted }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(event);
    }
    setIsOpen(false);
    setActiveIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Apply spelling correction
  const handleApplySpelling = (suggestedName: string) => {
    handleSelectName(suggestedName);
    setJustAppliedSpelling(true);
    setTimeout(() => setJustAppliedSpelling(false), 2500);
  };

  // Manually save current name to quick-select list
  const handleSaveCurrentName = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!value || value.trim().length < 2) return;
    const clean = toTitleCase(value);
    saveNameToStorage(clean, type);
    setLocalSavedNames(getSavedNamesFromStorage(type));
    setJustSavedName(true);
    setTimeout(() => setJustSavedName(false), 2000);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || prefixMatches.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < prefixMatches.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : prefixMatches.length - 1));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (activeIndex >= 0 && activeIndex < prefixMatches.length) {
        e.preventDefault();
        handleSelectName(prefixMatches[activeIndex].name);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  // Formatting on blur (auto Title Case)
  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (value && value.trim()) {
      const formatted = toTitleCase(value);
      if (formatted !== value) {
        if (setFieldValue) {
          setFieldValue(name, formatted, false);
        }
      }
    }
    onBlur(e);
  };

  const hasError = touched && error;
  const isRecognized = isExactMatch;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="block text-sm font-bold text-muted-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
        
        {/* Status / Quick Save Indicator */}
        <div className="flex items-center space-x-1.5 text-xs">
          {isRecognized ? (
            <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
              <Check className="w-3.5 h-3.5 mr-0.5" /> Recognized name
            </span>
          ) : value && value.trim().length >= 2 ? (
            justSavedName ? (
              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5 mr-0.5" /> Saved!
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSaveCurrentName}
                title="Save this name for quick selection next time"
                className="inline-flex items-center text-primary/80 hover:text-primary font-medium hover:underline transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-0.5" /> Save name
              </button>
            )
          ) : null}
        </div>
      </div>

      {/* Input Field with Browser Autofill Suppressed */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={handleInputBlur}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          // Prevent Chrome / browser address autofill overlay shown in user screenshot
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          data-lpignore="true"
          data-1p-ignore="true"
          className={`block w-full rounded-lg border ${
            hasError
              ? 'border-destructive/40 focus:ring-red-500'
              : justAppliedSpelling
              ? 'border-emerald-500 ring-2 ring-emerald-400/30'
              : 'border-border/40 focus:ring-blue-500'
          } shadow-sm focus:border-transparent focus:ring-2 transition-all px-4 py-2 text-foreground bg-background`}
        />

        {value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {isRecognized && (
              <span className="text-emerald-500" title="Verified spelling">
                <Check className="w-4 h-4" />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {hasError && (
        <p className="mt-1 text-xs text-destructive">{String(error)}</p>
      )}

      {/* Spelling Check Suggestion ("Did you mean: ...?") */}
      {spellingSuggestion && !isExactMatch && (
        <div className="mt-1.5 flex items-center justify-between bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-md px-2.5 py-1 text-xs text-amber-900 dark:text-amber-200 shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>
              Did you mean: <strong className="font-semibold underline decoration-amber-500">{spellingSuggestion.name}</strong>?
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleApplySpelling(spellingSuggestion.name)}
            className="ml-2 font-semibold text-primary hover:text-primary/80 bg-white dark:bg-neutral-800 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700 shadow-xs hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
          >
            Apply
          </button>
        </div>
      )}

      {/* Quick Select Autocomplete Dropdown */}
      {isOpen && prefixMatches.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-background border border-border/60 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          <div className="px-3 py-1.5 bg-muted/30 border-b border-border/40 flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Quick Select {type === 'first' ? 'First' : 'Last'} Name</span>
            <span>{prefixMatches.length} suggested</span>
          </div>

          <ul className="py-1">
            {prefixMatches.map((item, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <li
                  key={`${item.name}-${idx}`}
                  onMouseDown={(e) => {
                    // Prevent blur before selection completes
                    e.preventDefault();
                    handleSelectName(item.name);
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`px-3 py-2 cursor-pointer flex items-center justify-between text-sm transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted/40 text-foreground'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <User className={`w-3.5 h-3.5 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    <span>{item.name}</span>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : item.source === 'saved'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : item.source === 'database'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {item.source === 'saved'
                      ? 'Saved'
                      : item.source === 'database'
                      ? 'Patient'
                      : 'Common'}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="px-3 py-1 bg-muted/20 border-t border-border/30 text-[11px] text-muted-foreground flex justify-between">
            <span>↑↓ Navigate • Enter to select</span>
            <span>Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NameSpellCheckInput;
