
import React, { useState, useMemo } from 'react';
import { UserSession, FeatureType, StoredResult, ProcessingTask } from '../types';
import { Card, Button, ProgressBar, ApiKeyManager } from '../components/Shared';
import { generateSubtitles } from '../services/gemini';
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

const SubGenerator: React.FC<Props> = ({ 
  onBack, session, tasks, onSaveResult, onStartTask, onUpdateSession,
  results, onDeleteResult, onCopyResult, onDownloadResult
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [localProgress, setLocalProgress] = useState(0);

  const activeTask = useMemo(() => 
    tasks.find(t => t.type === 'sub-generator' && t.status !== 'completed' && t.status !== 'failed'),
  [tasks]);

  const process = async () => {
    if (!file || activeTask) return;
    const apiKey = session.useCustomKey ? session.customApiKey : undefined;
    
    onStartTask('sub-generator', `Generating subs for ${file.name}`, async (taskId) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setLocalProgress((ev.loaded / ev.total) * 100);
          }
        };

        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const res = await generateSubtitles(base64, file.type, apiKey);
            
            onSaveResult({
              type: 'sub-generator',
              title: `Generated Subtitles: ${file.name}`,
              content: res,
              fileName: `subtitles_${file.name}.srt`
            });
            
            setLocalProgress(0);
            resolve(res);
          } catch (err) {
            reject(err);
          }
        };

        reader.readAsDataURL(file);
      });
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={onBack}>⬅️ Back</Button>
        <h2 className="text-3xl font-bold">Sub Generator</h2>
      </div>

      <ApiKeyManager session={session} onUpdate={onUpdateSession} />

      <Card className="p-8">
        {activeTask ? (
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
            <div className="border-2 border-dashed p-10 flex flex-col items-center bg-gray-50 relative rounded-xl">
              <input type="file" accept="video/*,audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
              <span className="text-4xl mb-2">🎬</span>
              <p>{file ? file.name : "Upload media to generate subtitles"}</p>
            </div>

            {localProgress > 0 && localProgress < 100 && (
              <div className="w-full">
                <ProgressBar progress={localProgress} label="Uploading file..." />
              </div>
            )}

            <Button onClick={process} disabled={!file} className="w-full py-4">
              Generate Subtitles
            </Button>
          </div>
        )}
      </Card>

      <PersistentResults 
        results={results} 
        activeType="sub-generator" 
        onDelete={onDeleteResult}
        onCopy={onCopyResult}
        onDownload={onDownloadResult}
      />
    </div>
  );
};

export default SubGenerator;
