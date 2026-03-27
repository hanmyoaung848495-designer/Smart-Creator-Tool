
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Card, Button, TextArea, Input, Select, ProgressBar } from '../components/Shared';
import { Play, Pause, Download, Trash2, History, ArrowLeft, Mic, Volume2, Users, User, StopCircle, Loader2, X } from 'lucide-react';
import { FeatureType, ProcessingTask, UserSession } from '../types';

interface VoiceHistory {
  id: string;
  title: string;
  text: string;
  mode: 'single' | 'multi';
  voices: string[];
  audioData: string; // Base64
  timestamp: number;
}

interface AIVoiceProps {
  session: UserSession;
  onStartTask: (type: FeatureType, title: string, runAction: (taskId: string) => Promise<any>) => void;
  tasks: ProcessingTask[];
  onBack: () => void;
  onRequireApiKey: () => void;
}

const VOICES = [
  'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede', 'Orpheus', 
  'Cassiopeia', 'Rigel', 'Castor', 'Pollux', 'Lyra', 'Vega', 'Deneb', 
  'Altair', 'Antares', 'Sirius', 'Canopus', 'Capella', 'Arcturus'
];

const MODELS = [
  { label: 'Gemini 2.5 Pro (High Quality)', value: 'gemini-2.5-pro-preview-tts' },
  { label: 'Gemini 2.5 Flash (Fast)', value: 'gemini-2.5-flash-preview-tts' }
];

const AIVoice: React.FC<AIVoiceProps> = ({ session, onStartTask, tasks, onBack, onRequireApiKey }) => {
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [isDialogMode, setIsDialogMode] = useState(false);
  const [dialogBlocks, setDialogBlocks] = useState<{ id: string; speaker: 'Speaker 1' | 'Speaker 2'; text: string }[]>([
    { id: '1', speaker: 'Speaker 1', text: '' },
    { id: '2', speaker: 'Speaker 2', text: '' }
  ]);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-pro-preview-tts');
  const [voice1, setVoice1] = useState('Kore');
  const [voice2, setVoice2] = useState('Puck');
  const [styleInstruction, setStyleInstruction] = useState('Read aloud in a warm and friendly tone: ');
  const [text, setText] = useState('');
  const [history, setHistory] = useState<VoiceHistory[]>([]);
  const [currentAudio, setCurrentAudio] = useState<{ url: string; id: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPreviewing, setIsPreviewing] = useState<string | null>(null);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [pickingVoiceFor, setPickingVoiceFor] = useState<'voice1' | 'voice2' | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('ai_voice_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }

    audioRef.current = new Audio();
    audioRef.current.onended = () => setIsPlaying(false);
    audioRef.current.ontimeupdate = () => {
      if (audioRef.current && audioRef.current.duration > 0) {
        setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
      }
    };
    audioRef.current.onloadedmetadata = () => {
      if (audioRef.current) setAudioDuration(audioRef.current.duration);
    };

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const saveHistory = (newHistory: VoiceHistory[]) => {
    setHistory(newHistory);
    localStorage.setItem('ai_voice_history', JSON.stringify(newHistory));
  };

  const activeTask = tasks.find(t => t.type === 'ai-voice' && t.status !== 'completed' && t.status !== 'failed');

  const checkApiKey = () => {
    if (session.useCustomKey && (!session.customApiKey || session.customApiKey.trim() === '')) {
      onRequireApiKey();
      return false;
    }
    return true;
  };

  const handleRun = async () => {
    const isTextEmpty = mode === 'multi' && isDialogMode 
      ? dialogBlocks.every(b => !b.text.trim())
      : !text.trim();

    if (isTextEmpty) {
      alert('Please enter some text!');
      return;
    }

    if (!checkApiKey()) return;
    const apiKey = session.useCustomKey ? session.customApiKey : process.env.GEMINI_API_KEY;

    const displayTitle = mode === 'multi' && isDialogMode 
      ? dialogBlocks.find(b => b.text.trim())?.text.slice(0, 30) || 'Multi-speaker Dialog'
      : text.slice(0, 30);
    const title = displayTitle + (displayTitle.length >= 30 ? '...' : '');
    
    onStartTask('ai-voice', title, async (taskId) => {
      const ai = new GoogleGenAI({ apiKey });
      
      let config: any = {
        responseModalities: [Modality.AUDIO],
      };

      if (mode === 'single') {
        config.speechConfig = {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice1 },
          },
        };
      } else {
        config.speechConfig = {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              { speaker: 'Speaker 1', voiceConfig: { prebuiltVoiceConfig: { voiceName: voice1 } } },
              { speaker: 'Speaker 2', voiceConfig: { prebuiltVoiceConfig: { voiceName: voice2 } } },
            ],
          },
        };
      }

      let prompt = '';
      if (mode === 'multi' && isDialogMode) {
        prompt = styleInstruction + "\n\n" + dialogBlocks.map(b => `${b.speaker}: ${b.text}`).join('\n');
      } else {
        prompt = styleInstruction + "\n\n" + text;
      }

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: [{ parts: [{ text: prompt }] }],
        config,
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error('Failed to generate audio');

      const wavBlob = base64PcmToWavBlob(base64Audio, 24000);
      const reader = new FileReader();
      const audioDataPromise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(wavBlob);
      });
      const wavBase64 = await audioDataPromise;

      const newItem: VoiceHistory = {
        id: Math.random().toString(36).substr(2, 9),
        title,
        text,
        mode,
        voices: mode === 'single' ? [voice1] : [voice1, voice2],
        audioData: wavBase64,
        timestamp: Date.now(),
      };

      const updatedHistory = [newItem, ...history];
      saveHistory(updatedHistory);
      
      const url = URL.createObjectURL(wavBlob);
      setCurrentAudio({ url, id: newItem.id });
      playAudio(url);

      return newItem;
    }).catch(err => {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        setIsQuotaModalOpen(true);
      } else {
        alert('Generation failed: ' + errMsg);
      }
    });
  };

  const base64PcmToWavBlob = (base64: string, sampleRate: number) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    // Add WAV header
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + bytes.length, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, bytes.length, true);
    
    return new Blob([header, bytes], { type: 'audio/wav' });
  };

  const base64ToBlob = (base64: string, type: string) => {
    const parts = base64.split(',');
    const actualBase64 = parts.length > 1 ? parts[1] : parts[0];
    const binary = atob(actualBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type });
  };

  const playAudio = (url: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTo = (parseFloat(e.target.value) / 100) * audioDuration;
    if (audioRef.current) {
      audioRef.current.currentTime = seekTo;
      setAudioProgress(parseFloat(e.target.value));
    }
  };

  const handleDownload = (item: VoiceHistory) => {
    const blob = base64ToBlob(item.audioData, 'audio/wav');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.title || 'ai-voice'}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (id: string) => {
    saveHistory(history.filter(h => h.id !== id));
  };

  const addDialogBlock = () => {
    setDialogBlocks([...dialogBlocks, { 
      id: Math.random().toString(36).substr(2, 9), 
      speaker: dialogBlocks.length % 2 === 0 ? 'Speaker 1' : 'Speaker 2', 
      text: '' 
    }]);
  };

  const updateDialogBlock = (id: string, updates: Partial<{ speaker: 'Speaker 1' | 'Speaker 2'; text: string }>) => {
    setDialogBlocks(dialogBlocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const removeDialogBlock = (id: string) => {
    if (dialogBlocks.length > 1) {
      setDialogBlocks(dialogBlocks.filter(b => b.id !== id));
    }
  };

  const previewVoice = async (voiceName: string) => {
    if (!checkApiKey()) return;
    const apiKey = session.useCustomKey ? session.customApiKey : process.env.GEMINI_API_KEY;

    setIsPreviewing(voiceName);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: [{ parts: [{ text: `Hello, I am ${voiceName}.` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const wavBlob = base64PcmToWavBlob(base64Audio, 24000);
        const url = URL.createObjectURL(wavBlob);
        playAudio(url);
      }
    } catch (err) {
      console.error('Preview failed:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        setIsQuotaModalOpen(true);
      } else {
        alert('Preview failed: ' + errMsg);
      }
    } finally {
      setIsPreviewing(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const VoiceSelector = ({ value, onChange, label, id }: { value: string; onChange: (v: string) => void; label: string; id: 'voice1' | 'voice2' }) => (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
      <button 
        onClick={() => setPickingVoiceFor(id)}
        className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl hover:border-indigo-300 transition-all shadow-sm group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
            <Mic size={16} />
          </div>
          <span className="font-bold text-gray-700">{value}</span>
        </div>
        <div className="text-indigo-600 text-xs font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">Change →</div>
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
      {/* Quota Modal */}
      {isQuotaModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-8 shadow-2xl w-full max-w-md text-center relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setIsQuotaModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            >
              <X size={20} />
            </button>
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <StopCircle size={40} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-4 tracking-tight">Quota ပြည့်သွားပါပြီ</h3>
            <p className="text-gray-600 leading-relaxed font-medium">
              လူကြီးမင်းထည့်ထားသော APIမှာ Quotaပြည့်သွားပါသဖြင့်အသုံးပြု၍မရတော့ပါ။ ခဏစောင့်ပြီးမှ ပြန်လည်ကြိုးစားပေးပါ သို့မဟုတ် အခြား API Key တစ်ခုကို အသုံးပြုပေးပါ။
            </p>
            <Button 
              onClick={() => setIsQuotaModalOpen(false)}
              className="w-full mt-8 py-4 rounded-2xl font-black uppercase tracking-widest"
            >
              နားလည်ပါပြီ
            </Button>
          </div>
        </div>
      )}

      {/* Voice Picker Modal */}
      {pickingVoiceFor && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">Select Voice</h3>
              <button 
                onClick={() => setPickingVoiceFor(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-indigo-200">
              {VOICES.map(voice => {
                const isSelected = (pickingVoiceFor === 'voice1' ? voice1 : voice2) === voice;
                return (
                  <div 
                    key={voice}
                    onClick={() => {
                      if (pickingVoiceFor === 'voice1') setVoice1(voice);
                      else setVoice2(voice);
                      setPickingVoiceFor(null);
                    }}
                    className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all group ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-600'}`} />
                      <span className="font-bold">{voice}</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        previewVoice(voice);
                      }}
                      disabled={isPreviewing !== null}
                      className={`p-2 rounded-xl transition-colors ${isSelected ? 'text-white bg-white/20 hover:bg-white/30' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}
                    >
                      {isPreviewing === voice ? <Loader2 size={18} className="animate-spin" /> : <Volume2 size={18} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft size={20} /> Back
        </Button>
        <h1 className="text-2xl font-black text-gray-900 tracking-tighter">AI Voice Generator</h1>
      </div>

      <Card className="p-6 space-y-6">
        {/* Model & Mode Selection */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-64">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">AI Model</label>
            <Select
              value={selectedModel}
              onChange={setSelectedModel}
              options={MODELS}
            />
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setMode('single')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${mode === 'single' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <User size={14} /> Single
            </button>
            <button
              onClick={() => setMode('multi')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${mode === 'multi' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Users size={14} /> Multi
            </button>
          </div>
        </div>

        {/* Voice Selectors */}
        <div className={`grid gap-6 ${mode === 'multi' ? 'md:grid-cols-2' : ''}`}>
          <VoiceSelector 
            label={mode === 'multi' ? 'Speaker 1 Voice' : 'Select Voice'}
            value={voice1}
            onChange={setVoice1}
            id="voice1"
          />

          {mode === 'multi' && (
            <VoiceSelector 
              label="Speaker 2 Voice"
              value={voice2}
              onChange={setVoice2}
              id="voice2"
            />
          )}
        </div>

        <div className="space-y-4">
          <Input
            label="Style Instruction"
            value={styleInstruction}
            onChange={setStyleInstruction}
            placeholder="e.g. Read aloud in a warm and friendly tone: "
          />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Text to Speak</label>
              {mode === 'multi' && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Dialog Mode</span>
                  <button 
                    onClick={() => setIsDialogMode(!isDialogMode)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${isDialogMode ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isDialogMode ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              )}
            </div>

            {mode === 'multi' && isDialogMode ? (
              <div className="space-y-3">
                {dialogBlocks.map((block, index) => (
                  <div key={block.id} className="flex flex-col gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                      <div className="w-full max-w-[160px]">
                        <Select
                          value={block.speaker}
                          onChange={(val) => updateDialogBlock(block.id, { speaker: val as any })}
                          options={[
                            { label: 'Speaker 1', value: 'Speaker 1' },
                            { label: 'Speaker 2', value: 'Speaker 2' }
                          ]}
                        />
                      </div>
                      <button 
                        onClick={() => removeDialogBlock(block.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <TextArea
                      value={block.text}
                      onChange={(val) => updateDialogBlock(block.id, { text: val })}
                      placeholder={`What Speaker ${block.speaker === 'Speaker 1' ? '1' : '2'} says...`}
                      rows={2}
                    />
                  </div>
                ))}
                <Button 
                  variant="secondary" 
                  onClick={addDialogBlock}
                  className="w-full py-3 border-dashed border-2 border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50"
                >
                  + Add Speaker Line
                </Button>
              </div>
            ) : (
              <TextArea
                value={text}
                onChange={setText}
                placeholder="Enter the text you want the AI to read..."
                rows={6}
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={activeTask ? undefined : handleRun}
            variant={activeTask ? 'danger' : 'primary'}
            className="flex-grow py-4 text-sm font-black uppercase tracking-[0.2em]"
            disabled={isPreviewing !== null}
          >
            {activeTask ? (
              <>
                <StopCircle size={20} /> Stop (Cancel)
              </>
            ) : (
              <>
                <Play size={20} fill="currentColor" /> Run Generator
              </>
            )}
          </Button>

          {currentAudio && !activeTask && (
            <div className="flex-grow flex items-center gap-3 bg-indigo-50 p-3 rounded-2xl border border-indigo-100 animate-in slide-in-from-right-4">
              <button 
                onClick={handlePlayPause}
                className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shrink-0 shadow-md hover:scale-105 transition-transform"
              >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              </button>
              <div className="flex-grow flex flex-col gap-1">
                <input 
                  type="range" 
                  min="0" max="100" value={audioProgress} 
                  onChange={handleSeek}
                  className="w-full h-1.5 accent-indigo-600 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-indigo-400 font-black tracking-tighter">
                  <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
                  <span>{formatTime(audioDuration)}</span>
                </div>
              </div>
              <button 
                onClick={() => handleDownload(history[0])}
                className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors"
              >
                <Download size={20} />
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* History */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] flex items-center gap-2">
          <History size={16} className="text-indigo-600" /> Generation History
        </h3>
        <div className="grid gap-4">
          {history.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-sm italic">No history yet. Start generating voices!</p>
            </div>
          ) : (
            history.map(item => (
              <Card key={item.id} className="p-4 flex items-center gap-4 group">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <Volume2 size={20} />
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="text-sm font-bold text-gray-900 truncate">{item.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">
                      {item.mode === 'single' ? 'Single' : 'Multi'} • {item.voices.join(', ')}
                    </span>
                    <span className="text-[10px] text-gray-300">•</span>
                    <span className="text-[10px] text-gray-400">{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="secondary" 
                    className="p-2 h-9 w-9 rounded-lg"
                    onClick={() => {
                      const blob = base64ToBlob(item.audioData, 'audio/wav');
                      const url = URL.createObjectURL(blob);
                      setCurrentAudio({ url, id: item.id });
                      playAudio(url);
                    }}
                  >
                    <Play size={16} fill="currentColor" />
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="p-2 h-9 w-9 rounded-lg"
                    onClick={() => handleDownload(item)}
                  >
                    <Download size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="p-2 h-9 w-9 rounded-lg text-red-500 hover:bg-red-50"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AIVoice;
