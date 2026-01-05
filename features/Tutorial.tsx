
import React, { useState } from 'react';
import { Button, Card } from '../components/Shared';

const STEPS = [
  {
    title: "Welcome to Smart Creator Tools!",
    description: "The all-in-one hub for modern content creators. Let's take a 30-second tour of how to amplify your workflow.",
    icon: "✨"
  },
  {
    title: "Transcribe & Subtitles",
    description: "Upload any video or audio file. Our AI converts speech to text instantly. You can then generate SRT files for perfect captions.",
    icon: "🎙️"
  },
  {
    title: "Translate Globally",
    description: "Take your content to international audiences. Translate text or even entire subtitle files while keeping the timing perfect.",
    icon: "🌐"
  },
  {
    title: "AI Generation",
    description: "Stuck on ideas? Use the AI Script Writer or Content Creator to generate viral hooks, blogs, and even full videos from text prompts.",
    icon: "🚀"
  },
  {
    title: "Your Workspace",
    description: "Create an account to track your activity history and save your preferences. Use your own API key for unlimited power!",
    icon: "👤"
  }
];

const Tutorial: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="text-center">
          <div className="text-6xl mb-6">{STEPS[step].icon}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{STEPS[step].title}</h2>
          <p className="text-gray-600 leading-relaxed mb-8">
            {STEPS[step].description}
          </p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 w-6 rounded-full transition-all ${i === step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onComplete} className="text-xs">Skip</Button>
              <Button onClick={next} className="min-w-[100px]">
                {step === STEPS.length - 1 ? "Get Started" : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Tutorial;
