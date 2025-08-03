import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Checkbox,
  Chip,
  Alert,
  CircularProgress,
  InputAdornment,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Search,
  ExpandMore,
  ExpandLess,
  Description,
  Folder,
} from '@mui/icons-material';
import { NotionPage } from '../types';

interface NotionBrowserProps {
  onSelectionChange: (selectedPages: NotionPage[]) => void;
}

export const NotionBrowser: React.FC<NotionBrowserProps> = ({ onSelectionChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NotionPage[]>([]);
  const [selectedPages, setSelectedPages] = useState<NotionPage[]>([]);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [pageChildren, setPageChildren] = useState<Map<string, NotionPage[]>>(new Map());
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [loadingChildren, setLoadingChildren] = useState<Set<string>>(new Set());

  useEffect(() => {
    onSelectionChange(selectedPages);
  }, [selectedPages, onSelectionChange]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError('');
    
    try {
      const result = await window.electronAPI.searchNotion(searchQuery);
      
      if (result.success && result.pages) {
        setSearchResults(result.pages);
      } else {
        setSearchError(result.error || 'Search failed');
        setSearchResults([]);
      }
    } catch (error) {
      setSearchError('Failed to search Notion');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const togglePageExpansion = async (page: NotionPage) => {
    const newExpanded = new Set(expandedPages);
    
    if (expandedPages.has(page.id)) {
      newExpanded.delete(page.id);
    } else {
      newExpanded.add(page.id);
      
      if (!pageChildren.has(page.id)) {
        setLoadingChildren(new Set(loadingChildren).add(page.id));
        
        try {
          const result = await window.electronAPI.getPageChildren(page.id);
          
          if (result.success && result.children) {
            const newChildren = new Map(pageChildren);
            newChildren.set(page.id, result.children);
            setPageChildren(newChildren);
          }
        } catch (error) {
          console.error('Failed to load children:', error);
        } finally {
          const newLoading = new Set(loadingChildren);
          newLoading.delete(page.id);
          setLoadingChildren(newLoading);
        }
      }
    }
    
    setExpandedPages(newExpanded);
  };

  const togglePageSelection = (page: NotionPage) => {
    const isSelected = selectedPages.some(p => p.id === page.id);
    
    if (isSelected) {
      setSelectedPages(selectedPages.filter(p => p.id !== page.id));
    } else {
      setSelectedPages([...selectedPages, page]);
    }
  };

  const isPageSelected = (page: NotionPage) => {
    return selectedPages.some(p => p.id === page.id);
  };

  const clearSelection = () => {
    setSelectedPages([]);
  };

  const renderPageItem = (page: NotionPage, level: number = 0) => {
    const hasChildren = page.hasChildren || (pageChildren.get(page.id)?.length || 0) > 0;
    const isExpanded = expandedPages.has(page.id);
    const isSelected = isPageSelected(page);
    const children = pageChildren.get(page.id) || [];
    const isLoadingChildren = loadingChildren.has(page.id);

    return (
      <Box key={page.id}>
        <ListItem
          disablePadding
          sx={{
            pl: level * 2,
            borderLeft: level > 0 ? '1px solid #e0e0e0' : 'none',
          }}
        >
          <ListItemButton
            onClick={() => togglePageSelection(page)}
            sx={{ flex: 1 }}
          >
            <Checkbox
              checked={isSelected}
              onChange={() => togglePageSelection(page)}
              edge="start"
              tabIndex={-1}
              disableRipple
            />
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
              {hasChildren ? (
                <Folder sx={{ fontSize: 20, color: 'primary.main' }} />
              ) : (
                <Description sx={{ fontSize: 20, color: 'text.secondary' }} />
              )}
            </Box>
            <ListItemText
              primary={page.title}
              secondary={`ID: ${page.id}`}
              primaryTypographyProps={{
                variant: 'body2',
                sx: { fontWeight: isSelected ? 'bold' : 'normal' }
              }}
              secondaryTypographyProps={{
                variant: 'caption',
                sx: { fontSize: '0.7rem' }
              }}
            />
          </ListItemButton>
          
          {hasChildren && (
            <IconButton
              onClick={() => togglePageExpansion(page)}
              size="small"
              disabled={isLoadingChildren}
            >
              {isLoadingChildren ? (
                <CircularProgress size={16} />
              ) : isExpanded ? (
                <ExpandLess />
              ) : (
                <ExpandMore />
              )}
            </IconButton>
          )}
        </ListItem>

        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List disablePadding>
              {children.map(child => renderPageItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Search sx={{ mr: 2 }} />
            <Typography variant="h5" component="h2">
              Browse Notion Content
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              label="Search pages, databases, or content"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleSearch} disabled={isSearching}>
                      {isSearching ? <CircularProgress size={20} /> : <Search />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {selectedPages.length > 0 && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2">
                  Selected Pages ({selectedPages.length})
                </Typography>
                <Button size="small" onClick={clearSelection}>
                  Clear Selection
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedPages.map(page => (
                  <Chip
                    key={page.id}
                    label={page.title}
                    onDelete={() => togglePageSelection(page)}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          {searchError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {searchError}
            </Alert>
          )}

          {searchResults.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Search Results ({searchResults.length} pages)
              </Typography>
              <List sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                {searchResults.map(page => renderPageItem(page))}
              </List>
            </Box>
          )}

          {!isSearching && searchResults.length === 0 && searchQuery && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              No pages found. Try a different search term or make sure your pages are shared with the integration.
            </Typography>
          )}

          {!searchQuery && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Search for pages to get started. You can search by page title, content, or database name.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};