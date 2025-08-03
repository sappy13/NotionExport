import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Tabs,
  Tab,
  Box,
  ThemeProvider,
  createTheme,
  CssBaseline,
} from '@mui/material';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { NotionBrowser } from './components/NotionBrowser';
import { ExportPanel } from './components/ExportPanel';
import { NotionPage } from './types';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function App() {
  const [currentTab, setCurrentTab] = useState(0);
  const [isConfigured, setIsConfigured] = useState(false);
  const [selectedPages, setSelectedPages] = useState<NotionPage[]>([]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleConfigurationChange = (configured: boolean) => {
    setIsConfigured(configured);
    if (configured && currentTab === 0) {
      setCurrentTab(1); // Auto-switch to browser tab when configured
    }
  };

  const handleSelectionChange = (pages: NotionPage[]) => {
    setSelectedPages(pages);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Notion Export Tool
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              v1.0.0
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 0 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={currentTab} onChange={handleTabChange} aria-label="main navigation">
              <Tab label="Configuration" />
              <Tab 
                label="Browse Notion" 
                disabled={!isConfigured}
              />
              <Tab 
                label="Export" 
                disabled={!isConfigured || selectedPages.length === 0}
              />
            </Tabs>
          </Box>

          <TabPanel value={currentTab} index={0}>
            <ConfigurationPanel onConfigurationChange={handleConfigurationChange} />
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            {isConfigured && (
              <NotionBrowser onSelectionChange={handleSelectionChange} />
            )}
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            {isConfigured && (
              <ExportPanel selectedPages={selectedPages} />
            )}
          </TabPanel>
        </Container>

        {/* Status bar */}
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: 'grey.100',
            borderTop: 1,
            borderColor: 'divider',
            p: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {isConfigured ? 'Connected to Notion' : 'Not configured'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {selectedPages.length > 0 && `${selectedPages.length} page(s) selected`}
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
