'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  TextField,
  List,
  ListItem,
  ListItemText,
  Typography,
  Button,
  CircularProgress,
  Paper,
} from '@mui/material';
import debounce from 'lodash/debounce';

type PaperResult = {
  id: string;
  title: string;
  snippet: string | null;
};

const SearchResults = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PaperResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);

  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestions = useRef(
    debounce(async (value: string) => {
      try {
        if (value.length >= 3) {
          const res = await fetch(/api/suggestions?q=${value});
          const data = await res.json();
          setSuggestions(data.suggestions);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        setSuggestions([]);
      }
    }, 300)
  ).current;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    fetchSuggestions(value);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setSuggestions([]);

    try {
      const res = await fetch(/api/search?q=${query});
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.results);
    } catch (err) {
      setError('Failed to fetch search results.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch();
  };

  const toggleExpanded = (paperId: string) => {
    setExpandedPaperId((prevId) => (prevId === paperId ? null : paperId));
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <TextField
        label="Search papers"
        variant="outlined"
        fullWidth
        value={query}
        onChange={handleInputChange}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        onBlur={() => {
          blurTimeoutRef.current = setTimeout(() => setIsFocused(false), 200);
        }}
        onFocus={() => {
          if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
          setIsFocused(true);
        }}
      />

      {suggestions.length > 0 && isFocused && (
        <Paper elevation={3} className="mt-2">
          <List>
            {suggestions.map((s, i) => (
              <ListItem component="button" key={i} onClick={() => handleSuggestionClick(s)}>
                <ListItemText primary={s} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {loading && <CircularProgress className="mt-4" />}

      {error && <Typography color="error">{error}</Typography>}

      <List className="mt-4">
        {results.map((paper) => (
          <ListItem key={paper.id} className="flex flex-col items-start gap-2">
            <Typography variant="h6">{paper.title}</Typography>
            <Typography variant="body2">
              {expandedPaperId === paper.id
                ? paper.snippet ?? 'No snippet available'
                : (paper.snippet ?? 'No snippet available').slice(0, 200) + '...'}
            </Typography>
            {paper.snippet && paper.snippet.length > 200 && (
              <Button
                size="small"
                onClick={() => toggleExpanded(paper.id)}
              >
                {expandedPaperId === paper.id ? 'Show Less' : 'Show More'}
              </Button>
            )}
          </ListItem>
        ))}
      </List>
    </div>
  );
};

export default SearchResults;