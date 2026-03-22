import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  TextField,
  Typography,
  Chip,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import enhancedDiagnosisDatabase from '../../../data/enhancedDiagnosisDatabase';

// Enhanced search utilities (copied from ModernMedicalRecordForm)
const fuzzySearch = (text: string, query: string): boolean => {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  if (textLower.includes(queryLower)) return true;
  
  const words = queryLower.split(/\s+/);
  return words.every(word => textLower.includes(word));
};

const calculateRelevanceScore = (option: any, query: string): number => {
  const queryLower = query.toLowerCase();
  let score = 0;
  
  if (option.diagnosis.toLowerCase().includes(queryLower)) score += 100;
  if (option.nhdd.toLowerCase().includes(queryLower)) score += 80;
  if (option.icd11.toLowerCase().includes(queryLower)) score += 70;
  if (option.icd10.toLowerCase().includes(queryLower)) score += 60;
  
  if (option.commonTerms.some((term: string) => term.toLowerCase().includes(queryLower))) {
    score += 50;
  }
  
  if (option.category.toLowerCase().includes(queryLower)) score += 30;
  if (option.subcategory?.toLowerCase().includes(queryLower)) score += 25;
  if (option.icd11Chapter?.toLowerCase().includes(queryLower)) score += 20;
  if (option.icd11Block?.toLowerCase().includes(queryLower)) score += 15;
  
  if (option.category.includes('ESV-ICD-11')) score += 10;
  
  return score;
};

const SearchTest: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const results = enhancedDiagnosisDatabase
        .map(option => ({
          ...option,
          relevanceScore: calculateRelevanceScore(option, query)
        }))
        .filter(option => 
          fuzzySearch(option.diagnosis, query) ||
          fuzzySearch(option.nhdd, query) ||
          fuzzySearch(option.icd11, query) ||
          fuzzySearch(option.icd10, query) ||
          fuzzySearch(option.category, query) ||
          option.commonTerms.some((term: string) => fuzzySearch(term, query))
        )
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 10);
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const debouncedSearch = useMemo(
    () => {
      let timeoutId: NodeJS.Timeout;
      return (query: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => performSearch(query), 300);
      };
    },
    [performSearch]
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        ESV-ICD-11 Enhanced Search Test
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Test the enhanced search functionality. Try searching for:
        <br />• Diagnosis names: "typhoid", "malaria", "gastroenteritis"
        <br />• ICD codes: "ESV001", "A01.0", "1A01.0"
        <br />• Common terms: "fever", "infection", "acute"
      </Typography>

      <TextField
        fullWidth
        label="Search Diagnoses"
        placeholder="Type to search automatically..."
        value={searchQuery}
        onChange={(e) => handleSearchChange(e.target.value)}
        InputProps={{
          endAdornment: isSearching ? <CircularProgress size={20} /> : null,
        }}
        sx={{ mb: 2 }}
      />

      {searchQuery.trim() && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {isSearching ? 'Searching...' : `Found ${searchResults.length} results for "${searchQuery}"`}
          </Typography>
          {searchResults.length > 0 && !isSearching && (
            <Chip 
              label={`${searchResults.filter(r => r.relevanceScore > 80).length} high relevance`} 
              size="small" 
              color="success" 
              variant="outlined"
              sx={{ ml: 1 }}
            />
          )}
        </Box>
      )}

      <Paper sx={{ maxHeight: 400, overflow: 'auto' }}>
        <List>
          {searchResults.map((result, index) => (
            <React.Fragment key={result.nhdd}>
              <ListItem>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="body1" fontWeight="bold">
                        {result.diagnosis}
                      </Typography>
                      <Chip 
                        label={`Score: ${result.relevanceScore}`} 
                        size="small" 
                        color="info" 
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        <Chip label={`NHDD: ${result.nhdd}`} size="small" color="primary" variant="outlined" />
                        <Chip label={`ICD-10: ${result.icd10}`} size="small" color="secondary" variant="outlined" />
                        <Chip label={`ICD-11: ${result.icd11}`} size="small" color="success" variant="outlined" />
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {result.category} | {result.icd11Chapter}
                      </Typography>
                      {result.commonTerms && result.commonTerms.length > 0 && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Also known as: {result.commonTerms.slice(0, 3).join(', ')}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
              {index < searchResults.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {searchResults.length === 0 && searchQuery.trim() && !isSearching && (
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No results found for "{searchQuery}". Try different search terms.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default SearchTest;

