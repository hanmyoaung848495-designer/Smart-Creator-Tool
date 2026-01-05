
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FeatureType, AdminSettings, UserSession, ActivityRecord, StoredResult, ProcessingTask } from './types';
import { FEATURES, DEFAULT_ADMIN_SETTINGS } from './constants';
import { Card, Button, ProgressBar } from './components/Shared';
import Transcribe from './features/Transcribe';
import Translate from './features/Translate';
import SRTTranslate from './features/SRTTranslate';
import SubGenerator from './features/SubGenerator';
import ScriptWriter from './features/ScriptWriter';
import VideoGenerator from './features/VideoGenerator';
import ContentCreator from './features/ContentCreator';
import VoiceClone from './features/VoiceClone';
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
      onCopyResult: copyResult,
      onDownloadResult: downloadResult,
      tasks: tasks,
      onBack: () => setActiveFeature('home') 
    };

    switch (activeFeature) {
      case 'home': return <Home onSelect={setActiveFeature} settings={settings} activeTasks={activeTasks} />;
      case 'transcribe': return <Transcribe {...commonProps} />;
      case 'translate': return <Translate {...commonProps} />;
      case 'srt-translate': return <SRTTranslate {...commonProps} />;
      case 'sub-generator': return <SubGenerator {...commonProps} />;
      case 'script-writer': return <ScriptWriter {...commonProps} />;
      case 'video-generator': return <VideoGenerator {...commonProps} />;
      case 'content-creator': return <ContentCreator {...commonProps} categories={settings.customCategories} />;
      case 'voice-clone': return <VoiceClone {...commonProps} />;
      case 'account': return <Account onBack={() => setActiveFeature('home')} session={session} onUpdateSession={handleUpdateSession} />;
      case 'premium': return <Premium onBack={() => setActiveFeature('home')} settings={settings} session={session} onUpdateSettings={() => {}} />;
      default: return <Home onSelect={setActiveFeature} settings={settings} activeTasks={activeTasks} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      {showTutorial && <Tutorial onComplete={() => { setShowTutorial(false); localStorage.setItem('smart_creator_onboarded', 'true'); }} />}
      
      <TaskOverlay tasks={tasks} onDismiss={removeTask} onRetry={removeTask} />

      <div className="bg-indigo-600 text-white py-2 overflow-hidden whitespace-nowrap text-sm font-medium">
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
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl italic">S</div>
              <span className="font-bold text-xl tracking-tight text-gray-900">{settings.appLogo}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {activeTasks.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full animate-pulse border border-amber-100">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                <span className="text-[10px] font-bold text-amber-700 uppercase">{activeTasks.length} Active Task{activeTasks.length > 1 ? 's' : ''}</span>
              </div>
            )}
            <button onClick={() => setActiveFeature('account')} className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors">
              {session.user ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">{session.user.name[0].toUpperCase()}</div>
                  <span className="text-sm font-semibold text-gray-700">{session.user.name}</span>
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

      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
          {settings.footerText}
        </div>
      </footer>
    </div>
  );
};

const Home: React.FC<{ onSelect: (f: FeatureType) => void; settings: AdminSettings; activeTasks: ProcessingTask[] }> = ({ onSelect, settings, activeTasks }) => (
  <div className="space-y-12">
    <div className="text-center max-w-2xl mx-auto">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight leading-tight">{settings.welcomeMessage}</h1>
      <p className="text-gray-500 text-lg">Powerful tools for the modern creator, processing in the background.</p>
    </div>

    {activeTasks.length > 0 && (
      <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
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

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {FEATURES.map((feature) => {
        const isRunning = activeTasks.some(t => t.type === feature.id);
        return (
          <Card key={feature.id} className={`group relative transition-all ${isRunning ? 'opacity-75 ring-2 ring-amber-400 shadow-md' : 'hover:ring-2 hover:ring-indigo-600 cursor-pointer'}`}>
            <div className="p-8 h-full flex flex-col">
              <div className="text-4xl mb-6">{feature.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-500 text-sm mb-8 flex-grow">{feature.description}</p>
              {isRunning ? (
                <div className="bg-amber-100 text-amber-700 py-2.5 rounded-xl font-bold text-center text-sm animate-pulse">Processing...</div>
              ) : (
                <Button onClick={() => onSelect(feature.id)} className="w-full">Open Tool</Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  </div>
);

export default App;
