import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger
} from './ui/sheet';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { ChatBubbleLeftRightIcon, TrashIcon } from '@heroicons/react/24/outline';
import { commentService, Comment } from '../services/commentService';
import userService from '../services/userService';
import { User } from '../types/user';
import { toast } from 'react-hot-toast';
interface CustomSidebarCommentsProps {
  children?: React.ReactNode;
}

const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // A5
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(1.0, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.log("Audio not supported");
  }
};

const CustomSidebarComments: React.FC<CustomSidebarCommentsProps> = ({ children }) => {
  const { user } = useAuth();
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
  const hasDeletePermission = user && user.permissions && user.permissions.deleteMessages === true;
  const canDelete = isAdmin || hasDeletePermission;

  const [comments, setComments] = useState<Comment[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recipientId, setRecipientId] = useState<string>('all');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const isFirstLoad = React.useRef(true);
  const lastCommentCount = React.useRef(0);
  const userIdRef = React.useRef(user?.id || (user as any)?._id);
  const isOpenRef = React.useRef(isOpen);

  useEffect(() => {
    userIdRef.current = user?.id || (user as any)?._id;
  }, [user]);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setUnreadCount(0); // clear unread count when opened
    }
  }, [isOpen]);

  // Fetch comments and users from API
  const fetchComments = async () => {
    try {
      const data = await commentService.getComments();
      
      if (!isFirstLoad.current && data.length > lastCommentCount.current) {
        const newComments = data.slice(lastCommentCount.current);
        const currentUserId = userIdRef.current;
        const newFromOthers = newComments.filter(c => c.userId !== currentUserId);
        
        if (newFromOthers.length > 0) {
          playNotificationSound();
          if (!isOpenRef.current) {
            setUnreadCount(prev => prev + newFromOthers.length);
          }
        }
      }
      
      lastCommentCount.current = data.length;
      setComments(data);
    } catch (error) {
      console.error('Failed to fetch comments', error);
    } finally {
      setIsLoaded(true);
      isFirstLoad.current = false;
    }
  };

  const fetchUsers = async () => {
    try {
      const users = await userService.getAllUsers();
      setAllUsers(users || []);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  // Continuous polling
  useEffect(() => {
    fetchComments();
    fetchUsers();

    const intervalId = setInterval(fetchComments, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    const currentText = newComment.trim();
    setNewComment(''); // Optimistically clear input

    const mentionedUserIds: string[] = [];
    if (recipientId !== 'all') {
      mentionedUserIds.push(recipientId);
    }

    try {
      const savedComment = await commentService.createComment({ 
        text: currentText,
        mentionedUserIds
      });
      setComments(prev => [...prev, savedComment]);
    } catch (error) {
      console.error('Failed to add comment', error);
      // Restore text if failed
      setNewComment(currentText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
  };

  const handleDeleteConfirm = async (deleteType: 'both' | 'me') => {
    if (!deleteTargetId) return;
    
    try {
      await commentService.deleteComment(deleteTargetId, deleteType);
      setComments(prev => prev.filter(c => c._id !== deleteTargetId));
      toast.success(deleteType === 'both' ? 'Message deleted for everyone' : 'Message deleted for you');
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
    } finally {
      setDeleteTargetId(null);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
           ' ' + 
           date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children ? children : (
          <div className="flex items-center justify-between px-3 py-1.5 border border-sidebar-border/60 dark:border-[var(--color-border)] bg-sidebar/5 dark:bg-[var(--color-surface-raised)]/35 rounded-lg mb-1.5 cursor-pointer hover:bg-sidebar/10 dark:hover:bg-[var(--color-surface-raised)]/65 transition-colors">
            <span className="text-xs font-semibold text-sidebar-foreground/60 dark:text-[var(--color-text-muted)] uppercase tracking-wider">Messages</span>
            <div className="relative">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-muted-foreground dark:text-[var(--color-text-muted)]" />
              {unreadCount > 0 ? (
                <span className="absolute -top-2 -right-4 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-background dark:border-[var(--color-surface)] whitespace-nowrap z-10 animate-bounce">
                  {unreadCount} {unreadCount === 1 ? 'message' : 'messages'}
                </span>
              ) : comments.length > 0 ? (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold h-3.5 min-w-[14px] flex items-center justify-center rounded-full px-1 border border-background dark:border-[var(--color-surface)]">
                  {comments.length > 99 ? '99+' : comments.length}
                </span>
              ) : null}
            </div>
          </div>
        )}
      </SheetTrigger>
      
      <SheetContent side="right" className="w-[360px] sm:w-[400px] flex flex-col p-0 border-l border-border bg-background shadow-xl">
        <SheetHeader className="p-4 border-b border-border bg-muted/20">
          <SheetTitle className="text-lg font-semibold flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-primary" />
            Team Messages
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1 p-4">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground mt-20">
              <ChatBubbleLeftRightIcon className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">No messages yet.</p>
              <p className="text-xs mt-1">Be the first to start the conversation!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {comments.map((comment) => {
                const isMe = user && (comment.userId === user.id || comment.userId === user._id);
                
                // Get the recipient name if it's a private message
                let recipientLabel = '';
                if (comment.mentionedUserIds && comment.mentionedUserIds.length > 0) {
                  const rId = comment.mentionedUserIds[0];
                  const isRecipientMe = user && (rId === user.id || rId === (user as any)._id);
                  if (isRecipientMe) {
                    recipientLabel = 'to you';
                  } else {
                    const recipientUser = allUsers.find(u => (u.id || (u as any)._id) === rId);
                    if (recipientUser) {
                      const recipientName = `${recipientUser.firstName || ''} ${recipientUser.lastName || ''}`.trim() || recipientUser.name;
                      recipientLabel = `to ${recipientName}`;
                    } else {
                      recipientLabel = 'private';
                    }
                  }
                }

                return (
                  <div key={comment._id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                        {comment.userInitials}
                      </div>
                    </div>
                    <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-baseline gap-2 mb-1 mx-1">
                        <span className="text-xs font-medium text-foreground/80 flex items-center gap-1 flex-wrap">
                          {isMe ? 'You' : comment.userName}
                          {recipientLabel && (
                            <span className="text-[10px] text-red-500 font-semibold bg-red-500/5 px-1.5 py-0.5 rounded border border-red-500/10">
                              🔒 {recipientLabel}
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(comment.createdAt)}
                        </span>
                      </div>
                      <div className="relative group/msg flex items-center gap-1.5 max-w-full">
                        {isMe && canDelete && (
                          <button
                            onClick={() => setDeleteTargetId(comment._id)}
                            className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-red-500 rounded-full hover:bg-muted flex-shrink-0"
                            title="Delete message"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div className={`px-3 py-2 rounded-2xl text-sm shadow-sm whitespace-pre-wrap break-words ${
                          isMe 
                            ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                            : 'bg-muted/60 border border-border/50 text-foreground rounded-tl-sm'
                        }`}>
                          {comment.text}
                        </div>
                        {!isMe && canDelete && (
                          <button
                            onClick={() => setDeleteTargetId(comment._id)}
                            className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-red-500 rounded-full hover:bg-muted flex-shrink-0"
                            title="Delete message"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-4 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          
          {/* Recipient Dropdown */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Send to:</span>
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="flex h-8 w-full rounded-lg border border-border/60 bg-muted/30 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer font-medium text-foreground/80"
            >
              <option value="all" className="bg-background">Everyone (All)</option>
              {allUsers
                .filter(u => {
                  const id = u.id || (u as any)._id;
                  const myId = user?.id || (user as any)?._id;
                  return id && myId && id !== myId;
                })
                .map(u => {
                  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'Unknown User';
                  const roleStr = u.role ? ` (${u.role})` : '';
                  return (
                    <option key={u.id || (u as any)._id} value={u.id || (u as any)._id} className="bg-background">
                      {name}{roleStr}
                    </option>
                  );
                })}
            </select>
          </div>

          <div className="relative flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={newComment}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="min-h-[40px] max-h-[120px] resize-none pr-12 rounded-xl border-border/60 bg-muted/30 focus-visible:ring-1 focus-visible:ring-primary/50"
              rows={1}
            />
            <Button 
              size="sm" 
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="absolute right-1 bottom-1 h-8 w-8 rounded-lg p-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 translate-x-[1px] translate-y-[-1px]">
                <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
              </svg>
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Press Enter to send, Shift + Enter for new line
          </p>
        </div>
      </SheetContent>

      {deleteTargetId && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl shadow-lg p-5 max-w-sm w-full space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <TrashIcon className="w-4 h-4 text-red-500" />
              Delete Message?
            </h3>
            <p className="text-xs text-muted-foreground">
              Choose how you want to delete this message. This action cannot be undone.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteConfirm('both')}
                className="w-full"
              >
                Delete for Everyone (Both sides)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteConfirm('me')}
                className="w-full"
              >
                Delete only for Me
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTargetId(null)}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
};

export default CustomSidebarComments;
