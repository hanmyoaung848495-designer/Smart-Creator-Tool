
import React, { useState, useMemo } from 'react';
import { UserSession, StoredResult, ProcessingTask, FeatureType } from '../types';
import { Card, Button, Select, ResultBox, ProgressBar } from '../components/Shared';
import { translateSRT } from '../services/gemini';
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

const LANGUAGES = [
  { label: 'English', value: 'English' },
  { label: 'Burmese', value: 'Burmese' },
  { label: 'Thai', value: 'Thai' },
  { label: 'Korean', value: 'Korean' },
  { label: 'Japanese', value: 'Japanese' },
  { label: 'Chinese', value: 'Chinese' },
  { label: 'Spanish', value: 'Spanish' },
  { label: 'French', value: 'French' },
];

const SRTTranslate: React.FC<Props> = ({ 
  onBack, session, tasks, onSaveResult, onStartTask, onUpdateSession,
  results, onDeleteResult, onCopyResult, onDownloadResult
}) => {
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [srtContent, setSrtContent] = useState('');
  const [targetLang, setTargetLang] = useState('English');
  const [result, setResult] = useState('');

  const activeTask = useMemo(() => 
    tasks.find(t => t.type === 'srt-translate' && t.status !== 'completed' && t.status !== 'failed'),
  [tasks]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSrtFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setSrtContent(ev.target?.result as string);
      reader.readAsText(file);
    }
  };

  const handleTranslate = async () => {
    if (!srtContent || activeTask) return;
    const apiKey = session.useCustomKey ? session.customApiKey : undefined;
    
    onStartTask('srt-translate', `Translating Subtitles: ${srtFile?.name}`, async () => {
      const res = await translateSRT(srtContent, targetLang, apiKey);
      setResult(res);
      onSaveResult({
        type: 'srt-translate',
        title: `SRT Translation (${targetLang}): ${srtFile?.name}`,
        content: res,
        fileName: `translated_${targetLang}_${srtFile?.name}`
      });
      return res;
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={onBack}>⬅️ Back</Button>
        <h2 className="text-3xl font-bold text-gray-900">SRT Translate</h2>
      </div>

      <Card className="p-8">
        {activeTask ? (
          <div className="flex flex-col items-center py-12 gap-6">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Translating SRT...</h3>
              <p className="text-gray-500 italic">Maintaining timestamps precisely...</p>
            </div>
            <div className="w-full max-w-md">
              <ProgressBar progress={activeTask.progress} label={activeTask.status} />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center bg-slate-50 relative">
               <input type="file" accept=".srt" onChange={handleFile} className="absolute inset-0 opacity-0 cursor-pointer" />
               <span className="text-4xl mb-2">📄</span>
               <p className="font-semibold">{srtFile ? srtFile.name : "Click to upload .srt file"}</p>
            </div>

            <Select 
              label="Translate to" 
              value={targetLang} 
              onChange={setTargetLang} 
              options={LANGUAGES}
            />

            <Button onClick={handleTranslate} className="w-full py-3" disabled={!srtContent}>
              Translate Subtitles
            </Button>
          </div>
        )}

        <ResultBox 
          title="Translated SRT" 
          content={result} 
          onCopy={() => onCopyResult(result)}
          onDownload={() => onDownloadResult({
            id: 'temp', type: 'srt-translate', timestamp: Date.now(), 
            title: 'Download', content: result, fileName: `translated_${targetLang}.srt`
          })}
        />
      </Card>

      <PersistentResults 
        results={results} 
        activeType="srt-translate" 
        onDelete={onDeleteResult}
        onCopy={onCopyResult}
        onDownload={onDownloadResult}
      />
    </div>
  );
};

export default SRTTranslate;
