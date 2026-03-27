
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FeatureType, AdminSettings, UserSession, ActivityRecord, StoredResult, ProcessingTask } from './types';
import { FEATURES, DEFAULT_ADMIN_SETTINGS } from './constants';
import { Card, Button, ProgressBar, ApiKeyManager, Modal } from './components/Shared';
import Transcribe from './features/Transcribe';
import Translate from './features/Translate';
import SRTTranslate from './features/SRTTranslate';
import SubGenerator from './features/SubGenerator';
import ScriptWriter from './features/ScriptWriter';
import TextToSRT from './features/TextToSRT';
import TeleprompterFeature from './features/Teleprompter';
import AIVoice from './features/AIVoice';
import Tutorial from './features/Tutorial';
import APIGuide from './features/APIGuide';
import MusicPlayer from './components/MusicPlayer';
import PersistentResults from './components/PersistentResults';
import TaskOverlay from './components/TaskOverlay';
import { Menu, X, BookOpen, User, Home as HomeIcon, Zap, Send, Sun, Moon, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';

const App: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<FeatureType>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [settings] = useState<AdminSettings>({
    ...DEFAULT_ADMIN_SETTINGS,
    welcomeMessage: "သူငယ်ချင်းတို့မင်္ဂလာပါ!",
    footerText: "Contentတွေလုပ်ရတာအဆင်ပြေအောင် စမ်းထားတဲ့ Websiteလေးဖြစ်ပါတယ်။ သုံးမယ်ဆိုရင် Own Keyကိုနှိပ်ပြီး API keyထည့်သုံးလို့ရပါတယ်။ Text to SRT လေးကတော့ API keyမလိုဘဲသုံးလို့ရပါတယ်။"
  });
  
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
  const [session, setSession] = useState<UserSession>(() => {
    const saved = localStorage.getItem('smart_creator_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Force 'Own Key' as default for users who were on the old 'System' default
      if (parsed.useCustomKey === false && !parsed.customApiKey) {
        parsed.useCustomKey = true;
      }
      if (parsed.user && !parsed.user.usage) {
        parsed.user.usage = { appApiUsedToday: 0, ownApiUsedToday: 0, lastResetDate: new Date().toDateString() };
      }
      return parsed;
    }
    return { role: 'free', useCustomKey: true, customApiKey: '' };
  });
  
  const [results, setResults] = useState<StoredResult[]>(() => {
    const saved = localStorage.getItem('smart_creator_results');
    return saved ? JSON.parse(saved) : [];
  });

  const [tasks, setTasks] = useState<ProcessingTask[]>([]);
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('smart_creator_onboarded'));
  const [modalType, setModalType] = useState<'privacy' | 'terms' | null>(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState(true);
  const [showApiKeyPopup, setShowApiKeyPopup] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [toastMessage, setToastMessage] = useState<{title: string, type: 'success' | 'error'} | null>(null);

  const handleSystemLogin = async () => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loginId, password: loginPass })
      });

      if (response.ok) {
        const { apiKey } = await response.json();
        handleUpdateSession({ 
          useCustomKey: true, 
          customApiKey: apiKey,
          role: 'premium' 
        });
        setShowLoginModal(false);
        setLoginId('');
        setLoginPass('');
        setLoginError('');
        setToastMessage({ title: 'Login အောင်မြင်ပါတယ်။ System APIကိုသုံးလို့ရပါပြီ', type: 'success' });
        setTimeout(() => setToastMessage(null), 3000);
      } else {
        const { error } = await response.json();
        setLoginError(error || 'Password or IDမှားနေပါတယ်');
      }
    } catch (error) {
      setLoginError('Server နှင့် ချိတ်ဆက်၍မရပါ');
    }
  };

  useEffect(() => {
    if (showWelcomePopup) {
      const timer = setTimeout(() => {
        setShowWelcomePopup(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showWelcomePopup]);

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
      onBack: () => setActiveFeature('home'),
      onRequireApiKey: () => setShowApiKeyPopup(true)
    };

    switch (activeFeature) {
      case 'home': return <Home onSelect={setActiveFeature} settings={settings} activeTasks={activeTasks} session={session} onUpdateSession={handleUpdateSession} onRequireLogin={() => setShowLoginModal(true)} />;
      case 'transcribe': return <Transcribe {...commonProps} />;
      case 'translate': return <Translate {...commonProps} />;
      case 'srt-translate': return <SRTTranslate {...commonProps} />;
      case 'sub-generator': return <SubGenerator {...commonProps} />;
      case 'script-writer': return <ScriptWriter {...commonProps} />;
      case 'text-to-srt': return <TextToSRT {...commonProps} />;
      case 'teleprompter': return <TeleprompterFeature onBack={() => setActiveFeature('home')} session={session} onRequireApiKey={() => setShowApiKeyPopup(true)} />;
      case 'ai-voice': return <AIVoice {...commonProps} />;
      case 'api-guide': return <APIGuide onBack={() => setActiveFeature('home')} />;
      case 'tutorial': return <Tutorial onBack={() => setActiveFeature('home')} />;
      default: return <Home onSelect={setActiveFeature} settings={settings} activeTasks={activeTasks} session={session} onUpdateSession={handleUpdateSession} onRequireLogin={() => setShowLoginModal(true)} />;
    }
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const navigateTo = (feature: FeatureType) => {
    setActiveFeature(feature);
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-gray-900 dark:text-gray-100">
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top fade-in duration-300">
          <div className={`px-6 py-3 rounded-2xl shadow-lg border flex items-center gap-3 ${toastMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/50 dark:border-green-800 dark:text-green-100' : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/50 dark:border-red-800 dark:text-red-100'}`}>
            {toastMessage.type === 'success' ? <CheckCircle size={20} className="text-green-500 dark:text-green-400"/> : <XCircle size={20} className="text-red-500 dark:text-red-400"/>}
            <span className="font-bold text-sm">{toastMessage.title}</span>
          </div>
        </div>
      )}
      {showTutorial && <Tutorial onBack={() => { setShowTutorial(false); localStorage.setItem('smart_creator_onboarded', 'true'); }} />}
      
      <TaskOverlay tasks={tasks} onDismiss={removeTask} onRetry={removeTask} />

      {/* Side Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-in fade-in duration-300" onClick={toggleMenu}>
          <div 
            className="absolute right-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-800 shadow-2xl p-6 animate-in slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest text-xs">Menu</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  {isDarkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-gray-500" />}
                </button>
                <button onClick={toggleMenu} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <button 
                onClick={() => navigateTo('home')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeFeature === 'home' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <HomeIcon size={18} className="text-blue-500" /> Home
              </button>
              <button 
                onClick={() => navigateTo('tutorial')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeFeature === 'tutorial' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <BookOpen size={18} className="text-emerald-500" /> Tutorial
              </button>
              <button 
                onClick={() => navigateTo('api-guide')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeFeature === 'api-guide' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <Zap size={18} className="text-amber-500" /> API Guide
              </button>
              <a 
                href="https://t.me/kcteamofficialbot" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                <Send size={18} className="text-sky-500" /> Contact
              </a>
              {session.useCustomKey === false ? (
                <button 
                  onClick={() => {
                    handleUpdateSession({ useCustomKey: true, role: 'free' });
                    setToastMessage({ title: 'Logout အောင်မြင်ပါတယ်။', type: 'success' });
                    setTimeout(() => setToastMessage(null), 3000);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  <User size={18} className="text-red-500" /> Logout
                </button>
              ) : (
                <button 
                  onClick={() => { setShowLoginModal(true); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  <User size={18} className="text-purple-500" /> System Login
                </button>
              )}
            </div>

            <div className="absolute bottom-8 left-6 right-6">
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-1">Version 1.0.4</p>
                <p className="text-[10px] text-indigo-400 italic">Smart Creator Tools</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setLoginId('');
          setLoginPass('');
          setLoginError('');
        }}
        title="System Login"
        maxWidth="max-w-sm"
        hideBottomClose={true}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            System API ကို အသုံးပြုရန် ID နှင့် Password ထည့်ပါ။
          </p>
          
          {loginError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center gap-2">
              <XCircle size={16} />
              {loginError}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">ID</label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Enter ID"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSystemLogin()}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Enter Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <Button onClick={handleSystemLogin} className="w-full py-3 mt-2">
            Login
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showWelcomePopup}
        onClose={() => setShowWelcomePopup(false)}
        title="Welcome"
        hideClose={true}
        maxWidth="max-w-xs"
      >
        <div className="space-y-4 py-2 flex flex-col items-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2.5 shadow-xl border border-gray-100 dark:border-gray-700 dark:bg-gray-800">
            <div className="w-full h-full bg-[#FF0000] rounded-lg flex items-center justify-center">
              <span className="font-black text-lg text-[#FFD700] leading-none">$</span>
            </div>
          </div>
          
          <div className="text-center space-y-0.5">
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Smart Creator</h2>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Designed and Developed</p>
            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">By KC Team</p>
          </div>

          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-center text-xs font-medium max-w-[240px]">
            {settings.marqueeText}
          </p>
          
          <div className="w-full pt-2">
            <Button onClick={() => setShowWelcomePopup(false)} className="w-full py-3 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none text-xs">
              စတင်အသုံးပြုမည်
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showApiKeyPopup}
        onClose={() => setShowApiKeyPopup(false)}
        title="API Key လိုအပ်ပါသည်"
        maxWidth="max-w-sm"
        hideBottomClose={true}
      >
        <div className="space-y-4 py-2">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
            ဒီ Tool ကိုအသုံးပြုရန် သင့်ကိုယ်ပိုင် Gemini API Key ထည့်သွင်းရန် လိုအပ်ပါသည်။
          </p>
          <div className="flex justify-end pt-2">
            <Button 
              onClick={() => { 
                setShowApiKeyPopup(false); 
                setActiveFeature('home'); 
                handleUpdateSession({ useCustomKey: true });
                setTimeout(() => {
                  document.getElementById('custom-api-key-input')?.focus();
                }, 100);
              }} 
              className="py-2 px-4 text-xs"
            >
              Add API
            </Button>
          </div>
        </div>
      </Modal>
      
      <Modal 
        isOpen={modalType !== null} 
        onClose={() => setModalType(null)} 
        title={modalType === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
      >
        {modalType === 'privacy' ? (
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            <p>Your privacy is paramount to us. Smart Creator Tools is designed as a bridge between you and Google AI Studio.</p>
            <h4 className="font-bold text-gray-900 dark:text-gray-100">1. No Data Storage</h4>
            <p>We do not store, log, or retain any of the data you process through our tools. Your content is processed directly between your browser and Google AI Studio.</p>
            <h4 className="font-bold text-gray-900 dark:text-gray-100">2. Intermediary Role</h4>
            <p>This website acts solely as an intermediary interface to facilitate your interaction with Google AI Studio. We do not have access to your private data or API keys.</p>
            <h4 className="font-bold text-gray-900 dark:text-gray-100">3. Security</h4>
            <p>Since we do not store data, the risk of data breaches on our end is non-existent. We recommend you keep your API keys secure and never share them.</p>
          </div>
        ) : (
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            <p>By using Smart Creator Tools, you agree to these terms.</p>
            <h4 className="font-bold text-gray-900 dark:text-gray-100">1. Usage</h4>
            <p>You are responsible for the content you generate and ensure it complies with Google's AI policies and applicable laws.</p>
            <h4 className="font-bold text-gray-900 dark:text-gray-100">2. API Keys</h4>
            <p>You are responsible for the management and security of your own API keys. We are not liable for any unauthorized use of your keys.</p>
            <h4 className="font-bold text-gray-900 dark:text-gray-100">3. Disclaimer</h4>
            <p>This service is provided "as is" for creative purposes. We do not guarantee uninterrupted access or specific results.</p>
          </div>
        )}
      </Modal>

      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveFeature('home')}>
                <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
                  <div className="w-full h-full bg-[#FF0000] rounded-lg flex items-center justify-center">
                    <span className="font-black text-sm text-[#FFD700] leading-none">$</span>
                  </div>
                </div>
                <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-gray-100">{settings.appLogo}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {activeTasks.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/30 rounded-full animate-pulse border border-amber-100 dark:border-amber-800">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-widest">{activeTasks.length} Task{activeTasks.length > 1 ? 's' : ''}</span>
              </div>
            )}
            <button onClick={toggleMenu} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors">
              <Menu size={24} className="text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 w-full relative h-0">
        <div className="absolute top-2 left-4 z-40">
          <MusicPlayer />
        </div>
      </div>

      <main className={`flex-grow max-w-7xl mx-auto px-4 w-full ${activeFeature === 'teleprompter' ? 'py-0 pb-0' : 'py-8'}`}>
        {renderActiveFeature()}
      </main>

      {activeFeature !== 'teleprompter' && (
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 py-12 mt-auto">
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
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-300 px-4 leading-relaxed flex items-center justify-center gap-2">
              <span>© 2026 Smart Creator Tools. All rights reserved by KC Team. With best wishes.</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

const Home: React.FC<{ 
  onSelect: (f: FeatureType) => void; 
  settings: AdminSettings; 
  activeTasks: ProcessingTask[];
  session: UserSession;
  onUpdateSession: (updates: Partial<UserSession>) => void;
  onRequireLogin: () => void;
}> = ({ onSelect, settings, activeTasks, session, onUpdateSession, onRequireLogin }) => (
  <div className="space-y-12">
    <div className="text-center max-w-3xl mx-auto">
      <h1 className="text-3xl md:text-5xl font-black mb-2 tracking-tighter leading-normal px-4 py-2 bg-clip-text text-transparent bg-gradient-to-b from-[#FFD700] via-[#FDB931] to-[#9f7928]"
          style={{ 
            filter: 'drop-shadow(2px 2px 0px #b8860b) drop-shadow(4px 4px 4px rgba(0,0,0,0.15))',
          }}>
        {settings.welcomeMessage}
      </h1>
      <div className="mb-6 flex flex-col items-center">
        <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Designed and Developed</p>
        <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">By KC Team</p>
      </div>
      <p className="text-slate-900 dark:text-gray-300 text-lg md:text-xl font-bold uppercase tracking-[0.15em]">
        အသက်ရှုတိုင်းငွေဝင်ပါစေ
      </p>
    </div>

    <div className="max-w-4xl mx-auto">
      <ApiKeyManager session={session} onUpdate={onUpdateSession} onRequireLogin={onRequireLogin} />
    </div>

    <div className="w-full">
      <div className="flex items-center justify-between px-4 mb-6">
        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Available Tools</h3>
      </div>
      <div className="grid grid-cols-2 gap-4 px-4">
        {FEATURES.map((feature) => {
          const isRunning = activeTasks.some(t => t.type === feature.id);
          return (
            <button
              key={feature.id}
              onClick={() => !isRunning && onSelect(feature.id)}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all shadow-sm ${
                isRunning 
                  ? 'bg-amber-50 border-amber-200 text-amber-700 opacity-75 cursor-wait' 
                  : 'bg-white border-gray-100 text-gray-700 hover:border-indigo-600 hover:shadow-md active:scale-95'
              }`}
            >
              <span className="text-2xl shrink-0">{feature.icon}</span>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-xs font-bold leading-tight text-left">{feature.title}</span>
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
