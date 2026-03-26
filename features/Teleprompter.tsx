
import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, TextArea, Input } from '../components/Shared';
import { Play, Pause, RotateCcw, Download, Trash2, History, ArrowLeft, Settings, Type, Zap, Square, Mic, Volume2 } from 'lucide-react';

interface TeleprompterHistory {
  id: string;
  title: string;
  text: string;
  fontSize: number;
  speed: number;
  timestamp: number;
  audioData?: string; // Base64 string
}

const Teleprompter: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [fontSize, setFontSize] = useState(48);
  const [speed, setSpeed] = useState(5); // 1-20
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollPos, setScrollPos] = useState(0);
  const [history, setHistory] = useState<TeleprompterHistory[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isEditing, setIsEditing] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef(0);
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('teleprompter_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }

    // Initialize audio element
    audioRef.current = new Audio();
    audioRef.current.onended = () => setIsPlayingAudio(false);
    audioRef.current.ontimeupdate = () => {
      if (audioRef.current && audioRef.current.duration > 0) {
        setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
      }
    };
    audioRef.current.onloadedmetadata = () => {
      if (audioRef.current) setAudioDuration(audioRef.current.duration);
    };

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const saveHistory = (newHistory: TeleprompterHistory[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem('teleprompter_history', JSON.stringify(newHistory));
    } catch (e) {
      console.error('Failed to save history to localStorage (possibly too large):', e);
    }
  };

  const startRecording = async () => {
    if (!text.trim()) {
      alert('Please enter some text first!');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const newItem: TeleprompterHistory = {
            id: Math.random().toString(36).substr(2, 9),
            title: title || `Recording ${new Date().toLocaleDateString()}`,
            text,
            fontSize,
            speed,
            timestamp: Date.now(),
            audioData: base64data
          };
          saveHistory([newItem, ...history]);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      setIsPlaying(true);
      setIsEditing(false);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access denied. Please enable it in settings.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        setIsPlaying(true);
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        setIsPlaying(false);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setIsPaused(false);
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAudioPlayPause = () => {
    if (audioRef.current && audioUrl) {
      if (isPlayingAudio) {
        audioRef.current.pause();
      } else {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
      setIsPlayingAudio(!isPlayingAudio);
    }
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTo = (parseFloat(e.target.value) / 100) * audioDuration;
    if (audioRef.current) {
      audioRef.current.currentTime = seekTo;
      setAudioProgress(parseFloat(e.target.value));
    }
  };

  const handleSave = () => {
    if (!text.trim()) return;
    const newItem: TeleprompterHistory = {
      id: Math.random().toString(36).substr(2, 9),
      title: title || `Untitled ${new Date().toLocaleDateString()}`,
      text,
      fontSize,
      speed,
      timestamp: Date.now()
    };
    saveHistory([newItem, ...history]);
  };

  const handleDelete = (id: string) => {
    saveHistory(history.filter(item => item.id !== id));
  };

  const handleDownload = (item: TeleprompterHistory) => {
    const blob = new Blob([item.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadFromHistory = (item: TeleprompterHistory) => {
    setText(item.text);
    setTitle(item.title);
    setFontSize(item.fontSize);
    setSpeed(item.speed);
    setIsEditing(false);
    resetScroll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const animate = (time: number) => {
    if (lastTimeRef.current !== null) {
      const deltaTime = time - lastTimeRef.current;
      // Use a ref for speed to ensure the animation loop always has the latest value without restarting
      const pixelsPerSecond = speedRef.current * 20; 
      const move = (pixelsPerSecond * deltaTime) / 1000;
      
      if (scrollRef.current) {
        scrollPosRef.current += move;
        scrollRef.current.scrollTop = scrollPosRef.current;
        setScrollPos(scrollPosRef.current);

        if (scrollPosRef.current >= scrollRef.current.scrollHeight - scrollRef.current.clientHeight) {
          setIsPlaying(false);
          return;
        }
      }
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    if (isPlaying) {
      // Sync scrollPosRef with actual scrollTop when starting
      if (scrollRef.current) {
        scrollPosRef.current = scrollRef.current.scrollTop;
      }
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      lastTimeRef.current = null;
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  const resetScroll = () => {
    setIsPlaying(false);
    setScrollPos(0);
    scrollPosRef.current = 0;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-2 space-y-3 h-[calc(100vh-20px)] flex flex-col overflow-hidden">
      {/* Top Navigation */}
      <div className="flex items-center justify-between shrink-0 py-1">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 h-9 rounded-xl hover:bg-slate-100 transition-colors group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-wider">Back</span>
        </Button>
        <Button 
          variant={isEditing ? 'primary' : 'secondary'} 
          onClick={() => setIsEditing(!isEditing)}
          className="text-[9px] py-1 px-4 h-8 uppercase font-black tracking-widest"
        >
          {isEditing ? 'Done' : 'Edit Script'}
        </Button>
      </div>

      {/* Title & Script Info Section */}
      <div className="shrink-0 space-y-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tighter leading-none">Teleprompter</h1>
        <div className="flex items-center gap-2">
          <div className="relative flex-grow max-w-md">
            <Input 
              value={title} 
              onChange={setTitle} 
              placeholder="Enter Script Title..."
              className="!py-1 text-xs h-8 bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Main Prompter Section */}
      <div className="flex-grow flex flex-col min-h-0">
        <div className="relative flex-grow rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border-4 md:border-8 border-zinc-900 bg-black group flex flex-col">
          
          {/* Controls Overlay */}
          <div className="absolute top-0 left-0 right-0 z-20 flex flex-col gap-2 p-6 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
            <div className="flex items-center gap-4 w-full">
              <div className="flex items-center gap-3 flex-grow">
                <Type size={14} className="text-white/40 shrink-0" />
                <input 
                  type="range" min="20" max="120" value={fontSize} 
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="flex-grow h-1 accent-white bg-white/30 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-white/40 text-[10px] font-black w-14 text-right uppercase tracking-tighter">Size: {fontSize}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 w-full">
              <div className="flex items-center gap-3 flex-grow">
                <Zap size={14} className="text-white/40 shrink-0" />
                <input 
                  type="range" min="1" max="20" value={speed} 
                  onChange={(e) => setSpeed(parseInt(e.target.value))}
                  className="flex-grow h-1 accent-white bg-white/30 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-white/40 text-[10px] font-black w-14 text-right uppercase tracking-tighter">Speed: {speed}</span>
              </div>
            </div>
          </div>

          <div className="absolute top-3 right-3 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {!isEditing && (
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 bg-black/60 backdrop-blur-md text-white hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
              >
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              </button>
            )}
            <button 
              onClick={resetScroll}
              className="p-2 bg-black/60 backdrop-blur-md text-white hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Scroll Area / Editor */}
          <div className="relative flex-grow flex flex-col min-h-0">
            {isEditing ? (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your script here..."
                className="w-full h-full bg-black text-white p-6 md:p-10 focus:outline-none resize-none font-bold leading-relaxed custom-scrollbar"
                style={{ fontSize: `${fontSize}px` }}
              />
            ) : (
              <div 
                ref={scrollRef}
                onScroll={() => {
                  if (!isPlaying && scrollRef.current) {
                    scrollPosRef.current = scrollRef.current.scrollTop;
                    setScrollPos(scrollRef.current.scrollTop);
                  }
                }}
                className="flex-grow overflow-y-auto px-6 md:px-10 py-[50vh] scroll-smooth no-scrollbar cursor-ns-resize"
                style={{ backgroundColor: '#000' }}
              >
                <div 
                  className="max-w-4xl mx-auto text-center leading-relaxed font-bold transition-all duration-300"
                  style={{ 
                    fontSize: `${fontSize}px`, 
                    color: '#fff',
                    textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                  }}
                >
                  {text || <span className="text-zinc-700 italic">Enter your script to start...</span>}
                </div>
              </div>
            )}

            {/* Visual Guide Line */}
            {!isEditing && (
              <div className="absolute top-1/2 left-0 right-0 h-px bg-indigo-500/40 pointer-events-none z-10 flex items-center justify-between px-4">
                <div className="w-4 h-4 border-t-2 border-l-2 border-indigo-500 rotate-45 opacity-50"></div>
                <div className="w-4 h-4 border-t-2 border-r-2 border-indigo-500 -rotate-45 opacity-50"></div>
              </div>
            )}
          </div>

          {/* Recording Timer & Controls */}
          <div className="absolute bottom-12 left-0 right-0 z-20 flex flex-col items-center gap-3 pointer-events-none">
            {isRecording && (
              <div className="bg-red-600/90 backdrop-blur-md px-3 py-0.5 rounded-full text-white font-mono text-[11px] font-bold shadow-lg animate-pulse pointer-events-auto">
                {formatTime(recordingTime)}
              </div>
            )}
            
            <div className="flex items-center gap-3 pointer-events-auto">
              {!isRecording ? (
                <button 
                  onClick={startRecording}
                  className="w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
                >
                  <Play size={28} fill="currentColor" />
                </button>
              ) : (
                <>
                  <button 
                    onClick={pauseRecording}
                    className={`w-10 h-10 ${isPaused ? 'bg-blue-600' : 'bg-zinc-800'} text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all`}
                  >
                    <Pause size={20} fill="currentColor" />
                  </button>
                  <button 
                    onClick={stopRecording}
                    className="w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
                  >
                    <Square size={24} fill="currentColor" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Audio Playback UI */}
          {audioUrl && !isRecording && (
            <div className="absolute bottom-3 left-3 right-3 z-30 bg-zinc-900/90 backdrop-blur-md p-3 rounded-xl border border-white/10 flex items-center gap-3 shadow-2xl animate-in slide-in-from-bottom-4">
              <button 
                onClick={handleAudioPlayPause}
                className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center shrink-0"
              >
                {isPlayingAudio ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              </button>
              <div className="flex-grow flex flex-col gap-0.5">
                <input 
                  type="range" 
                  min="0" max="100" value={isNaN(audioProgress) ? 0 : audioProgress} 
                  onChange={handleAudioSeek}
                  className="w-full h-1 accent-indigo-500 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-zinc-400 font-mono">
                  <span>{formatTime(Math.floor(((isNaN(audioProgress) ? 0 : audioProgress) / 100) * (isNaN(audioDuration) ? 0 : audioDuration)))}</span>
                  <span>{formatTime(Math.floor(isNaN(audioDuration) ? 0 : audioDuration))}</span>
                </div>
              </div>
              <button 
                onClick={() => setAudioUrl(null)}
                className="p-1.5 text-zinc-500 hover:text-white transition-colors"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          )}

          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
            <div 
              className="h-full bg-indigo-600 transition-all duration-100"
              style={{ 
                width: `${scrollRef.current && (scrollRef.current.scrollHeight - scrollRef.current.clientHeight) > 0 
                  ? (scrollPos / (scrollRef.current.scrollHeight - scrollRef.current.clientHeight)) * 100 
                  : 0}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="shrink-0 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <History size={14} className="text-indigo-600" /> History
          </h3>
          <Button variant="secondary" onClick={handleSave} disabled={!text.trim()} className="text-[8px] py-1 px-2 h-6">
            Save Script
          </Button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
          {history.length === 0 ? (
            <div className="w-full text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-gray-400 text-[9px] italic">No saved recordings yet</p>
            </div>
          ) : (
            history.map(item => (
              <div key={item.id} className="min-w-[180px] p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group shrink-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-[10px] font-bold text-gray-800 truncate pr-2">{item.title}</h4>
                  <div className="flex gap-1">
                    <button onClick={() => handleDownload(item)} className="p-1 text-gray-400 hover:text-indigo-600 transition-colors">
                      <Download size={10} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
                <p className="text-[8px] text-gray-400 mb-2">{new Date(item.timestamp).toLocaleDateString()}</p>
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    className="flex-grow py-1 text-[8px] uppercase font-black tracking-widest bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border-none h-6" 
                    onClick={() => loadFromHistory(item)}
                  >
                    Load
                  </Button>
                  {item.audioData && (
                    <button 
                      onClick={() => {
                        setAudioUrl(item.audioData!);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Volume2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};



export default Teleprompter;
