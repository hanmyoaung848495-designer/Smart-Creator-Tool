
import React, { useState, useMemo } from 'react';
import { UserSession, FeatureType, StoredResult, ProcessingTask } from '../types';
import { Card, Button, ProgressBar, Input, ResultBox } from '../components/Shared';
import { transcribeMedia, transcribeYoutubeLink } from '../services/gemini';
import PersistentResults from '../components/PersistentResults';

interface Props {
  onBack: () => void;
  session: UserSession;
  tasks: ProcessingTask[];
  onSaveResult: (result: Omit<StoredResult, 'id' | 'timestamp'>) => void;
  onStartTask: (type: FeatureType, title: string, runAction: (taskId: string) => Promise<any>) => void;
  onUpdateSession: (updates: Partial<UserSession>) => void;
  results: StoredResult[];
  onDeleteResult: (id: string) => void;
  onClearResults: (type: FeatureType) => void;
  onCopyResult: (content: string) => void;
  onDownloadResult: (result: StoredResult) => void;
}

const Transcribe: React.FC<Props> = ({ 
  onBack, session, tasks, onSaveResult, onStartTask, onUpdateSession,
  results, onDeleteResult, onClearResults, onCopyResult, onDownloadResult
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'youtube'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [ytUrl, setYtUrl] = useState('');
  const [translateBurmese, setTranslateBurmese] = useState(false);
  const [result, setResult] = useState('');

  const activeTask = useMemo(() => 
    tasks.find(t => t.type === 'transcribe' && t.status !== 'completed' && t.status !== 'failed'),
  [tasks]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processFileUpload = async () => {
    if (!file || activeTask) return;
    const apiKey = session.useCustomKey ? session.customApiKey : undefined;
    
    onStartTask('transcribe', `Generating Script for ${file.name}`, async (taskId) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const res = await transcribeMedia(base64, file.type, apiKey);
            setResult(res);
            onSaveResult({
              type: 'transcribe',
              title: `Script: ${file.name}`,
              content: res,
              fileName: `script_${file.name}.txt`
            });
            resolve(res);
          } catch (err) { reject(err); }
        };
        reader.onerror = () => reject(new Error("File read error"));
        reader.readAsDataURL(file);
      });
    });
  };

  const processYoutubeLink = async () => {
    if (!ytUrl || activeTask) return;
    const apiKey = session.useCustomKey ? session.customApiKey : undefined;
    
    onStartTask('transcribe', `Video Script AI: ${ytUrl.substring(0, 30)}...`, async () => {
      const resData = await transcribeYoutubeLink(ytUrl, apiKey, translateBurmese);
      let content = resData.text;
      if (resData.sources && resData.sources.length > 0) {
        content += "\n\n--- Search References ---\n" + resData.sources.map((s: any) => s.web?.uri || "").filter(Boolean).join("\n");
      }
      setResult(content);
      onSaveResult({
        type: 'transcribe',
        title: `Video Script AI: ${ytUrl}`,
        content: content,
        fileName: `video_script.txt`
      });
      return content;
    });
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={onBack} className="p-2">⬅️ Back</Button>
        <h2 className="text-3xl font-bold text-gray-900">Transcribe</h2>
      </div>

      <Card className="p-8">
        <div className="flex gap-4 mb-8 border-b border-gray-100 pb-4">
          <button 
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-all ${activeTab === 'upload' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            📁 File Upload
          </button>
          <button 
            onClick={() => setActiveTab('youtube')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-all ${activeTab === 'youtube' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            📺 Video Link Script
          </button>
        </div>

        {activeTask ? (
          <div className="flex flex-col items-center py-12 gap-6">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Analyzing Content...</h3>
              <p className="text-gray-500 text-sm italic">Our specialized AI is listening and crafting your engaging script.</p>
            </div>
            <div className="w-full max-w-md">
              <ProgressBar progress={activeTask.progress} label={activeTask.status} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {activeTab === 'upload' ? (
              <div className="flex flex-col items-center gap-6">
                <div className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-12 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
                  <input type="file" accept="audio/*,video/*" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <div className="text-5xl mb-4">📁</div>
                  <p className="text-gray-700 font-bold">{file ? file.name : "Click or drag to upload audio/video"}</p>
                </div>
                <Button variant="primary" onClick={processFileUpload} disabled={!file} className="w-full py-4 text-xs font-bold uppercase tracking-widest">
                  Generate Script from File
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
                  <Input 
                    label="Video Link (YouTube, TikTok, Facebook)" 
                    placeholder="Paste link here..." 
                    value={ytUrl} 
                    onChange={setYtUrl} 
                  />
                  
                  <div className="mt-6 flex items-center justify-between p-4 bg-white rounded-xl border border-indigo-100 shadow-sm">
                    <div>
                      <p className="text-xs font-bold text-indigo-900 uppercase tracking-widest">Translate Script to Burmese</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Converts the entire script output</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={translateBurmese} 
                        onChange={(e) => setTranslateBurmese(e.target.checked)} 
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <p className="mt-4 text-[10px] text-indigo-400 font-bold uppercase tracking-widest italic">
                    AI will analyze the video and generate an attractive speaking script.
                  </p>
                </div>
                <Button variant="primary" onClick={processYoutubeLink} disabled={!ytUrl} className="w-full py-4 text-xs font-bold uppercase tracking-widest">
                  Analyze & Generate Script
                </Button>
              </div>
            )}
          </div>
        )}

        <ResultBox 
          title="Generated Script" 
          content={result} 
          onCopy={() => onCopyResult(result)}
          onClear={() => setResult('')}
          onDownload={() => onDownloadResult({
            id: 'temp', type: 'transcribe', timestamp: Date.now(),
            title: 'Download Script', content: result, fileName: 'script.txt'
          })}
        />
      </Card>

      <PersistentResults 
        results={results} 
        activeType="transcribe" 
        onDelete={onDeleteResult}
        onClearAll={() => onClearResults('transcribe')}
        onCopy={onCopyResult}
        onDownload={onDownloadResult}
      />
    </div>
  );
};

export default Transcribe;
