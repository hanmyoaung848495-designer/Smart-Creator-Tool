
import React, { useState, useMemo } from 'react';
import { UserSession, FeatureType, StoredResult, ProcessingTask } from '../types';
import { Card, Button, ProgressBar, ApiKeyManager } from '../components/Shared';
import { transcribeMedia } from '../services/gemini';
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
}

const Transcribe: React.FC<Props> = ({ 
  onBack, session, tasks, onSaveResult, onStartTask, onUpdateSession,
  results, onDeleteResult, onCopyResult, onDownloadResult
}) => {
  const [file, setFile] = useState<File | null>(null);
  
  const activeTask = useMemo(() => 
    tasks.find(t => t.type === 'transcribe' && t.status !== 'completed' && t.status !== 'failed'),
  [tasks]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const process = async () => {
    if (!file || activeTask) return;
    
    const apiKey = session.useCustomKey ? session.customApiKey : undefined;
    
    onStartTask('transcribe', `Transcribing ${file.name}`, async (taskId) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const res = await transcribeMedia(base64, file.type, apiKey);
            onSaveResult({
              type: 'transcribe',
              title: `Transcription: ${file.name}`,
              content: res,
              fileName: `transcription_${file.name}.txt`
            });
            resolve(res);
          } catch (err) { reject(err); }
        };
        reader.onerror = () => reject(new Error("File read error"));
        reader.readAsDataURL(file);
      });
    });
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={onBack} className="p-2">⬅️ Back</Button>
        <h2 className="text-3xl font-bold text-gray-900">Transcribe</h2>
      </div>

      <ApiKeyManager session={session} onUpdate={onUpdateSession} />

      <Card className="p-8">
        {activeTask ? (
          <div className="flex flex-col items-center py-12 gap-6">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Transcribing...</h3>
              <p className="text-gray-500">Conversion happens in the background.</p>
            </div>
            <div className="w-full max-w-md">
              <ProgressBar progress={activeTask.progress} label={activeTask.status} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-12 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
              <input type="file" accept="audio/*,video/*" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              <div className="text-5xl mb-4">📁</div>
              <p className="text-gray-700 font-bold">{file ? file.name : "Click or drag to upload audio/video"}</p>
            </div>
            <Button variant="primary" onClick={process} disabled={!file} className="w-full py-4 text-lg">
              Start Transcribing
            </Button>
          </div>
        )}
      </Card>

      <PersistentResults 
        results={results} 
        activeType="transcribe" 
        onDelete={onDeleteResult}
        onCopy={onCopyResult}
        onDownload={onDownloadResult}
      />
    </div>
  );
};

export default Transcribe;
