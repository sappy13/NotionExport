import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  Divider,
} from '@mui/material';
import { Settings, CheckCircle, Error } from '@mui/icons-material';

interface ConfigurationPanelProps {
  onConfigurationChange: (isConfigured: boolean) => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ onConfigurationChange }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadStoredConfig();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStoredConfig = async () => {
    try {
      const config = await window.electronAPI.getStoredConfig();
      if (config.apiKey) {
        setApiKey(config.apiKey);
        await testConnection(config.apiKey);
      }
    } catch (error) {
      console.error('Failed to load stored config:', error);
    }
  };

  const testConnection = async (keyToTest?: string) => {
    const testKey = keyToTest || apiKey;
    if (!testKey.trim()) {
      setConnectionStatus('error');
      setErrorMessage('Please enter an API key');
      return;
    }

    setIsLoading(true);
    setConnectionStatus('testing');
    
    try {
      await window.electronAPI.saveConfig({ apiKey: testKey });
      const result = await window.electronAPI.testConnection();
      
      if (result.success) {
        setConnectionStatus('success');
        setErrorMessage('');
        onConfigurationChange(true);
      } else {
        setConnectionStatus('error');
        setErrorMessage(result.error || 'Connection failed');
        onConfigurationChange(false);
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage('Failed to test connection');
      onConfigurationChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    await testConnection();
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'testing': return 'info';
      default: return 'info';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'success': return <CheckCircle />;
      case 'error': return <Error />;
      case 'testing': return <CircularProgress size={20} />;
      default: return <Settings />;
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Settings sx={{ mr: 2 }} />
            <Typography variant="h5" component="h1">
              Configuration
            </Typography>
          </Box>

          <Typography variant="h6" gutterBottom>
            Notion API Setup
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            To export your Notion content, you need to create a Notion integration and get an API key.
          </Typography>

          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Steps to get your Notion API key:
            </Typography>
            <Typography variant="body2" component="div">
              1. Go to{' '}
              <Link href="https://www.notion.so/my-integrations" target="_blank" rel="noopener">
                notion.so/my-integrations
              </Link>
              <br />
              2. Click "New integration"
              <br />
              3. Give it a name and select your workspace
              <br />
              4. Copy the "Internal Integration Token"
              <br />
              5. Share your pages/databases with the integration
            </Typography>
          </Box>

          <TextField
            fullWidth
            label="Notion API Key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="secret_..."
            sx={{ mb: 2 }}
            helperText="Your integration token starting with 'secret_'"
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Button
              variant="contained"
              onClick={handleSaveConfig}
              disabled={isLoading || !apiKey.trim()}
            >
              {isLoading ? 'Testing...' : 'Save & Test Connection'}
            </Button>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getStatusIcon()}
              <Typography variant="body2" color={getStatusColor()}>
                {connectionStatus === 'idle' && 'Not configured'}
                {connectionStatus === 'testing' && 'Testing connection...'}
                {connectionStatus === 'success' && 'Connected successfully'}
                {connectionStatus === 'error' && 'Connection failed'}
              </Typography>
            </Box>
          </Box>

          {connectionStatus === 'error' && errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          {connectionStatus === 'success' && (
            <Alert severity="success">
              Configuration saved successfully! You can now browse and export your Notion content.
            </Alert>
          )}

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Security Note
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your API key is stored securely on your local machine and is never transmitted to any external servers 
            except Notion's official API. The export process runs entirely on your computer.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};