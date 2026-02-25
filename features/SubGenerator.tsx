
import React, { useState, useMemo } from 'react';
import { UserSession, FeatureType, StoredResult, ProcessingTask } from '../types';
import { Card, Button, ProgressBar, TextArea, ResultBox } from '../components/Shared';
import { generateSubtitles, convertTextToSRT } from '../services/gemini';
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
  onCopyResult: (content: string) => void;
  onDownloadResult: (result: StoredResult) => void;
  onClearResults: (type: FeatureType) => void;
}

const SubGenerator: React.FC<Props> = ({ 
  onBack, session, tasks, onSaveResult, onStartTask, onUpdateSession,
  results, onDeleteResult, onCopyResult, onDownloadResult, onClearResults
}) => {
  const [activeTab, setActiveTab] = useState<'media' | 'manual'>('media');
  const [file, setFile] = useState<File | null>(null);
  const [localProgress, setLocalProgress] = useState(0);
  const [manualText, setManualText] = useState('');
  const [manualResult, setManualResult] = useState('');
  const [isManualProcessing, setIsManualProcessing] = useState(false);

  const activeTask = useMemo(() => 
    tasks.find(t => t.type === 'sub-generator' && t.status !== 'completed' && t.status !== 'failed'),
  [tasks]);

  const handleConvertManualToSRT = async () => {
    if (!manualText.trim() || isManualProcessing) return;

    const apiKey = session.useCustomKey ? session.customApiKey : undefined;
    setIsManualProcessing(true);
    
    onStartTask('sub-generator', 'Converting Text to SRT...', async () => {
      try {
        const res = await convertTextToSRT(manualText, apiKey);
        setManualResult(res);
        onSaveResult({
          type: 'sub-generator',
          title: `Manual SRT Conversion`,
          content: res,
          fileName: `manual_subs_${Date.now()}.srt`,
          mimeType: 'text/plain'
        });
        setIsManualProcessing(false);
        return res;
      } catch (err) {
        setIsManualProcessing(false);
        throw err;
      }
    });
  };

  const processMedia = async () => {
    if (!file || activeTask) return;
    const apiKey = session.useCustomKey ? session.customApiKey : undefined;
    
    onStartTask('sub-generator', `Generating subs for ${file.name}`, async (taskId) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onprogress = (ev) => {
          if (ev.lengthComputable) setLocalProgress((ev.loaded / ev.total) * 100);
        };
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const res = await generateSubtitles(base64, file.type, apiKey);
            onSaveResult({
              type: 'sub-generator',
              title: `AI Subtitles: ${file.name}`,
              content: res,
              fileName: `subtitles_${file.name}.srt`
            });
            setLocalProgress(0);
            resolve(res);
          } catch (err) { reject(err); }
        };
        reader.readAsDataURL(file);
      });
    });
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={onBack} className="p-2">⬅️ Back</Button>
        <h2 className="text-3xl font-bold text-gray-900">Sub Generator</h2>
      </div>

      <Card className="p-8">
        <div className="flex gap-4 mb-8 border-b border-gray-100 pb-4">
          <button 
            onClick={() => setActiveTab('media')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-all ${activeTab === 'media' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            🎬 Upload Media
          </button>
          <button 
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-all ${activeTab === 'manual' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            ⌨️ Text to SRT
          </button>
        </div>

        {activeTab === 'media' ? (
          activeTask ? (
            <div className="flex flex-col items-center py-12 gap-6">
              <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Analyzing Media...</h3>
                <p className="text-gray-500">Generating synchronized subtitles in the background.</p>
              </div>
              <div className="w-full max-w-md">
                <ProgressBar progress={activeTask.progress} label={activeTask.status} />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border-2 border-dashed p-10 flex flex-col items-center bg-gray-50 relative rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                <input type="file" accept="video/*,audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                <span className="text-4xl mb-2">🎬</span>
                <p className="font-bold text-gray-700">{file ? file.name : "Upload media to generate subtitles"}</p>
              </div>
              {localProgress > 0 && localProgress < 100 && <ProgressBar progress={localProgress} label="Uploading file..." />}
              <Button onClick={processMedia} disabled={!file} className="w-full py-4 uppercase tracking-widest text-xs font-bold">
                Generate Subtitles
              </Button>
            </div>
          )
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-4">
              <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-1">Format Example:</p>
              <code className="text-[11px] text-indigo-600 block bg-white/50 p-2 rounded border border-indigo-100">
                00:00:05 - 00:00:10: Hello World!
              </code>
              <p className="text-[10px] text-indigo-400 mt-2 italic font-medium">Using AI for smarter parsing. Works with system or own API key.</p>
            </div>
            <TextArea 
              label="Paste Text with Timestamps" 
              placeholder="00:00:05 - 00:00:10: Dialogue Line..."
              value={manualText}
              onChange={setManualText}
              rows={8}
            />
            <div className="flex gap-4">
              <Button 
                onClick={handleConvertManualToSRT} 
                disabled={isManualProcessing || !manualText.trim()}
                className={`flex-grow ${isManualProcessing ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} shadow-green-100 py-3 text-xs uppercase font-bold tracking-widest`}
              >
                {isManualProcessing ? 'AI Processing...' : '🚀 AI Convert to SRT'}
              </Button>
              <Button variant="danger" onClick={() => { setManualText(''); setManualResult(''); }} className="px-8 text-xs uppercase font-bold tracking-widest">
                Clear
              </Button>
            </div>
            {manualResult && (
              <ResultBox 
                title="Generated Subtitles" 
                content={manualResult} 
                onCopy={() => onCopyResult(manualResult)}
                onDownload={() => onDownloadResult({
                  id: 'temp', type: 'sub-generator', timestamp: Date.now(),
                  title: 'Manual SRT', content: manualResult, fileName: 'manual_subs.srt'
                })}
              />
            )}
          </div>
        )}
      </Card>

      <PersistentResults 
        results={results} 
        activeType="sub-generator" 
        onDelete={onDeleteResult}
        onClearAll={() => onClearResults('sub-generator')}
        onCopy={onCopyResult}
        onDownload={onDownloadResult}
      />
    </div>
  );
};

export default SubGenerator;
