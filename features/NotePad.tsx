import React, { useState, useRef, useEffect } from 'react';
import { Save, Download, FileText, ArrowLeft, Type, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button, Card } from '../components/Shared';
import { toast } from 'sonner';

interface NotePadProps {
  onBack: () => void;
}

const NotePad: React.FC<NotePadProps> = ({ onBack }) => {
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('untitled');
  const [fileExt, setFileExt] = useState('.txt');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [fontSize, setFontSize] = useState(16);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isExtDropdownOpen, setIsExtDropdownOpen] = useState(false);
  const extDropdownRef = useRef<HTMLDivElement>(null);

  const notepadExtensions = [".txt", ".md", ".json", ".csv", ".log", ".xml", ".yaml", ".ini"];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (extDropdownRef.current && !extDropdownRef.current.contains(event.target as Node)) {
        setIsExtDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleSaveAs = async () => {
    const fullFileName = `${fileName}${fileExt}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });

    try {
      // Try using the File System Access API first (works on some modern browsers)
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fullFileName,
          types: [
            {
              description: 'Text Files',
              accept: { 'text/plain': ['.txt', '.md', '.csv', '.json'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        toast.success('File saved successfully!', {
          icon: '💾',
          style: { borderRadius: '1rem' }
        });
        return;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Save file picker failed:', err);
      } else {
        return; // User cancelled
      }
    }

    // Fallback for mobile and unsupported browsers
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fullFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="text-indigo-500" /> Note Pad
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Write and save your notes</p>
          </div>
        </div>
      </div>

      <Card className="p-4 md:p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
            <button onClick={() => setTextAlign('left')} className={`p-2 rounded-lg transition-colors ${textAlign === 'left' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
              <AlignLeft size={18} />
            </button>
            <button onClick={() => setTextAlign('center')} className={`p-2 rounded-lg transition-colors ${textAlign === 'center' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
              <AlignCenter size={18} />
            </button>
            <button onClick={() => setTextAlign('right')} className={`p-2 rounded-lg transition-colors ${textAlign === 'right' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
              <AlignRight size={18} />
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1 hidden sm:block"></div>
            <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
              <Type size={14} />
            </button>
            <span className="text-xs font-bold text-gray-900 dark:text-gray-100 w-8 text-center bg-white dark:bg-gray-900 py-1 rounded border border-gray-200 dark:border-gray-700">{fontSize}</span>
            <button onClick={() => setFontSize(Math.min(32, fontSize + 2))} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
              <Type size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="File name"
              className="col-span-1 sm:w-32 px-3 py-2 sm:py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <div className="relative col-span-1" ref={extDropdownRef}>
              <input
                type="text"
                value={fileExt}
                onChange={(e) => setFileExt(e.target.value)}
                onFocus={() => setIsExtDropdownOpen(true)}
                placeholder=".ext"
                className="w-20 px-2 py-2 sm:py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
              />
              {isExtDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-24 max-h-32 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 no-scrollbar">
                  {notepadExtensions.map(ext => (
                    <button
                      key={ext}
                      onClick={() => {
                        setFileExt(ext);
                        setIsExtDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-700 dark:text-gray-300"
                    >
                      {ext}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleSaveAs} className="col-span-2 sm:col-span-1 py-2 sm:py-1.5 px-4 flex items-center justify-center gap-2 text-sm whitespace-nowrap">
              <Save size={16} /> Save As
            </Button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-inner">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start typing your notes here..."
            className="w-full min-h-[400px] p-6 bg-transparent text-gray-900 dark:text-gray-100 outline-none resize-none"
            style={{ 
              textAlign, 
              fontSize: `${fontSize}px`,
              lineHeight: '1.6'
            }}
          />
        </div>
      </Card>
    </div>
  );
};

export default NotePad;
