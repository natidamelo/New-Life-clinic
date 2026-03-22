import React, { useState } from 'react';
import { 
  Box, Typography, Button, Paper, CircularProgress, 
  List, ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction, 
  IconButton, Divider
} from '@mui/material';
import { 
  CloudUpload as UploadIcon, 
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';

interface FileUploadProps {
  patientId: string;
  recordId?: string;
  disabled?: boolean;
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  patientId, 
  recordId,
  disabled = false
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Mock file upload function
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    setUploading(true);
    
    // Simulate upload delay
    setTimeout(() => {
      const newFiles: UploadedFile[] = Array.from(event.target.files || []).map(file => ({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
        uploadedAt: new Date()
      }));
      
      setFiles([...files, ...newFiles]);
      setUploading(false);
      
      // Reset input
      if (event.target) {
        event.target.value = '';
      }
    }, 1000);
  };
  
  const handleDelete = (id: string) => {
    setFiles(files.filter(file => file.id !== id));
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ mb: 3 }}>
      {!disabled && (
        <Box 
          sx={{ 
            border: '2px dashed #ccc', 
            borderRadius: 2, 
            p: 3, 
            textAlign: 'center',
            mb: 3,
            bgcolor: 'background.paper'
          }}
        >
          <input
            type="file"
            id="file-upload"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
            disabled={disabled || uploading}
          />
          <label htmlFor="file-upload">
            <Button
              component="span"
              variant="contained"
              startIcon={<UploadIcon />}
              disabled={disabled || uploading}
              sx={{ mb: 2 }}
            >
              {uploading ? 'Uploading...' : 'Upload Files'}
            </Button>
          </label>
          {uploading && <CircularProgress size={24} sx={{ ml: 2 }} />}
          <Typography variant="body2" color="text.secondary">
            Click to upload patient documents, images, or test results
          </Typography>
        </Box>
      )}
      
      {files.length > 0 ? (
        <Paper>
          <List>
            {files.map((file, index) => (
              <React.Fragment key={file.id}>
                {index > 0 && <Divider component="li" />}
                <ListItem>
                  <ListItemIcon>
                    {file.type.startsWith('image/') ? (
                      <img 
                        src={file.url} 
                        alt={file.name}
                        style={{ width: 40, height: 40, objectFit: 'cover' }}
                      />
                    ) : (
                      <FileIcon color="primary" />
                    )}
                  </ListItemIcon>
                  <ListItemText 
                    primary={file.name} 
                    secondary={`${formatFileSize(file.size)} • Uploaded ${file.uploadedAt.toLocaleTimeString()}`}
                  />
                  {!disabled && (
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => handleDelete(file.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      ) : (
        <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
          No files uploaded yet.
        </Typography>
      )}
    </Box>
  );
};

export default FileUpload; 