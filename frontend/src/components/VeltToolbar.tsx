import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  VeltPresence,
  VeltCommentTool,
  VeltHuddleTool,
} from '@veltdev/react';

const VeltToolbar: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const showCollaborativeTools = ['doctor', 'admin', 'super_admin'].includes(user.role?.toLowerCase());

  return (
    <div className="flex items-center gap-3 bg-card/60 border border-border/80 rounded-xl px-3 py-1.5 backdrop-blur-md shadow-sm">
      <VeltPresence />
      
      {showCollaborativeTools && (
        <div className="flex items-center gap-2 border-l border-border/60 pl-2">
          <VeltCommentTool />
          <VeltHuddleTool />
        </div>
      )}
    </div>
  );
};

export default VeltToolbar;
