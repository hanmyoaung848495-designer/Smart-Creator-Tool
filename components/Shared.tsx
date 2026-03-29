
import React, { useState, useEffect } from 'react';
import { UserProfile, UserSession } from '../types';
import { Play, Minus } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${className}`}>
    {children}
  </div>
);

export const UsageCounter: React.FC<{ user?: UserProfile; limits: { app: number; own: number } }> = ({ user, limits }) => {
  if (!user) return null;
  return (
    <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded-xl mb-4">
      <div className="flex items-center gap-1.5">
        <span className="text-blue-600 dark:text-blue-400">App API:</span>
        <span className="text-gray-900 dark:text-gray-100">{user.usage.appApiUsedToday} / {limits.app}</span>
      </div>
      <div className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
      <div className="flex items-center gap-1.5">
        <span className="text-blue-600 dark:text-blue-400">Own API:</span>
        <span className="text-gray-900 dark:text-gray-100">{user.usage.ownApiUsedToday} / {limits.own}</span>
      </div>
      <div className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
      <div className="flex items-center gap-1.5">
        <span className="text-blue-600 dark:text-blue-400">Credits:</span>
        <span className="text-gray-900 dark:text-gray-100">{user.credits}</span>
      </div>
    </div>
  );
};

export const ApiKeyManager: React.FC<{
  session: UserSession;
  onUpdate: (updates: Partial<UserSession>) => void;
  onRequireLogin?: () => void;
}> = ({ session, onUpdate, onRequireLogin }) => {
  return (
    <div className="mb-6 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 flex flex-col sm:flex-row items-center gap-4 relative">
      <div className="flex items-center gap-3 shrink-0">
        <label className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-widest">API Engine:</label>
        <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-blue-100 dark:border-gray-700 relative">
          <button
            onClick={() => {
              if (session.role !== 'premium' && onRequireLogin) {
                onRequireLogin();
              } else {
                onUpdate({ useCustomKey: false });
              }
            }}
            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${!session.useCustomKey ? 'bg-blue-600 text-white' : 'text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'}`}
          >
            System
          </button>

          <button
            onClick={() => onUpdate({ useCustomKey: true })}
            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${session.useCustomKey ? 'bg-blue-600 text-white' : 'text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'}`}
          >
            Own Key
          </button>
        </div>
      </div>
      
      {session.useCustomKey && (
        <div className="flex-grow flex flex-col sm:flex-row items-center gap-2 w-full">
          <input
            id="custom-api-key-input"
            type="password"
            placeholder="Paste your Gemini API Key here..."
            value={session.customApiKey || ''}
            onChange={(e) => onUpdate({ customApiKey: e.target.value })}
            className="flex-grow w-full px-4 py-2 text-xs rounded-xl border border-blue-200 dark:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-100"
          />
          <TutorialButton videoId="sGHe7nhThwo" timestamp="30" label="API Key ယူနည်း" toolKey="api_key" />
        </div>
      )}
    </div>
  );
};

export const ProgressBar: React.FC<{ progress: number; label?: string; color?: string }> = ({ progress, label, color = "bg-indigo-600" }) => (
  <div className="w-full">
    {(label || progress > 0) && (
      <div className="flex justify-between mb-1.5 px-1">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{Math.round(progress)}%</span>
      </div>
    )}
    <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
      <div 
        className={`h-full ${color} transition-all duration-300 ease-out rounded-full`} 
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

export const Button: React.FC<{
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}> = ({ onClick, children, variant = 'primary', className, disabled, type = 'button' }) => {
  const baseStyle = "px-6 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100 dark:shadow-none",
    secondary: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-100 dark:shadow-none",
    ghost: "bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
  };
  return (
    <button type={type} onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`} disabled={disabled}>
      {children}
    </button>
  );
};

export const Input: React.FC<{
  label?: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ label, type = 'text', value, onChange, placeholder, className }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    {label && <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white dark:bg-gray-800 dark:text-gray-100"
    />
  </div>
);

export const TextArea: React.FC<{
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
}> = ({ label, value, onChange, placeholder, rows = 4 }) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>}
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none bg-white dark:bg-gray-800 dark:text-gray-100"
    />
  </div>
);

export const Select: React.FC<{
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
}> = ({ label, value, onChange, options }) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white dark:bg-gray-800 dark:text-gray-100"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

export const ResultBox: React.FC<{
  title: string;
  content: string;
  onCopy: () => void;
  onDownload?: () => void;
  onClear?: () => void;
  loading?: boolean;
}> = ({ title, content, onCopy, onDownload, onClear, loading }) => {
  if (loading) return (
    <div className="mt-8 p-12 bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-500 dark:text-gray-400 animate-pulse font-medium">Processing your request...</p>
    </div>
  );

  if (!content) return null;

  return (
    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h3>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCopy} className="text-xs px-3 py-1.5">
            📋 Copy
          </Button>
          {onDownload && (
            <Button variant="primary" onClick={onDownload} className="text-xs px-3 py-1.5">
              💾 Download
            </Button>
          )}
          {onClear && (
            <Button variant="ghost" onClick={onClear} className="text-xs px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
              🗑️ Clear
            </Button>
          )}
        </div>
      </div>
      <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-auto max-h-[500px] whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
        {content}
      </div>
    </div>
  );
};

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  hideClose?: boolean;
  hideBottomClose?: boolean;
  maxWidth?: string;
  compact?: boolean;
}> = ({ isOpen, onClose, title, children, hideClose, hideBottomClose, maxWidth = "max-w-2xl", compact }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full ${maxWidth} max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300`}>
        <div className={`flex items-center justify-between ${compact ? 'p-3 px-6' : 'p-6'} border-b border-gray-100 dark:border-gray-700`}>
          <h3 className={`${compact ? 'text-xs uppercase tracking-widest' : 'text-xl'} font-bold text-gray-900 dark:text-gray-100`}>{title}</h3>
          {!hideClose && (
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <span className={`${compact ? 'text-xl' : 'text-2xl'} leading-none dark:text-gray-300`}>&times;</span>
            </button>
          )}
        </div>
        <div className={`${compact ? 'p-0' : 'p-8'} overflow-y-auto text-gray-600 dark:text-gray-300 leading-relaxed text-sm`}>
          {children}
        </div>
        {!hideClose && !hideBottomClose && !compact && (
          <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
            <Button onClick={onClose} className="text-xs font-bold uppercase tracking-widest">Close</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export const YouTubeEmbed: React.FC<{ videoId: string; timestamp?: string; autoplay?: boolean }> = ({ videoId, timestamp, autoplay = false }) => {
  const start = timestamp ? parseInt(timestamp) : 0;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${start}&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&color=white&autoplay=${autoplay ? 1 : 0}`;

  return (
    <div className="relative w-full aspect-video overflow-hidden bg-black shadow-inner group">
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Tutorial Video"
        loading="lazy"
      />
    </div>
  );
};

export const TutorialButton: React.FC<{ videoId: string; timestamp?: string; iconOnly?: boolean; label?: string; toolKey?: string }> = ({ videoId, timestamp, iconOnly, label = "Tutorial", toolKey }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [dynamicVideo, setDynamicVideo] = useState<{id: string, start: string} | null>(null);

  useEffect(() => {
    const fetchToolTutorial = async () => {
      if (!supabase || !toolKey) return;
      const { data, error } = await supabase
        .from('tutorials')
        .select('video_id, time_start')
        .eq('tool_key', toolKey)
        .order('id', { ascending: false })
        .limit(1)
        .single();
      
      if (!error && data) {
        setDynamicVideo({ id: data.video_id, start: data.time_start?.toString() || '0' });
      }
    };
    fetchToolTutorial();
  }, [toolKey]);

  const finalVideoId = dynamicVideo?.id || videoId;
  const finalTimestamp = dynamicVideo?.start || timestamp;

  return (
    <>
      {iconOnly ? (
        <button 
          onClick={() => setIsOpen(true)} 
          className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors"
          title={label}
        >
          <Play size={20} className="fill-current" />
        </button>
      ) : (
        <Button variant="secondary" onClick={() => setIsOpen(true)} className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase whitespace-nowrap">
          <Play size={12} className="fill-current" /> {label}
        </Button>
      )}

      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title={label}
        maxWidth="max-w-4xl"
        compact={true}
      >
        <YouTubeEmbed videoId={finalVideoId} timestamp={finalTimestamp} />
      </Modal>
    </>
  );
};
