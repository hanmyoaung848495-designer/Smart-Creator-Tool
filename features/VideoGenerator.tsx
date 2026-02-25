
import React, { useState, useMemo } from 'react';
import { UserSession, StoredResult, ProcessingTask, FeatureType } from '../types';
import { Card, Button, TextArea, Select, ProgressBar } from '../components/Shared';
import { generateVideo } from '../services/gemini';
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

const VideoGenerator: React.FC<Props> = ({ 
  onBack, session, tasks, onSaveResult, onStartTask, onUpdateSession,
  results, onDeleteResult, onCopyResult, onDownloadResult
}) => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('cinematic');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const activeTask = useMemo(() => 
    tasks.find(t => t.type === 'video-generator' && t.status !== 'completed' && t.status !== 'failed'),
  [tasks]);

  const handleGenerate = async () => {
    if (!prompt || activeTask) return;
    const apiKey = session.useCustomKey ? session.customApiKey : undefined;

    setVideoUrl(null);
    onStartTask('video-generator', `Generating Video: ${prompt.substring(0, 20)}...`, async () => {
      try {
        const url = await generateVideo(prompt, style, apiKey);
        setVideoUrl(url);
        if (url) {
          onSaveResult({
            type: 'video-generator',
            title: `Generated Video: ${prompt.substring(0, 30)}...`,
            content: `Video Link: ${url}\n\nPrompt: ${prompt}\nStyle: ${style}`,
            fileName: `video_details.txt`
          });
        }
        return url;
      } catch (err: any) {
        throw err;
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={onBack}>⬅️ Back</Button>
        <h2 className="text-3xl font-bold text-gray-900">AI Video Generator</h2>
      </div>

      <Card className="p-8">
        {activeTask ? (
          <div className="flex flex-col items-center py-12 gap-6 text-center">
             <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
             <div>
               <h3 className="text-xl font-bold text-gray-900 mb-2">Veo AI is working...</h3>
               <p className="text-gray-500 italic">Creating visuals from your prompt in the background.</p>
             </div>
             <div className="w-full max-w-md">
               <ProgressBar progress={activeTask.progress} label={activeTask.status} />
             </div>
          </div>
        ) : (
          <div className="space-y-6">
            <TextArea 
              label="Video Scene Description" 
              placeholder="e.g. A cinematic sunset over Shwedagon Pagoda with glowing lights..." 
              value={prompt} 
              onChange={setPrompt} 
            />
            <Select 
              label="Visual Style" 
              value={style} 
              onChange={setStyle} 
              options={[
                { label: 'Cinematic', value: 'cinematic' },
                { label: 'Anime', value: 'anime' },
                { label: '3D Render', value: '3d-render' },
                { label: 'Digital Art', value: 'digital-art' },
                { label: 'Realistic', value: 'realistic' },
              ]} 
            />
            <Button onClick={handleGenerate} disabled={!prompt} className="w-full py-4">
              Generate Video
            </Button>
          </div>
        )}

        {videoUrl && !activeTask && (
          <div className="mt-8 animate-in zoom-in-95 duration-700">
             <h3 className="text-lg font-bold mb-4">Your AI Video:</h3>
             <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
               <video src={videoUrl} controls className="w-full h-full" />
             </div>
             <div className="mt-4 flex justify-end">
               <a href={videoUrl} download="ai_video.mp4" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                 Download MP4
               </a>
             </div>
          </div>
        )}
      </Card>

      <PersistentResults 
        results={results} 
        activeType="video-generator" 
        onDelete={onDeleteResult}
        onCopy={onCopyResult}
        onDownload={onDownloadResult}
      />
    </div>
  );
};

export default VideoGenerator;
