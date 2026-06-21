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
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { commentService, Comment } from '../services/commentService';
import userService from '../services/userService';
import { User } from '../types/user';
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mentionSearch, setMentionSearch] = useState<{ active: boolean; term: string; index: number }>({ active: false, term: '', index: 0 });
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

    // Extract @mentions
    const mentionMatches = currentText.match(/@(\w+)/g);
    const mentionedUserIds: string[] = [];

    if (mentionMatches && allUsers.length > 0) {
      mentionMatches.forEach(match => {
        const username = match.substring(1).toLowerCase();
        // Try to find a user where first name or last name matches
        const matchedUser = allUsers.find(u => 
          (u.firstName && u.firstName.toLowerCase().includes(username)) || 
          (u.lastName && u.lastName.toLowerCase().includes(username)) ||
          (u.name && u.name.toLowerCase().includes(username))
        );
        if (matchedUser && matchedUser.id) {
          mentionedUserIds.push(matchedUser.id);
        } else if (matchedUser && (matchedUser as any)._id) {
          mentionedUserIds.push((matchedUser as any)._id);
        }
      });
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
    const val = e.target.value;
    setNewComment(val);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPosition);
    
    const match = textBeforeCursor.match(/@(\w*)$/);
    if (match) {
      setMentionSearch({
        active: true,
        term: match[1].toLowerCase(),
        index: match.index !== undefined ? match.index : 0
      });
    } else {
      setMentionSearch(prev => prev.active ? { ...prev, active: false } : prev);
    }
  };

  const insertMention = (user: User) => {
    const mentionName = (user.firstName || user.name || 'user').replace(/\s+/g, '');
    const beforeMention = newComment.slice(0, mentionSearch.index);
    const afterMention = newComment.slice(mentionSearch.index + mentionSearch.term.length + 1);
    
    setNewComment(`${beforeMention}@${mentionName} ${afterMention}`);
    setMentionSearch({ active: false, term: '', index: 0 });
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 10);
  };

  const filteredUsers = mentionSearch.active ? allUsers.filter(u => {
    const searchString = ((u.firstName || '') + ' ' + (u.lastName || '') + ' ' + (u.name || '') + ' ' + (u.role || '')).toLowerCase();
    return searchString.includes(mentionSearch.term);
  }).slice(0, 15) : [];

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
          <div className="flex items-center justify-between px-3 py-1.5 border border-sidebar-border/60 bg-sidebar/5 rounded-lg mb-1.5 cursor-pointer hover:bg-sidebar/10 transition-colors">
            <span className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">Messages</span>
            <div className="relative">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 ? (
                <span className="absolute -top-2 -right-4 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-background whitespace-nowrap z-10 animate-bounce">
                  {unreadCount} {unreadCount === 1 ? 'message' : 'messages'}
                </span>
              ) : comments.length > 0 ? (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold h-3.5 min-w-[14px] flex items-center justify-center rounded-full px-1 border border-background">
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
                return (
                  <div key={comment._id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                        {comment.userInitials}
                      </div>
                    </div>
                    <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-baseline gap-2 mb-1 mx-1">
                        <span className="text-xs font-medium text-foreground/80">
                          {isMe ? 'You' : comment.userName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(comment.createdAt)}
                        </span>
                      </div>
                      <div className={`px-3 py-2 rounded-2xl text-sm shadow-sm whitespace-pre-wrap break-words ${
                        isMe 
                          ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                          : 'bg-muted/60 border border-border/50 text-foreground rounded-tl-sm'
                      }`}>
                        {comment.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-4 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          
          {/* Mention Autocomplete Dropdown */}
          {mentionSearch.active && filteredUsers.length > 0 && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50 max-h-48 overflow-y-auto">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30 border-b border-border">Select a user to mention:</div>
              {filteredUsers.map(u => (
                <div 
                  key={u.id || (u as any)._id}
                  className="px-3 py-2 text-sm hover:bg-muted cursor-pointer flex items-center gap-2 transition-colors"
                  onClick={() => insertMention(u)}
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {(u.firstName?.[0] || u.name?.[0] || 'U').toUpperCase()}
                  </div>
                  <span className="font-medium">{u.firstName} {u.lastName}</span>
                  {u.role && <span className="text-xs text-muted-foreground ml-auto capitalize bg-muted px-1.5 py-0.5 rounded">{u.role}</span>}
                </div>
              ))}
            </div>
          )}

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
    </Sheet>
  );
};

export default CustomSidebarComments;
