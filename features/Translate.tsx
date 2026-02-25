
import React, { useState, useMemo } from 'react';
import { UserSession, StoredResult, ProcessingTask, FeatureType } from '../types';
import { Card, Button, TextArea, Select, ResultBox, ProgressBar } from '../components/Shared';
import { translateText } from '../services/gemini';
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
  onClearResults: (type: FeatureType) => void;
  onCopyResult: (content: string) => void;
  onDownloadResult: (result: StoredResult) => void;
}

const Translate: React.FC<Props> = ({ 
  onBack, session, tasks, onSaveResult, onStartTask, onUpdateSession,
  results, onDeleteResult, onClearResults, onCopyResult, onDownloadResult
}) => {
  const [text, setText] = useState('');
  const [targetLang, setTargetLang] = useState('English');
  const [result, setResult] = useState('');

  const activeTask = useMemo(() => 
    tasks.find(t => t.type === 'translate' && t.status !== 'completed' && t.status !== 'failed'),
  [tasks]);

  const handleTranslate = async () => {
    if (!text || activeTask) return;
    
    const apiKey = session.useCustomKey ? session.customApiKey : undefined;
    
    onStartTask('translate', `Translating to ${targetLang}`, async () => {
      const res = await translateText(text, targetLang, apiKey);
      setResult(res);
      onSaveResult({
        type: 'translate',
        title: `Translation to ${targetLang}`,
        content: res,
        fileName: `translation_${targetLang}.txt`
      });
      return res;
    });
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={onBack} className="p-2">⬅️ Back</Button>
        <h2 className="text-3xl font-bold text-gray-900">Translate</h2>
      </div>

      <Card className="p-8">
        {activeTask ? (
          <div className="flex flex-col items-center py-12 gap-6">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Translation in Progress</h3>
              <p className="text-gray-500 text-sm italic">Processing in the background...</p>
            </div>
            <div className="w-full max-w-md">
              <ProgressBar progress={activeTask.progress} label={activeTask.status} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <TextArea 
              label="Input Text" 
              placeholder="Paste your text here to translate..." 
              value={text} 
              onChange={setText} 
              rows={8}
            />
            
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-grow">
                <Select 
                  label="Target Language" 
                  value={targetLang} 
                  onChange={setTargetLang} 
                  options={LANGUAGES}
                />
              </div>
              <Button 
                variant="primary" 
                onClick={handleTranslate} 
                disabled={!text}
                className="py-2.5 w-full sm:w-auto text-xs font-bold uppercase tracking-widest"
              >
                Translate Now
              </Button>
            </div>
          </div>
        )}

        <ResultBox 
          title="Translation Result" 
          content={result} 
          onCopy={() => onCopyResult(result)}
          onClear={() => setResult('')}
        />
      </Card>

      <PersistentResults 
        results={results} 
        activeType="translate" 
        onDelete={onDeleteResult}
        onClearAll={() => onClearResults('translate')}
        onCopy={onCopyResult}
        onDownload={onDownloadResult}
      />
    </div>
  );
};

export default Translate;
