
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FeatureType, AdminSettings, UserSession, ActivityRecord, StoredResult, ProcessingTask } from './types';
import { FEATURES, DEFAULT_ADMIN_SETTINGS } from './constants';
import { Card, Button, ProgressBar, ApiKeyManager, Modal } from './components/Shared';
import Transcribe from './features/Transcribe';
import Translate from './features/Translate';
import SRTTranslate from './features/SRTTranslate';
import SubGenerator from './features/SubGenerator';
import ScriptWriter from './features/ScriptWriter';
import VideoGenerator from './features/VideoGenerator';
import ContentCreator from './features/ContentCreator';
import TextToSRT from './features/TextToSRT';
import Account from './features/Account';
import Tutorial from './features/Tutorial';
import Premium from './features/Premium';
import PersistentResults from './components/PersistentResults';
import TaskOverlay from './components/TaskOverlay';

const App: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<FeatureType>('home');
  const [settings] = useState<AdminSettings>(DEFAULT_ADMIN_SETTINGS);
  const [session, setSession] = useState<UserSession>(() => {
    const saved = localStorage.getItem('smart_creator_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.user && !parsed.user.usage) {
        parsed.user.usage = { appApiUsedToday: 0, ownApiUsedToday: 0, lastResetDate: new Date().toDateString() };
      }
      return parsed;
    }
    return { role: 'free', useCustomKey: false, customApiKey: '' };
  });
  
  const [results, setResults] = useState<StoredResult[]>(() => {
    const saved = localStorage.getItem('smart_creator_results');
    return saved ? JSON.parse(saved) : [];
  });

  const [tasks, setTasks] = useState<ProcessingTask[]>([]);
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('smart_creator_onboarded'));
  const [modalType, setModalType] = useState<'privacy' | 'terms' | null>(null);

  useEffect(() => {
    localStorage.setItem('smart_creator_session', JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    localStorage.setItem('smart_creator_results', JSON.stringify(results));
  }, [results]);

  const addResult = useCallback((result: Omit<StoredResult, 'id' | 'timestamp'>) => {
    const newResult: StoredResult = {
      ...result,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    setResults(prev => [newResult, ...prev]);
  }, []);

  const deleteResult = useCallback((id: string) => {
    setResults(prev => prev.filter(r => r.id !== id));
  }, []);

  const clearResultsByType = useCallback((type: FeatureType) => {
    if (confirm(`Clear all ${type.replace('-', ' ')} history forever?`)) {
      setResults(prev => prev.filter(r => r.type !== type));
    }
  }, []);

  const copyResult = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    alert('Copied to clipboard!');
  }, []);

  const downloadResult = useCallback((result: StoredResult) => {
    const blob = new Blob([result.content], { type: result.mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName || `result_${result.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<ProcessingTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const logActivity = useCallback((type: FeatureType, description: string) => {
    if (!session.user) return;
    const record: ActivityRecord = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      timestamp: Date.now(),
      description
    };
    setSession(prev => ({
      ...prev,
      user: prev.user ? {
        ...prev.user,
        history: [record, ...prev.user.history].slice(0, 50)
      } : undefined
    }));
  }, [session.user]);

  const startTask = useCallback((type: FeatureType, title: string, runAction: (taskId: string) => Promise<any>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newTask: ProcessingTask = {
      id,
      type,
      title,
      status: 'uploading',
      progress: 0,
      timestamp: Date.now()
    };
    
    setTasks(prev => [newTask, ...prev]);

    (async () => {
      try {
        for (let p = 0; p <= 30; p += 10) {
          updateTask(id, { progress: p });
          await new Promise(r => setTimeout(r, 100));
        }

        updateTask(id, { status: 'processing', progress: 40 });
        const result = await runAction(id);
        updateTask(id, { status: 'completed', progress: 100, result });
        
        if (session.user) {
          logActivity(type, `Finished: ${title}`);
        }
      } catch (err: any) {
        updateTask(id, { status: 'failed', error: err.message || 'Processing error' });
      }
    })();
  }, [updateTask, session, logActivity]);

  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'completed'), [tasks]);

  const handleUpdateSession = useCallback((updates: Partial<UserSession>) => {
    setSession(prev => ({ ...prev, ...updates }));
  }, []);

  const renderActiveFeature = () => {
    const commonProps = { 
      session, 
      onSaveResult: addResult,
      onStartTask: startTask,
      onUpdateSession: handleUpdateSession,
      results,
      onDeleteResult: deleteResult,
      onClearResults: clearResultsByType,
      onCopyResult: copyResult,
      onDownloadResult: downloadResult,
      tasks: tasks,
      onBack: () => setActiveFeature('home') 
    };

    switch (activeFeature) {
      case 'home': return <Home onSelect={setActiveFeature} settings={settings} activeTasks={activeTasks} session={session} onUpdateSession={handleUpdateSession} />;
      case 'transcribe': return <Transcribe {...commonProps} />;
      case 'translate': return <Translate {...commonProps} />;
      case 'srt-translate': return <SRTTranslate {...commonProps} />;
      case 'sub-generator': return <SubGenerator {...commonProps} />;
      case 'script-writer': return <ScriptWriter {...commonProps} />;
      case 'video-generator': return <VideoGenerator {...commonProps} />;
      case 'content-creator': return <ContentCreator {...commonProps} categories={settings.customCategories} />;
      case 'text-to-srt': return <TextToSRT {...commonProps} />;
      case 'account': return <Account onBack={() => setActiveFeature('home')} session={session} onUpdateSession={handleUpdateSession} />;
      case 'premium': return <Premium onBack={() => setActiveFeature('home')} settings={settings} session={session} onUpdateSettings={() => {}} />;
      default: return <Home onSelect={setActiveFeature} settings={settings} activeTasks={activeTasks} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      {showTutorial && <Tutorial onComplete={() => { setShowTutorial(false); localStorage.setItem('smart_creator_onboarded', 'true'); }} />}
      
      <TaskOverlay tasks={tasks} onDismiss={removeTask} onRetry={removeTask} />

      <Modal 
        isOpen={modalType !== null} 
        onClose={() => setModalType(null)} 
        title={modalType === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
      >
        {modalType === 'privacy' ? (
          <div className="space-y-4">
            <p>Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when you use Smart Creator Tools.</p>
            <h4 className="font-bold text-gray-900">1. Information Collection</h4>
            <p>We collect information you provide directly to us, such as when you create an account or use our AI tools. This may include your name, email address, and the content you process through our services.</p>
            <h4 className="font-bold text-gray-900">2. Use of Information</h4>
            <p>We use the information we collect to provide, maintain, and improve our services, and to communicate with you about updates and promotions.</p>
            <h4 className="font-bold text-gray-900">3. Data Security</h4>
            <p>We implement industry-standard security measures to protect your data from unauthorized access, disclosure, or destruction.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p>By using Smart Creator Tools, you agree to the following terms and conditions.</p>
            <h4 className="font-bold text-gray-900">1. Acceptance of Terms</h4>
            <p>By accessing or using our services, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
            <h4 className="font-bold text-gray-900">2. Use License</h4>
            <p>Permission is granted to use our AI tools for personal or commercial creative projects, subject to the limitations of your subscription plan.</p>
            <h4 className="font-bold text-gray-900">3. Prohibited Conduct</h4>
            <p>You agree not to use our services for any illegal purposes or to generate content that violates the rights of others.</p>
          </div>
        )}
      </Modal>

      <div className="bg-indigo-600 text-white py-2 overflow-hidden whitespace-nowrap text-sm font-medium shadow-sm">
        <div className="marquee">
          <div className="marquee-content">
            <span>{settings.marqueeText}</span>
            <span>{settings.marqueeText}</span>
          </div>
        </div>
      </div>

      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveFeature('home')}>
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl italic shadow-indigo-200 shadow-md">S</div>
              <span className="font-bold text-xl tracking-tight text-gray-900">{settings.appLogo}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {activeTasks.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full animate-pulse border border-amber-100">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">{activeTasks.length} Task{activeTasks.length > 1 ? 's' : ''}</span>
              </div>
            )}
            <button onClick={() => setActiveFeature('account')} className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors">
              {session.user ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm">{session.user.name[0].toUpperCase()}</div>
                  <span className="text-sm font-semibold text-gray-700 hidden sm:inline">{session.user.name}</span>
                </div>
              ) : (
                <span className="text-sm font-bold text-indigo-600">Sign In</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
        {renderActiveFeature()}
      </main>

      <footer className="bg-white border-t border-gray-100 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex flex-row items-center justify-center gap-4 sm:gap-8 mb-8 text-[9px] sm:text-[11px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em]">
            <button onClick={() => setModalType('privacy')} className="text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap">Privacy</button>
            <div className="w-1 h-1 bg-gray-200 rounded-full shrink-0" />
            <button onClick={() => setModalType('terms')} className="text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap">Terms</button>
            <div className="w-1 h-1 bg-gray-200 rounded-full shrink-0" />
            <a href="https://t.me/kcteamofficialbot" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap">
              Contact
            </a>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-300 px-4 leading-relaxed">
            {settings.footerText}
          </div>
        </div>
      </footer>
    </div>
  );
};

const Home: React.FC<{ 
  onSelect: (f: FeatureType) => void; 
  settings: AdminSettings; 
  activeTasks: ProcessingTask[];
  session: UserSession;
  onUpdateSession: (updates: Partial<UserSession>) => void;
}> = ({ onSelect, settings, activeTasks, session, onUpdateSession }) => (
  <div className="space-y-12">
    <div className="text-center max-w-3xl mx-auto">
      <h1 className="text-3xl md:text-5xl font-black mb-6 tracking-tighter leading-tight px-4 bg-clip-text text-transparent bg-gradient-to-b from-[#FFD700] via-[#FDB931] to-[#9f7928]"
          style={{ 
            filter: 'drop-shadow(2px 2px 0px #b8860b) drop-shadow(4px 4px 4px rgba(0,0,0,0.15))',
          }}>
        {settings.welcomeMessage}
      </h1>
      <p className="text-gray-400 text-sm md:text-base font-medium uppercase tracking-widest opacity-80">
        Powerful tools for the modern creator, processing in the background.
      </p>
    </div>

    <div className="max-w-4xl mx-auto">
      <ApiKeyManager session={session} onUpdate={onUpdateSession} />
    </div>

    <div className="w-full overflow-hidden">
      <div className="flex items-center justify-between px-4 mb-3">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">← Swipe</span>
        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Available Tools</h3>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Swipe →</span>
      </div>
      <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar scroll-smooth px-2">
        {FEATURES.map((feature) => {
          const isRunning = activeTasks.some(t => t.type === feature.id);
          return (
            <button
              key={feature.id}
              onClick={() => !isRunning && onSelect(feature.id)}
              className={`flex-shrink-0 flex items-center gap-3 px-6 py-3 rounded-full border transition-all whitespace-nowrap shadow-sm ${
                isRunning 
                  ? 'bg-amber-50 border-amber-200 text-amber-700 opacity-75 cursor-wait' 
                  : 'bg-white border-gray-100 text-gray-700 hover:border-indigo-600 hover:shadow-md active:scale-95'
              }`}
            >
              <span className="text-2xl">{feature.icon}</span>
              <div className="flex flex-col items-start">
                <span className="text-sm font-bold leading-none">{feature.title}</span>
                {isRunning && <span className="text-[8px] font-black uppercase tracking-tighter mt-1 animate-pulse">Processing...</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>

    {activeTasks.length > 0 && (
      <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
          Running Tasks
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeTasks.map(task => (
            <Card key={task.id} className="p-4 border-amber-100 bg-amber-50/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-sm font-bold text-gray-900 truncate">{task.title}</span>
                </div>
                <span className="text-[10px] font-bold text-amber-600 uppercase whitespace-nowrap">{task.status}</span>
              </div>
              <ProgressBar progress={task.progress} color="bg-amber-500" />
            </Card>
          ))}
        </div>
      </div>
    )}
  </div>
);

export default App;
