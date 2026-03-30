import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Save, FileText, ArrowLeft, Plus, Trash2, Edit3, Clock, Search, ChevronLeft, Eraser, MousePointer2, Undo, Redo } from 'lucide-react';
import { Button, Card } from '../components/Shared';
import { toast } from 'sonner';
import localforage from 'localforage';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import Quill from 'quill';

// Register list formats
const List = Quill.import('formats/list');
(Quill as any).register(List, true);

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

interface NotePadProps {
  onBack: () => void;
}

const QuillEditor = React.forwardRef(({ value, onChange, modules, formats }: any, ref: any) => {
  const ReactQuillAny = ReactQuill as any;
  return (
    <ReactQuillAny
      ref={ref}
      theme="snow"
      value={value}
      onChange={onChange}
      modules={modules}
      formats={formats}
      placeholder="Start writing your thoughts..."
      className="h-[500px] md:h-[600px]"
    />
  );
});

const NotePad: React.FC<NotePadProps> = ({ onBack }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const quillRef = useRef<any>(null);
  const lastNoteId = useRef<string | null>(null);

  // Sync editor content when currentNote changes (e.g., switching notes)
  useEffect(() => {
    if (quillRef.current && currentNote && lastNoteId.current !== currentNote.id) {
      const quill = quillRef.current.getEditor();
      if (quill.root.innerHTML !== currentNote.content) {
        quill.clipboard.dangerouslyPasteHTML(currentNote.content);
      }
      lastNoteId.current = currentNote.id;
    }
  }, [currentNote]);

  // Load notes on mount
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const savedNotes = await localforage.getItem<Note[]>('smart_creator_notes');
        if (savedNotes) {
          setNotes(savedNotes.sort((a, b) => b.updatedAt - a.updatedAt));
        }
      } catch (error) {
        console.error('Failed to load notes:', error);
        toast.error('Failed to load notes');
      } finally {
        setIsLoading(false);
      }
    };
    loadNotes();
  }, []);

  // Save notes whenever they change
  const saveAllNotes = async (updatedNotes: Note[]) => {
    try {
      await localforage.setItem('smart_creator_notes', updatedNotes);
      setNotes(updatedNotes.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (error) {
      console.error('Failed to save notes:', error);
      toast.error('Failed to save notes');
    }
  };

  const handleCreateNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      updatedAt: Date.now(),
    };
    setCurrentNote(newNote);
    setView('editor');
  };

  const handleEditNote = (note: Note) => {
    setCurrentNote({ ...note });
    setView('editor');
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedNotes = notes.filter(n => n.id !== id);
    await saveAllNotes(updatedNotes);
    toast.success('Note deleted');
  };

  const handleSaveNote = async () => {
    if (!currentNote) return;

    const title = currentNote.title.trim() || 'Untitled Note';
    const updatedNote = {
      ...currentNote,
      title,
      updatedAt: Date.now(),
    };

    const noteExists = notes.find(n => n.id === updatedNote.id);
    let updatedNotes: Note[];

    if (noteExists) {
      updatedNotes = notes.map(n => n.id === updatedNote.id ? updatedNote : n);
    } else {
      updatedNotes = [...notes, updatedNote];
    }

    await saveAllNotes(updatedNotes);
    setCurrentNote(updatedNote);
    toast.success('Note saved successfully');
    setView('list');
  };

  const handleSelectAll = useCallback(() => {
    const editor = document.querySelector('.ql-editor') as HTMLElement;
    if (editor) {
      editor.focus();
      document.execCommand('selectAll', false, undefined);
      toast.info('All text selected');
    }
  }, []);

  const handleClearContent = useCallback(() => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      quill.setText('');
      toast.info('Content cleared');
    }
  }, []);

  const handleUndo = useCallback(() => {
    document.execCommand('undo', false, undefined);
  }, []);

  const handleRedo = useCallback(() => {
    document.execCommand('redo', false, undefined);
  }, []);

  const handleContentChange = useCallback((content: string) => {
    setCurrentNote(prev => prev ? { ...prev, content } : null);
  }, []);

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        ['undo', 'redo', 'selectAll', 'clear'],
        ['clean']
      ],
      handlers: {
        undo: handleUndo,
        redo: handleRedo,
        selectAll: handleSelectAll,
        clear: handleClearContent,
      }
    },
  }), [handleUndo, handleRedo, handleSelectAll, handleClearContent]);

  const formats = useMemo(() => [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'color', 'background'
  ], []);

  if (view === 'editor' && currentNote) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button 
              onClick={() => setView('list')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors shrink-0"
            >
              <ChevronLeft size={24} className="text-gray-600 dark:text-gray-300" />
            </button>
            <input
              type="text"
              value={currentNote.title}
              onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
              placeholder="Note Title..."
              className="text-lg font-black bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder:text-gray-400 w-full truncate"
            />
          </div>
          <Button 
            onClick={handleSaveNote} 
            className="flex items-center gap-2 px-4 py-2.5 shadow-lg shadow-indigo-100 dark:shadow-none shrink-0 rounded-xl"
            title="Save Note"
          >
            <Save size={20} />
            <span className="hidden sm:inline">Save</span>
          </Button>
        </div>

        <Card className="overflow-hidden border-none shadow-xl bg-white dark:bg-gray-900">
          <div className="quill-container">
            <QuillEditor
              ref={quillRef}
              value={currentNote.content}
              onChange={handleContentChange}
              modules={modules}
              formats={formats}
            />
          </div>
        </Card>

        <style>{`
          .quill-container .ql-toolbar {
            border: none !important;
            border-bottom: 1px solid #f1f5f9 !important;
            padding: 0.75rem !important;
            background: #f8fafc;
          }
          .dark .quill-container .ql-toolbar {
            background: #1e293b;
            border-bottom: 1px solid #334155 !important;
          }
          /* Custom icons for toolbar */
          .ql-undo::after { content: '↩️'; font-size: 14px; }
          .ql-redo::after { content: '↪️'; font-size: 14px; }
          .ql-selectAll::after { content: '📋'; font-size: 14px; }
          .ql-clear::after { content: '🧹'; font-size: 14px; }
          
          .quill-container .ql-container {
            border: none !important;
            font-family: 'Inter', sans-serif !important;
            font-size: 16px !important;
          }
          .quill-container .ql-editor {
            padding: 1.5rem !important;
            min-height: 500px;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          .quill-container .ql-editor::-webkit-scrollbar {
            display: none !important;
          }
          .dark .quill-container .ql-editor {
            color: #f8fafc !important;
          }
          .dark .quill-container .ql-editor.ql-blank::before {
            color: #64748b !important;
            font-style: normal !important;
          }
          .dark .quill-container .ql-snow .ql-stroke {
            stroke: #cbd5e1 !important;
          }
          .dark .quill-container .ql-snow .ql-fill {
            fill: #cbd5e1 !important;
          }
          .dark .quill-container .ql-snow .ql-picker {
            color: #cbd5e1 !important;
          }
          .dark .quill-container .ql-snow .ql-picker-options {
            background-color: #1e293b !important;
            border: 1px solid #334155 !important;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your personal notes</p>
          </div>
        </div>
        <Button onClick={handleCreateNote} className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
          <Plus size={20} /> New Note
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading your notes...</p>
        </div>
      ) : filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((note) => (
            <Card 
              key={note.id} 
              className="p-5 hover:border-indigo-500 transition-all cursor-pointer group relative bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md"
              onClick={() => handleEditNote(note)}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Edit3 size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Note</span>
                </div>
                <button 
                  onClick={(e) => handleDeleteNote(note.id, e)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
                {note.title || 'Untitled Note'}
              </h3>
              <div 
                className="text-sm text-gray-500 dark:text-gray-300 line-clamp-3 mb-4 prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: note.content }}
              />
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                <Clock size={12} />
                {new Date(note.updatedAt).toLocaleDateString()} {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
          <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <FileText size={32} className="text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No notes found</h3>
          <p className="text-gray-500 text-sm mb-6">Create your first note to get started</p>
          <Button onClick={handleCreateNote} className="px-8">
            Create Note
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotePad;
