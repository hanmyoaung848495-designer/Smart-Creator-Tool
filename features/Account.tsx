
import React, { useState } from 'react';
import { UserProfile, UserSession, ActivityRecord } from '../types';
import { Card, Button, Input, Select } from '../components/Shared';

interface Props {
  onBack: () => void;
  session: UserSession;
  onUpdateSession: (session: UserSession) => void;
}

const Account: React.FC<Props> = ({ onBack, session, onUpdateSession }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = () => {
    if (!email) return;
    const newUser: UserProfile = {
      id: Math.random().toString(36).substr(2, 9),
      name: name || email.split('@')[0],
      email: email,
      preferredLanguage: 'English',
      joinedAt: Date.now(),
      history: [],
      credits: 10, // Starter credits
      plan: 'free',
      usage: { appApiUsedToday: 0, ownApiUsedToday: 0, lastResetDate: new Date().toDateString() }
    };
    onUpdateSession({ ...session, user: newUser });
  };

  const logout = () => {
    onUpdateSession({ ...session, user: undefined });
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (session.user) {
      onUpdateSession({ ...session, user: { ...session.user, ...updates } });
    }
  };

  if (!session.user) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Join Smart Creator Tools</h2>
          <div className="space-y-4">
            <Input label="Email Address" value={email} onChange={setEmail} placeholder="you@example.com" />
            <Input label="Full Name (Optional)" value={name} onChange={setName} placeholder="John Doe" />
            <Input type="password" label="Password" value={password} onChange={setPassword} placeholder="••••••••" />
            <Button onClick={handleAuth} className="w-full py-3 mt-4">Create Account / Log In</Button>
            <Button variant="ghost" onClick={onBack} className="w-full">Cancel</Button>
          </div>
          <p className="mt-6 text-center text-xs text-gray-400">
            Accounts are stored locally in your browser for this demo.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>⬅️ Back</Button>
          <h2 className="text-3xl font-bold text-gray-900">Your Account</h2>
        </div>
        <Button variant="danger" onClick={logout} className="text-sm px-4">Log Out</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="p-6 md:col-span-1">
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-3xl font-bold text-indigo-600 mx-auto mb-4">
              {session.user.name[0].toUpperCase()}
            </div>
            <h3 className="text-xl font-bold">{session.user.name}</h3>
            <p className="text-sm text-gray-500">{session.user.email}</p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
              Plan: {session.user.plan}
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl mb-6 text-center">
             <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Credits</p>
             <p className="text-3xl font-black text-indigo-600">{session.user.credits}</p>
          </div>
          <hr className="my-6 border-gray-100" />
          <div className="space-y-4">
            <Select 
              label="Preferred Language" 
              value={session.user.preferredLanguage} 
              onChange={(v) => updateProfile({ preferredLanguage: v })} 
              options={[
                { label: 'English', value: 'English' },
                { label: 'Spanish', value: 'Spanish' },
                { label: 'French', value: 'French' }
              ]}
            />
          </div>
        </Card>

        <Card className="p-6 md:col-span-2">
          <h3 className="text-xl font-bold mb-6">Activity History</h3>
          {session.user.history.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-400 italic">No recent activity found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {session.user.history.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">
                      {record.type === 'transcribe' ? '🎙️' : 
                       record.type === 'translate' ? '🌐' : 
                       record.type === 'video-generator' ? '🎥' : '📝'}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900 capitalize text-sm">{record.type}</p>
                      <p className="text-[10px] text-gray-500 uppercase">{new Date(record.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 max-w-[150px] truncate">{record.description}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Account;
