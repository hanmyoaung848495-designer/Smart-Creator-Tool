
import React, { useState } from 'react';
import { AdminSettings } from '../types';
import { Card, Button, Input, TextArea } from './Shared';

interface Props {
  onBack: () => void;
  settings: AdminSettings;
  onSave: (settings: AdminSettings) => void;
}

const AdminPanel: React.FC<Props> = ({ onBack, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AdminSettings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'premium' | 'categories' | 'raw'>('general');
  const [rawConfig, setRawConfig] = useState(JSON.stringify(settings, null, 2));

  const handleSave = () => {
    try {
      const settingsToSave = activeTab === 'raw' ? JSON.parse(rawConfig) : localSettings;
      onSave(settingsToSave);
      setLocalSettings(settingsToSave);
      setRawConfig(JSON.stringify(settingsToSave, null, 2));
      alert("Settings saved successfully!");
    } catch (e) {
      alert("Invalid JSON code! Please check your syntax.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>⬅️ Back</Button>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Admin Console</h2>
        </div>
        <Button onClick={handleSave} className="shadow-indigo-200">Save Configuration</Button>
      </div>

      <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
        {(['general', 'premium', 'categories', 'raw'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            {tab === 'raw' ? 'Edit in Code' : tab}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <Card className="p-10 space-y-8 animate-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Input label="Platform Identity (Logo)" value={localSettings.appLogo} onChange={(v) => setLocalSettings({...localSettings, appLogo: v})} />
            <Input label="Hero Tagline" value={localSettings.welcomeMessage} onChange={(v) => setLocalSettings({...localSettings, welcomeMessage: v})} />
            <div className="md:col-span-2">
               <TextArea label="Global Announcement (Marquee)" value={localSettings.marqueeText} onChange={(v) => setLocalSettings({...localSettings, marqueeText: v})} rows={3} />
            </div>
            <div className="md:col-span-2">
               <Input label="Footer Text" value={localSettings.footerText} onChange={(v) => setLocalSettings({...localSettings, footerText: v})} />
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'categories' && (
        <Card className="p-10 animate-in slide-in-from-bottom-2">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Content Categories</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {localSettings.customCategories.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 group">
                <span className="text-sm font-semibold text-gray-700">{cat}</span>
                <button 
                  onClick={() => setLocalSettings({...localSettings, customCategories: localSettings.customCategories.filter((_, i) => i !== idx)})}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                >✕</button>
              </div>
            ))}
            <button 
              onClick={() => {
                const name = prompt("Category Name:");
                if(name) setLocalSettings({...localSettings, customCategories: [...localSettings.customCategories, name]});
              }}
              className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-all font-bold text-sm"
            >
              + Add New
            </button>
          </div>
        </Card>
      )}

      {activeTab === 'premium' && (
        <Card className="p-10 space-y-8 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between p-6 bg-indigo-50 rounded-2xl">
            <div>
              <p className="font-bold text-indigo-900">Premium Monetization System</p>
              <p className="text-xs text-indigo-500">Enable plan comparisons and credit limits for users</p>
            </div>
            <input 
              type="checkbox" 
              checked={localSettings.premiumEnabled} 
              onChange={(e) => setLocalSettings({...localSettings, premiumEnabled: e.target.checked})}
              className="w-6 h-6 accent-indigo-600 rounded-lg cursor-pointer"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input label="Free Daily Limit" value={localSettings.usageLimits.free.toString()} onChange={(v) => setLocalSettings({...localSettings, usageLimits: {...localSettings.usageLimits, free: parseInt(v) || 0}})} />
            <Input label="Premium Daily Limit" value={localSettings.usageLimits.premium.toString()} onChange={(v) => setLocalSettings({...localSettings, usageLimits: {...localSettings.usageLimits, premium: parseInt(v) || 0}})} />
          </div>
        </Card>
      )}

      {activeTab === 'raw' && (
        <Card className="p-10 animate-in slide-in-from-bottom-2">
           <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Edit Configuration (JSON Code)</h3>
           <textarea 
             value={rawConfig} 
             onChange={(e) => setRawConfig(e.target.value)} 
             className="w-full h-[500px] font-mono text-xs p-6 bg-slate-900 text-indigo-300 rounded-2xl focus:outline-none ring-1 ring-slate-800"
             spellCheck={false}
           />
        </Card>
      )}
    </div>
  );
};

export default AdminPanel;
