import React, { useRef, useState } from 'react';
import { Button } from './button';
import { Textarea } from './textarea';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Quote,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  Edit
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  height?: string;
  /** Show live preview alongside editor (split view) */
  livePreview?: boolean;
  /** Quick-insert buttons for common labels (e.g. Liver, GB, Kidneys) */
  quickInsertLabels?: string[];
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Enter detailed findings...",
  disabled = false,
  height = "200px",
  livePreview = false,
  quickInsertLabels = []
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  const insertFormatting = (before: string, after: string = '') => {
    if (!textareaRef.current || disabled) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    // If no text is selected, just insert the formatting markers
    if (start === end) {
      const newText = value.substring(0, start) + before + after + value.substring(end);
      onChange(newText);
      
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + before.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else {
      // If text is selected, wrap it with formatting
      const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
      onChange(newText);
      
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + before.length + selectedText.length + after.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const insertAtCursor = (text: string) => {
    if (!textareaRef.current || disabled) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const newText = value.substring(0, start) + text + value.substring(end);
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + text.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const formatBold = () => {
    if (!textareaRef.current || disabled) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    // Check if text is already bold (surrounded by **)
    const beforeText = value.substring(Math.max(0, start - 2), start);
    const afterText = value.substring(end, Math.min(value.length, end + 2));
    
    if (beforeText === '**' && afterText === '**') {
      // Remove bold formatting
      const newText = value.substring(0, start - 2) + selectedText + value.substring(end + 2);
      onChange(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start - 2, end - 2);
      }, 0);
    } else {
      // Add bold formatting
      insertFormatting('**', '**');
    }
  };

  const formatItalic = () => {
    if (!textareaRef.current || disabled) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    // Check if text is already italic (surrounded by single *)
    const beforeText = value.substring(Math.max(0, start - 1), start);
    const afterText = value.substring(end, Math.min(value.length, end + 1));
    
    if (beforeText === '*' && afterText === '*' && 
        value.substring(Math.max(0, start - 2), start - 1) !== '*' && 
        value.substring(end + 1, Math.min(value.length, end + 2)) !== '*') {
      // Remove italic formatting
      const newText = value.substring(0, start - 1) + selectedText + value.substring(end + 1);
      onChange(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start - 1, end - 1);
      }, 0);
    } else {
      // Add italic formatting
      insertFormatting('*', '*');
    }
  };

  const formatUnderline = () => insertFormatting('<u>', '</u>');
  const formatHeader1 = () => insertAtCursor('\n# ');
  const formatHeader2 = () => insertAtCursor('\n## ');
  const formatHeader3 = () => insertAtCursor('\n### ');
  const formatBulletList = () => insertAtCursor('\n• ');
  const formatNumberedList = () => insertAtCursor('\n1. ');
  const formatBlockquote = () => insertAtCursor('\n> ');
  const formatLine = () => insertAtCursor('\n---\n');

  const insertBoldLabel = (label: string) => {
    insertAtCursor(`**${label}**: `);
  };

  const processDisplayValue = (text: string) => {
    // Convert markdown-style formatting to visual representation
    return text
      // Process bold first (must come before italic to handle ** vs *)
      .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600; color: #1f2937;">$1</strong>') // Bold
      // Process italic (simple approach)
      .replace(/\*([^*]+?)\*/g, '<em style="font-style: italic; color: #374151;">$1</em>') // Italic
      // Process underline
      .replace(/<u>(.*?)<\/u>/g, '<u style="text-decoration: underline;">$1</u>') // Underline
      // Process headers (fix the $2, $3 issue)
      .replace(/^# (.*$)/gm, '<h1 style="font-size: 1.5em; font-weight: 600; color: #1e40af; margin: 1em 0 0.5em 0;">$1</h1>') // H1
      .replace(/^## (.*$)/gm, '<h2 style="font-size: 1.3em; font-weight: 600; color: #3b82f6; margin: 0.8em 0 0.4em 0;">$1</h2>') // H2
      .replace(/^### (.*$)/gm, '<h3 style="font-size: 1.1em; font-weight: 600; color: #6b7280; margin: 0.6em 0 0.3em 0;">$1</h3>') // H3
      // Process lists
      .replace(/^• (.*$)/gm, '<div style="margin: 0.3em 0; line-height: 1.6;">• $1</div>') // Bullet points
      .replace(/^\d+\. (.*$)/gm, '<div style="margin: 0.3em 0; line-height: 1.6;">$&</div>') // Numbered lists
      // Process blockquotes
      .replace(/^> (.*$)/gm, '<blockquote style="border-left: 4px solid #3b82f6; padding-left: 16px; margin: 1em 0; font-style: italic; background: #f0f7ff; padding: 12px 16px; border-radius: 0 8px 8px 0;">$1</blockquote>') // Blockquotes
      // Process horizontal lines
      .replace(/^---$/gm, '<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 1em 0;">') // Horizontal lines
      // Process line breaks
      .replace(/\n/g, '<br>'); // Line breaks
  };

  return (
    <div className="rich-text-editor border rounded-md">
      {/* Formatting Toolbar */}
      {!disabled && isToolbarVisible && (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-muted border-b rounded-t-md">
          <div className="flex items-center gap-1 mr-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={formatBold}
              className="h-8 w-8 p-0"
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={formatItalic}
              className="h-8 w-8 p-0"
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={formatUnderline}
              className="h-8 w-8 p-0"
              title="Underline"
            >
              <Underline className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-1 mr-2 border-l pl-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={formatHeader1}
              className="h-8 px-2 text-xs font-bold"
              title="Header 1"
            >
              H1
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={formatHeader2}
              className="h-8 px-2 text-xs font-bold"
              title="Header 2"
            >
              H2
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={formatHeader3}
              className="h-8 px-2 text-xs font-bold"
              title="Header 3"
            >
              H3
            </Button>
          </div>
          
          <div className="flex items-center gap-1 mr-2 border-l pl-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={formatBulletList}
              className="h-8 w-8 p-0"
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={formatNumberedList}
              className="h-8 w-8 p-0"
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={formatBlockquote}
              className="h-8 w-8 p-0"
              title="Quote"
            >
              <Quote className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-1 border-l pl-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={formatLine}
              className="h-8 px-2 text-xs"
              title="Horizontal Line"
            >
              ___
            </Button>
          </div>

          {quickInsertLabels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 border-l pl-2">
              <span className="text-xs text-muted-foreground px-1">Quick:</span>
              {quickInsertLabels.map((label) => (
                <Button
                  key={label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertBoldLabel(label)}
                  className="h-7 px-2 text-xs"
                  title={`Insert **${label}**: `}
                >
                  {label}
                </Button>
              ))}
            </div>
          )}
          
          {!livePreview && (
            <div className="flex items-center gap-1 border-l pl-2 ml-auto">
              <Button
                type="button"
                variant={showPreview ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="h-8 w-8 p-0"
                title={showPreview ? "Edit Mode" : "Preview Mode"}
              >
                {showPreview ? <Edit className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Text Input Area - split view when livePreview, else toggle edit/preview */}
      <div className={`relative ${livePreview ? 'grid grid-cols-1 md:grid-cols-2 gap-3 p-2' : ''}`}>
        {livePreview ? (
          /* Split: Edit + Live Preview */
          <>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground px-2 py-1 border-b">Edit</span>
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="min-h-[240px] border-0 resize-y focus:ring-0 text-sm font-mono rounded-b-md"
                style={{ minHeight: '240px' }}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground px-2 py-1 border-b">Preview</span>
              <div 
                className="min-h-[240px] p-3 text-sm bg-muted/50 rounded-b-md overflow-y-auto border border-transparent"
                style={{ minHeight: '240px' }}
              >
                {value ? (
                  <div 
                    className="leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: processDisplayValue(value) }} 
                  />
                ) : (
                  <div className="text-muted-foreground/60 italic">{placeholder}</div>
                )}
              </div>
            </div>
          </>
        ) : !showPreview ? (
          /* Edit Mode - Show textarea */
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[200px] border-0 resize-none focus:ring-0 text-sm font-mono"
            style={{ height }}
          />
        ) : (
          /* Preview Mode - Show formatted text */
          <div 
            className="min-h-[200px] p-3 text-sm bg-muted rounded overflow-y-auto"
            style={{ height }}
          >
            {value ? (
              <div 
                className="leading-relaxed"
                dangerouslySetInnerHTML={{ __html: processDisplayValue(value) }} 
              />
            ) : (
              <div className="text-gray-400 italic">{placeholder}</div>
            )}
          </div>
        )}
      </div>
      
      {/* Preview Area (when disabled and NOT in livePreview - extra preview below) */}
      {disabled && value && !livePreview && (
        <div className="p-4 bg-muted border-t">
          <div className="text-sm text-muted-foreground mb-2">Preview:</div>
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: processDisplayValue(value) }}
          />
        </div>
      )}
      
      {/* Helper Text */}
      <div className="p-2 text-xs text-muted-foreground bg-muted border-t rounded-b-md">
        {livePreview ? (
          <>💡 Use **bold**, *italic*, # headers, • bullets, &gt; quotes, and ---. Click organ buttons to insert <strong>**Label**: </strong>.</>
        ) : (
          <>💡 Use **bold**, *italic*, # headers, • bullets, &gt; quotes, and ---. Click the {showPreview ? '✏️ Edit' : '👁️ Preview'} button to {showPreview ? 'edit' : 'see formatted'} text.</>
        )}
      </div>
    </div>
  );
};

export default RichTextEditor;
