
import React, { useState, useMemo } from 'react';
import { UserSession, StoredResult, ProcessingTask, FeatureType } from '../types';
import { Card, Button, Input, Select, ResultBox, ProgressBar, ApiKeyManager } from '../components/Shared';
import { writeScript } from '../services/gemini';
import PersistentResults from '../components/PersistentResults';

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

const ScriptWriter: React.FC<Props> = ({ 
  onBack, session, tasks, onSaveResult, onStartTask, onUpdateSession,
  results, onDeleteResult, onCopyResult, onDownloadResult
}) => {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('creative');
  const [lang, setLang] = useState('English');
  const [result, setResult] = useState('');

  const activeTask = useMemo(() => 
    tasks.find(t => t.type === 'script-writer' && t.status !== 'completed' && t.status !== 'failed'),
  [tasks]);

  const handleGenerate = async () => {
    if (!topic || activeTask) return;
    const apiKey = session.useCustomKey ? session.customApiKey : undefined;
    
    onStartTask('script-writer', `Writing Script: ${topic}`, async () => {
      const res = await writeScript(topic, tone, lang, apiKey);
      setResult(res);
      onSaveResult({
        type: 'script-writer',
        title: `AI Script: ${topic}`,
        content: res,
        fileName: `script_${topic.substring(0, 15)}.txt`
      });
      return res;
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={onBack}>⬅️ Back</Button>
        <h2 className="text-3xl font-bold text-gray-900">AI Script Writer</h2>
      </div>

      <ApiKeyManager session={session} onUpdate={onUpdateSession} />

      <Card className="p-8">
        {activeTask ? (
          <div className="flex flex-col items-center py-12 gap-6">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">AI is Drafting...</h3>
              <p className="text-gray-500">Composing scenes and dialogue in the background.</p>
            </div>
            <div className="w-full max-w-md">
              <ProgressBar progress={activeTask.progress} label={activeTask.status} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="md:col-span-2">
              <Input label="Script Topic" value={topic} onChange={setTopic} placeholder="e.g. A journey through the hidden temples of Bagan" />
            </div>
            <Select 
              label="Tone" 
              value={tone} 
              onChange={setTone} 
              options={[
                { label: 'Creative', value: 'creative' },
                { label: 'Formal', value: 'formal' },
                { label: 'Educational', value: 'educational' },
                { label: 'Funny', value: 'funny' },
                { label: 'Professional', value: 'professional' },
              ]} 
            />
            <Select 
              label="Language" 
              value={lang} 
              onChange={setLang} 
              options={LANGUAGES} 
            />
            <div className="md:col-span-2">
              <Button onClick={handleGenerate} disabled={!topic} className="w-full py-4">
                Generate Full Script
              </Button>
            </div>
          </div>
        )}
        <ResultBox 
          title="Generated Script" 
          content={result} 
          onCopy={() => onCopyResult(result)}
        />
      </Card>

      <PersistentResults 
        results={results} 
        activeType="script-writer" 
        onDelete={onDeleteResult}
        onCopy={onCopyResult}
        onDownload={onDownloadResult}
      />
    </div>
  );
};

export default ScriptWriter;
