
import React, { useState } from 'react';
import { UserSession, StoredResult, FeatureType } from '../types';
import { Card, Button, TextArea, ProgressBar, UsageCounter } from '../components/Shared';

interface Props {
  onBack: () => void;
  session: UserSession;
  onSaveResult: (result: Omit<StoredResult, 'id' | 'timestamp'>) => void;
  onStartTask: (type: FeatureType, title: string, runAction: (taskId: string) => Promise<any>) => void;
}

const VoiceClone: React.FC<Props> = ({ onBack, session, onSaveResult, onStartTask }) => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [textToSpeak, setTextToSpeak] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  if (session.role === 'free' && !session.user?.plan.includes('premium')) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="text-6xl mb-6">🔒</div>
        <h2 className="text-2xl font-bold mb-4">Voice Clone is Premium Feature</h2>
        <p className="text-gray-500 mb-8">Unlock voice cloning and advanced AI narration by upgrading your account.</p>
        <Button onClick={onBack}>Back to Tools</Button>
      </div>
    );
  }

  const handleProcess = async () => {
    if (!audioFile || !textToSpeak) return;
    setLoading(true);
    
    onStartTask('voice-clone', `Cloning Voice for Narration`, async () => {
       // Simulate AI Voice Cloning & Generation
       for(let i=0; i<=100; i+=10) {
         setProgress(i);
         await new Promise(r => setTimeout(r, 400));
       }
       
       const simulatedResult = `[SIMULATED AI VOICE CLONE OUTPUT]\nOriginal Voice: ${audioFile.name}\nNarrated Text: ${textToSpeak}`;
       
       onSaveResult({
         type: 'voice-clone',
         title: `Voice Clone Narration: ${textToSpeak.substring(0, 20)}...`,
         content: simulatedResult,
         fileName: `narrated_voice.txt`
       });
       
       setLoading(false);
       setProgress(0);
       return simulatedResult;
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-2">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>⬅️ Back</Button>
        <h2 className="text-3xl font-bold">Voice Clone</h2>
      </div>

      <UsageCounter 
        user={session.user} 
        limits={{ app: 10, own: 100 }} 
      />

      <Card className="p-8">
        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center bg-gray-50 relative">
            <input 
              type="file" 
              accept="audio/*" 
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)} 
              className="absolute inset-0 opacity-0 cursor-pointer" 
            />
            <span className="text-4xl mb-2">🎙️</span>
            <p className="font-bold">{audioFile ? audioFile.name : "Upload sample voice to clone"}</p>
            <p className="text-xs text-gray-400 mt-2 italic">Sample should be 30s-1min of clear speech</p>
          </div>

          <TextArea 
            label="Text to Narrate" 
            placeholder="Enter the text you want the cloned voice to speak..." 
            value={textToSpeak} 
            onChange={setTextToSpeak}
          />

          {loading && (
            <div className="space-y-2">
              <ProgressBar progress={progress} label="Cloning and synthesizing..." />
            </div>
          )}

          <Button onClick={handleProcess} disabled={!audioFile || !textToSpeak || loading} className="w-full py-4">
            {loading ? "Processing..." : "Clone Voice & Synthesize"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default VoiceClone;
