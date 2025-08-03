import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  TextField,
  Alert,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Download,
  FolderOpen,
  PictureAsPdf,
  Description,
  CheckCircle,
  Error,
  Folder,
} from '@mui/icons-material';
import { NotionPage, ExportOptions, ExportProgress } from '../types';

interface ExportPanelProps {
  selectedPages: NotionPage[];
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ selectedPages }) => {
  const [outputDirectory, setOutputDirectory] = useState('');
  const [selectedFormats, setSelectedFormats] = useState<('pdf' | 'docx')[]>(['pdf', 'docx']);
  const [includeChildren, setIncludeChildren] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportResults, setExportResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadLastExportDirectory();
    
    const cleanup = window.electronAPI.onExportProgress((progress) => {
      setExportProgress(progress);
    });

    return cleanup;
  }, []);

  const loadLastExportDirectory = async () => {
    try {
      const config = await window.electronAPI.getStoredConfig();
      if (config.lastExportDir) {
        setOutputDirectory(config.lastExportDir);
      }
    } catch (error) {
      console.error('Failed to load last export directory:', error);
    }
  };

  const handleSelectDirectory = async () => {
    try {
      const result = await window.electronAPI.selectExportDirectory();
      if (result.success && result.path) {
        setOutputDirectory(result.path);
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
    }
  };

  const handleFormatChange = (format: 'pdf' | 'docx') => {
    if (selectedFormats.includes(format)) {
      setSelectedFormats(selectedFormats.filter(f => f !== format));
    } else {
      setSelectedFormats([...selectedFormats, format]);
    }
  };

  const handleExport = async () => {
    if (selectedPages.length === 0) {
      return;
    }

    if (!outputDirectory) {
      alert('Please select an output directory');
      return;
    }

    if (selectedFormats.length === 0) {
      alert('Please select at least one export format');
      return;
    }

    setIsExporting(true);
    setExportProgress(null);
    setExportResults(null);

    const options: ExportOptions = {
      pageIds: selectedPages.map(p => p.id),
      outputDir: outputDirectory,
      formats: selectedFormats,
      includeChildren,
    };

    try {
      const result = await window.electronAPI.exportPages(options);
      setExportResults(result);
      setShowResults(true);
    } catch (error) {
      let errorMessage = 'Export failed';
      if (error instanceof Error) {
        errorMessage = (error as Error).message;
      }
      setExportResults({
        success: false,
        error: errorMessage
      });
      setShowResults(true);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const getExportSummary = () => {
    if (!includeChildren) {
      return `${selectedPages.length} page(s)`;
    }
    return `${selectedPages.length} page(s) + subpages`;
  };


  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Download sx={{ mr: 2 }} />
            <Typography variant="h5" component="h2">
              Export Settings
            </Typography>
          </Box>

          {selectedPages.length === 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Select pages from the browser above to configure export options.
            </Alert>
          )}

          {selectedPages.length > 0 && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Selected Pages ({selectedPages.length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {selectedPages.map(page => (
                    <Chip
                      key={page.id}
                      label={page.title}
                      size="small"
                      variant="outlined"
                      icon={<Folder />}
                    />
                  ))}
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Output Directory
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    value={outputDirectory}
                    placeholder="Select output directory..."
                    InputProps={{ readOnly: true }}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleSelectDirectory}
                    startIcon={<FolderOpen />}
                  >
                    Browse
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">
                    <Typography variant="h6">Export Formats</Typography>
                  </FormLabel>
                  <FormGroup row>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedFormats.includes('pdf')}
                          onChange={() => handleFormatChange('pdf')}
                          icon={<PictureAsPdf />}
                          checkedIcon={<PictureAsPdf color="primary" />}
                        />
                      }
                      label="PDF"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedFormats.includes('docx')}
                          onChange={() => handleFormatChange('docx')}
                          icon={<Description />}
                          checkedIcon={<Description color="primary" />}
                        />
                      }
                      label="DOCX"
                    />
                  </FormGroup>
                </FormControl>
              </Box>

              <Box sx={{ mb: 3 }}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">
                    <Typography variant="h6">Export Options</Typography>
                  </FormLabel>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={includeChildren}
                          onChange={(e) => setIncludeChildren(e.target.checked)}
                        />
                      }
                      label="Include all subpages"
                    />
                  </FormGroup>
                </FormControl>
              </Box>

              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Export Summary
                </Typography>
                <Typography variant="body2">
                  Will export: {getExportSummary()} to {selectedFormats.join(' and ')} format(s)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Output: {outputDirectory || 'No directory selected'}
                </Typography>
              </Box>

              {isExporting && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    Exporting...
                  </Typography>
                  <LinearProgress />
                  {exportProgress && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Progress: {exportProgress.completed}/{exportProgress.total} pages
                      {exportProgress.currentPage && ` (Current: ${exportProgress.currentPage})`}
                    </Typography>
                  )}
                </Box>
              )}

              <Button
                variant="contained"
                size="large"
                onClick={handleExport}
                disabled={isExporting || !outputDirectory || selectedFormats.length === 0}
                startIcon={<Download />}
                fullWidth
              >
                {isExporting ? 'Exporting...' : 'Start Export'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showResults}
        onClose={() => setShowResults(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {exportResults?.success ? (
              <CheckCircle color="success" />
            ) : (
              <Error color="error" />
            )}
            Export {exportResults?.success ? 'Completed' : 'Failed'}
          </Box>
        </DialogTitle>
        <DialogContent>
          {exportResults?.success ? (
            <Box>
              <Typography gutterBottom>
                Successfully exported {exportResults.totalFiles || 0} files!
              </Typography>
              {exportResults.results && (
                <List>
                  {exportResults.results.map((result: any, index: number) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {result.success ? (
                          <CheckCircle color="success" />
                        ) : (
                          <Error color="error" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={`Page: ${result.pageId}`}
                        secondary={
                          result.success
                            ? `${result.files.length} files created`
                            : result.errors.join(', ')
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Files saved to: {outputDirectory}
              </Typography>
            </Box>
          ) : (
            <Typography color="error">
              {exportResults?.error || 'An unknown error occurred'}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResults(false)}>Close</Button>
          {exportResults?.success && (
            <Button
              variant="contained"
              onClick={() => {
                // Open the export directory in file explorer
                // This would need to be implemented in the main process
                window.electronAPI.selectExportDirectory();
              }}
            >
              Open Export Folder
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};