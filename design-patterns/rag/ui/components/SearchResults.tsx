"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import {
  Typography,
  Button,
  Box,
  Container,
  CircularProgress,
  Alert,
  TextField,
  Collapse,
  List,
  ListItemButton,
  Paper,
} from "@mui/material"
import { Search, ChevronDown, ChevronUp } from "lucide-react"
import debounce from "lodash/debounce"
import { type PaperResult, type ApiType } from "@/types/api"
import { getSuggestions } from "@/lib/api"

interface SearchResultsProps {
  results: PaperResult[]
  api: ApiType
  query: string
  onSearch: (results: PaperResult[], api: ApiType, query: string) => void
}

export default function SearchResults({ results, api, query, onSearch }: SearchResultsProps) {
  const searchParams = useSearchParams()
  const [papers, setPapers] = useState<PaperResult[]>(results)
  const [searchQuery, setSearchQuery] = useState<string>(query)
  const [displayedQuery, setDisplayedQuery] = useState<string>(query)
  const [expandedSnippets, setExpandedSnippets] = useState<{ [key: number]: boolean }>({})
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const q = searchParams.get("q") || ""
    setSearchQuery(q)
  }, [searchParams])

  useEffect(() => {
    setPapers(results)
  }, [results])

  const fetchSuggestions = debounce(async (value: string) => {
    if (value.length >= 3) {
      try {
        const { suggestions } = await getSuggestions(value, api)
        setSuggestions(suggestions)
        setError(null)
      } catch {
        setError("Failed to fetch suggestions.")
        setSuggestions([])
      }
    } else {
      setSuggestions([])
    }
  }, 300)

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) return

    setLoading(true)
    setSuggestions([])

    try {
      const dummyResults = papers // keep existing results, replace later
      onSearch(dummyResults, api, searchQuery)
      setDisplayedQuery(searchQuery)
      setError(null)
    } catch {
      setError("Failed to fetch papers.")
    } finally {
      setLoading(false)
    }
  }

  const toggleSnippet = (index: number) => {
    setExpandedSnippets(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  const isSnippetTruncated = (snippet: string | null | undefined): boolean => {
    return !!snippet && snippet.length > 300
  }

  return (
    <Box className="min-h-screen flex flex-col bg-white" sx={{ height: 'calc(100vh - 64px)', overflow: 'auto' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, color: "#000" }}>
          Search Results for "{displayedQuery}"
        </Typography>

        <Box component="form" onSubmit={handleSearch} sx={{ mb: 4, position: "relative" }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search for research papers..."
            value={searchQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              blurTimeoutRef.current = setTimeout(() => setIsFocused(false), 150)
            }}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              fetchSuggestions(e.target.value)
            }}
            InputProps={{
              endAdornment: (
                <Button type="submit" variant="contained" sx={{ borderRadius: "0 4px 4px 0" }}>
                  <Search />
                </Button>
              ),
            }}
          />

          {suggestions.length > 0 && isFocused && (
            <Paper
              elevation={3}
              sx={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 10,
                mt: 0.5,
                maxHeight: 300,
                overflowY: "auto",
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <List disablePadding>
                {suggestions.map((sugg, idx) => (
                  <ListItemButton
                    key={idx}
                    onClick={() => {
                      setSearchQuery(sugg)
                      setSuggestions([])
                      setTimeout(() => {
                        handleSearch()
                      }, 0)
                    }}
                    sx={{ py: 1.5, px: 2 }}
                  >
                    {sugg}
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center"><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : papers.length > 0 ? (
          <Box sx={{ border: '1px solid #eee', borderRadius: 2, p: 3 }}>
            {papers.map((paper, index) => {
              const isExpanded = expandedSnippets[index]
              const shouldTruncate = isSnippetTruncated(paper.snippet)

              return (
                <Box key={index} sx={{ mb: 3, pb: 3, borderBottom: index < papers.length - 1 ? '1px solid #eee' : 'none' }}>
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    <a href={paper.url} target="_blank" rel="noopener noreferrer" style={{ color: "#1a0dab", textDecoration: "none" }}>
                      {paper.title}
                    </a>
                  </Typography>

                  {paper.snippet ? (
                    <Box>
                      <Collapse in={isExpanded} collapsedSize={60}>
                        <Typography variant="body2" color="text.secondary">
                          {paper.snippet}
                        </Typography>
                      </Collapse>
                      {shouldTruncate && (
                        <Button
                          onClick={() => toggleSnippet(index)}
                          startIcon={isExpanded ? <ChevronUp /> : <ChevronDown />}
                          sx={{ mt: 1, color: "#006621", textTransform: 'none' }}
                        >
                          {isExpanded ? "Show Less" : "Read More"}
                        </Button>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No abstract available
                    </Typography>
                  )}
                </Box>
              )
            })}
          </Box>
        ) : (
          <Typography>No results found.</Typography>
        )}
      </Container>
    </Box>
  )
}