import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Toolbar,
} from '@mui/material';
import {
  Clear as ClearIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
}

interface LogsPanelProps {}

export function LogsPanel(_props: LogsPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Get initial logs from electron
    loadLogs();

    // Set up listener for new log entries
    const removeListener = (window as any).electronAPI?.onLogMessage?.(
      (logEntry: LogEntry) => {
        setLogs(prev => [...prev, logEntry]);
      }
    );

    return removeListener;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const loadLogs = async () => {
    try {
      const storedLogs = await (window as any).electronAPI?.getLogs?.();
      if (storedLogs) {
        setLogs(storedLogs);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const clearLogs = async () => {
    try {
      await (window as any).electronAPI?.clearLogs?.();
      setLogs([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const exportLogs = () => {
    const logText = logs
      .map(log => `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`)
      .join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notion-export-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(log => 
    filterLevel === 'all' || log.level === filterLevel
  );

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'error';
      case 'warn': return 'warning';
      case 'info': return 'info';
      case 'debug': return 'secondary';
      default: return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar variant="dense" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Application Logs
        </Typography>
        
        <FormControl size="small" sx={{ mr: 2, minWidth: 120 }}>
          <InputLabel>Filter Level</InputLabel>
          <Select
            value={filterLevel}
            label="Filter Level"
            onChange={(e) => setFilterLevel(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="error">Error</MenuItem>
            <MenuItem value="warn">Warning</MenuItem>
            <MenuItem value="info">Info</MenuItem>
            <MenuItem value="debug">Debug</MenuItem>
          </Select>
        </FormControl>

        <IconButton size="small" onClick={loadLogs} title="Refresh">
          <RefreshIcon />
        </IconButton>
        
        <IconButton size="small" onClick={exportLogs} title="Export Logs">
          <DownloadIcon />
        </IconButton>
        
        <IconButton size="small" onClick={clearLogs} title="Clear Logs">
          <ClearIcon />
        </IconButton>
      </Toolbar>

      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto', 
        p: 1,
        backgroundColor: '#fafafa'
      }}>
        {filteredLogs.length === 0 ? (
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ textAlign: 'center', mt: 4 }}
          >
            No logs available
          </Typography>
        ) : (
          filteredLogs.map((log, index) => (
            <Paper
              key={index}
              sx={{
                p: 1,
                mb: 1,
                fontSize: '0.875rem',
                fontFamily: 'monospace',
                backgroundColor: log.level === 'error' ? '#ffebee' : 
                                log.level === 'warn' ? '#fff3e0' : 'white'
              }}
              elevation={1}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {formatTimestamp(log.timestamp)}
                </Typography>
                <Chip
                  label={log.level.toUpperCase()}
                  size="small"
                  color={getLevelColor(log.level) as any}
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
                {log.source && (
                  <Typography variant="caption" color="text.secondary">
                    [{log.source}]
                  </Typography>
                )}
              </Box>
              <Typography 
                variant="body2" 
                sx={{ 
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {log.message}
              </Typography>
            </Paper>
          ))
        )}
        <div ref={logsEndRef} />
      </Box>

      <Box sx={{ 
        p: 1, 
        borderTop: 1, 
        borderColor: 'divider',
        backgroundColor: 'background.paper'
      }}>
        <Typography variant="caption" color="text.secondary">
          {filteredLogs.length} log entries
          {filterLevel !== 'all' && ` (filtered by ${filterLevel})`}
        </Typography>
      </Box>
    </Box>
  );
}