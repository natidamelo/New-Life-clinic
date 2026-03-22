import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Fade,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Edit as EditIcon,
  Visibility as ViewIcon,
  Save as SaveIcon,
  CloudUpload as CloudUploadIcon,
  Storage as StorageIcon,
  RestoreFromTrash as RestoreIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  AccessTime as TimeIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { MemoryState } from '../../services/memorySystem';
import { formatDistanceToNow } from 'date-fns';

interface MemorySystemControlsProps {
  // Memory state
  memoryState: MemoryState;
  isEditMode: boolean;
  
  // Mode controls
  onToggleMode: () => void;
  onSetEditMode: () => void;
  onSetViewMode: () => void;
  
  // Storage controls
  onSaveToStorage: () => void;
  onLoadFromStorage: () => void;
  onClearStorage: () => void;
  hasStoredData: boolean;
  
  // Server controls
  onSaveToServer: () => Promise<void>;
  onForceSave: () => Promise<void>;
  
  // Utility
  lastSaved: string;
  storageInfo: { key: string; size: number; lastSaved: string; hasData: boolean };
  hasUnsavedChanges: boolean;
  
  // Optional props
  compact?: boolean;
  showStorageInfo?: boolean;
}

const MemorySystemControls: React.FC<MemorySystemControlsProps> = ({
  memoryState,
  isEditMode,
  onToggleMode,
  onSetEditMode,
  onSetViewMode,
  onSaveToStorage,
  onLoadFromStorage,
  onClearStorage,
  hasStoredData,
  onSaveToServer,
  onForceSave,
  lastSaved,
  storageInfo,
  hasUnsavedChanges,
  compact = false,
  showStorageInfo = true
}) => {
  const [showStorageDialog, setShowStorageDialog] = useState(false);

  const formatLastSaved = (timestamp: string) => {
    if (!timestamp) return 'Never saved';
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  const formatStorageSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusColor = () => {
    if (memoryState.isAutoSaving) return 'info';
    if (hasUnsavedChanges) return 'warning';
    if (memoryState.lastSaved) return 'success';
    return 'default';
  };

  const getStatusText = () => {
    if (memoryState.isAutoSaving) return 'Auto-saving...';
    if (hasUnsavedChanges) return 'Unsaved changes';
    if (memoryState.lastSaved) return 'All changes saved';
    return 'Not saved';
  };

  const getStatusIcon = () => {
    if (memoryState.isAutoSaving) return <CloudUploadIcon />;
    if (hasUnsavedChanges) return <ErrorIcon />;
    if (memoryState.lastSaved) return <CheckCircleIcon />;
    return <StorageIcon />;
  };

  if (compact) {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        {/* Mode Toggle */}
        <Tooltip title={isEditMode ? 'Switch to View Mode' : 'Switch to Edit Mode'}>
          <IconButton
            onClick={onToggleMode}
            color={isEditMode ? 'primary' : 'default'}
            size="small"
          >
            {isEditMode ? <EditIcon /> : <ViewIcon />}
          </IconButton>
        </Tooltip>

        {/* Status Indicator */}
        <Tooltip title={`${getStatusText()} • Last saved: ${formatLastSaved(lastSaved)}`}>
          <Chip
            icon={getStatusIcon()}
            label={getStatusText()}
            color={getStatusColor()}
            size="small"
            variant={hasUnsavedChanges ? 'outlined' : 'filled'}
          />
        </Tooltip>

        {/* Auto-save Progress */}
        {memoryState.isAutoSaving && (
          <Fade in={memoryState.isAutoSaving}>
            <Box sx={{ width: 60 }}>
              <LinearProgress />
            </Box>
          </Fade>
        )}
      </Box>
    );
  }

  return (
    <Box>
      {/* Main Controls */}
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        {/* Mode Controls */}
        <Box display="flex" gap={1}>
          <Button
            variant={isEditMode ? 'contained' : 'outlined'}
            startIcon={<EditIcon />}
            onClick={onSetEditMode}
            size="small"
          >
            Edit Mode
          </Button>
          <Button
            variant={!isEditMode ? 'contained' : 'outlined'}
            startIcon={<ViewIcon />}
            onClick={onSetViewMode}
            size="small"
          >
            View Mode
          </Button>
        </Box>

        {/* Status */}
        <Box display="flex" alignItems="center" gap={1}>
          <Chip
            icon={getStatusIcon()}
            label={getStatusText()}
            color={getStatusColor()}
            variant={hasUnsavedChanges ? 'outlined' : 'filled'}
          />
          {memoryState.isAutoSaving && (
            <Box sx={{ width: 100 }}>
              <LinearProgress />
            </Box>
          )}
        </Box>

        {/* Last Saved */}
        <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
          <TimeIcon fontSize="small" />
          {formatLastSaved(lastSaved)}
        </Typography>
      </Box>

      {/* Action Buttons */}
      <Box display="flex" gap={1} mb={2}>
        <Button
          variant="outlined"
          startIcon={<SaveIcon />}
          onClick={onSaveToStorage}
          size="small"
          disabled={!hasUnsavedChanges}
        >
          Save to Browser
        </Button>

        <Button
          variant="outlined"
          startIcon={<CloudUploadIcon />}
          onClick={onForceSave}
          size="small"
          disabled={memoryState.isAutoSaving}
        >
          {memoryState.isAutoSaving ? 'Saving...' : 'Save to Server'}
        </Button>

        {hasStoredData && (
          <Button
            variant="outlined"
            startIcon={<RestoreIcon />}
            onClick={onLoadFromStorage}
            size="small"
          >
            Restore
          </Button>
        )}

        <Button
          variant="outlined"
          startIcon={<StorageIcon />}
          onClick={() => setShowStorageDialog(true)}
          size="small"
        >
          Storage Info
        </Button>

        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={onClearStorage}
          size="small"
          disabled={!hasStoredData}
        >
          Clear Storage
        </Button>
      </Box>

      {/* Memory System Info */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'grey.50', 
        borderRadius: 1, 
        border: '1px solid',
        borderColor: 'grey.200'
      }}>
        <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center" gap={1}>
          <InfoIcon fontSize="small" />
          Memory System Status
        </Typography>
        
        <Box display="flex" gap={2} flexWrap="wrap">
          <Typography variant="caption">
            <strong>Mode:</strong> {isEditMode ? 'Edit' : 'View'}
          </Typography>
          <Typography variant="caption">
            <strong>Auto-save:</strong> {memoryState.isAutoSaving ? 'Active' : 'Idle'}
          </Typography>
          <Typography variant="caption">
            <strong>Dirty:</strong> {memoryState.isDirty ? 'Yes' : 'No'}
          </Typography>
          <Typography variant="caption">
            <strong>Storage:</strong> {hasStoredData ? 'Available' : 'Empty'}
          </Typography>
        </Box>
      </Box>

      {/* Storage Info Dialog */}
      <Dialog open={showStorageDialog} onClose={() => setShowStorageDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Storage Information</DialogTitle>
        <DialogContent>
          <List>
            <ListItem>
              <ListItemIcon><StorageIcon /></ListItemIcon>
              <ListItemText 
                primary="Storage Key" 
                secondary={storageInfo.key} 
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon><InfoIcon /></ListItemIcon>
              <ListItemText 
                primary="Storage Size" 
                secondary={formatStorageSize(storageInfo.size)} 
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon><TimeIcon /></ListItemIcon>
              <ListItemText 
                primary="Last Saved" 
                secondary={formatLastSaved(storageInfo.lastSaved)} 
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon><CheckCircleIcon /></ListItemIcon>
              <ListItemText 
                primary="Has Data" 
                secondary={storageInfo.hasData ? 'Yes' : 'No'} 
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>
            Memory System Features:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText 
                primary="✅ Remembers" 
                secondary="All your written content is automatically saved" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="✅ Persists" 
                secondary="Data survives browser refreshes and page reloads" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="✅ Recovers" 
                secondary="Content is restored when you return to the form" 
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStorageDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MemorySystemControls;
