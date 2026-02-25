
import React, { useState } from 'react';
import { UserSession, StoredResult, FeatureType, ProcessingTask } from '../types';
import { Card, Button, Select, ResultBox, UsageCounter } from '../components/Shared';
import { createContent } from '../services/gemini';
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
  categories: string[];
  onSaveResult: (result: Omit<StoredResult, 'id' | 'timestamp'>) => void;
  onStartTask: (type: FeatureType, title: string, runAction: (taskId: string) => Promise<any>) => void;
  onUpdateSession: (updates: Partial<UserSession>) => void;
  results: StoredResult[];
  onDeleteResult: (id: string) => void;
  onCopyResult: (content: string) => void;
  onDownloadResult: (result: StoredResult) => void;
  tasks: ProcessingTask[];
}

const ContentCreator: React.FC<Props> = ({ 
  onBack, session, categories, onSaveResult, onStartTask, onUpdateSession,
  results, onDeleteResult, onCopyResult, onDownloadResult, tasks
}) => {
  const [params, setParams] = useState({
    category: categories[0] || 'AI',
    type: 'Text Blog',
    gender: 'Male',
    platform: 'YouTube',
    lang: 'English'
  });
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const apiKey = session.useCustomKey ? session.customApiKey : undefined;

    onStartTask('content-creator', `Creating ${params.type} for ${params.platform}`, async () => {
      const res = await createContent(params, apiKey);
      onSaveResult({
        type: 'content-creator',
        title: `${params.type} for ${params.platform} (${params.category})`,
        content: res,
        fileName: `content_${params.platform.toLowerCase()}.txt`
      });
      setLoading(false);
      return res;
    });
  };

  return (
    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-2">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={onBack}>⬅️ Back</Button>
        <h2 className="text-3xl font-bold text-gray-900">AI Content Creator</h2>
      </div>

      <UsageCounter 
        user={session.user} 
        limits={{ app: 10, own: 100 }} 
      />

      <Card className="p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <Select 
            label="Category" 
            value={params.category} 
            onChange={(v) => setParams({...params, category: v})} 
            options={categories.map(c => ({ label: c, value: c }))} 
          />
          <Select label="Content Type" value={params.type} onChange={(v) => setParams({...params, type: v})} options={[
            { label: 'Text Blog', value: 'Text Blog' },
            { label: 'Video Script', value: 'Video Script' },
            { label: 'Social Post', value: 'Social Post' },
          ]} />
          <Select label="Platform" value={params.platform} onChange={(v) => setParams({...params, platform: v})} options={[
            { label: 'YouTube', value: 'YouTube' },
            { label: 'Instagram', value: 'Instagram' },
            { label: 'TikTok', value: 'TikTok' },
            { label: 'Blog', value: 'Blog' },
          ]} />
          <Select label="Language" value={params.lang} onChange={(v) => setParams({...params, lang: v})} options={LANGUAGES} />
          <Select label="Creator Perspective" value={params.gender} onChange={(v) => setParams({...params, gender: v})} options={[
            { label: 'Male', value: 'Male' },
            { label: 'Female', value: 'Female' },
            { label: 'Neutral', value: 'Neutral' },
          ]} />
        </div>
        <Button onClick={handleGenerate} disabled={loading} className="w-full py-4">
          {loading ? "Generating Content..." : "Create Viral Content"}
        </Button>
      </Card>

      <PersistentResults 
        results={results} 
        activeType="content-creator" 
        onDelete={onDeleteResult}
        onCopy={onCopyResult}
        onDownload={onDownloadResult}
      />
    </div>
  );
};

export default ContentCreator;
