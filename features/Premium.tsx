
import React, { useState } from 'react';
import { AdminSettings, UserSession, UserProfile } from '../types';
import { Card, Button, Input, Select } from '../components/Shared';

interface Props {
  onBack: () => void;
  settings: AdminSettings;
  session: UserSession;
  onUpdateSettings: (settings: AdminSettings) => void;
}

const PLANS = [
  {
    id: 'premium',
    name: 'Premium',
    price: '24,000 MMK (6 USD)',
    features: [
      'App Shared API: 2 times/task/day',
      'Your Own API: 5 times/task/day',
      'Transcribe: 1 credit/task',
      'Translate: 1 credit/task',
      'SRT Translator: 5 credits/task',
      'AI Voice: 2 times/day (3 credits)',
      'Bonus: 200 Initial Credits'
    ],
    bestValue: false
  },
  {
    id: 'premium-ultra',
    name: 'Premium Ultra',
    price: '80,000 MMK (20 USD)',
    features: [
      'App Shared API: 10 times/task/day',
      'Your Own API: Unlimited',
      'Transcribe: Unlimited',
      'Translate: Unlimited',
      'SRT Translator: 5 times/day (5 credits)',
      'Bonus: 500 Initial Credits'
    ],
    bestValue: true
  },
  {
    id: 'premium-plus',
    name: 'Premium+',
    price: '40,000 MMK (10 USD)',
    features: [
      'App Shared API: 10 times/task/day',
      'Your Own API: Unlimited',
      'Transcribe: Unlimited',
      'Translate: Unlimited',
      'SRT Translator: 5 times/day (5 credits)',
      'Bonus: 500 Initial Credits'
    ],
    bestValue: true
  }
];

const Premium: React.FC<Props> = ({ onBack, settings, session, onUpdateSettings }) => {
  const [activationCode, setActivationCode] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  const handleActivate = () => {
    if (!session.user) return alert('Please sign in first.');
    const codeRegex = /^[A-Z0-9]{11}$/;
    if (!codeRegex.test(activationCode.toUpperCase())) {
      return alert('Invalid code. Must be 11 characters (A-Z, 0-9).');
    }

    const request = {
      id: Math.random().toString(36).substr(2, 9),
      userId: session.user.id,
      userEmail: session.user.email,
      code: activationCode.toUpperCase(),
      planId: 'manual',
      timestamp: Date.now(),
      status: 'pending' as const
    };

    onUpdateSettings({
      ...settings,
      activationRequests: [request, ...settings.activationRequests]
    });

    alert('Activation request sent to admin for approval.');
    setActivationCode('');
  };

  const openPayment = (plan: any) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const paymentInfo = settings.paymentMethods.find(p => p.id === selectedPaymentMethod);

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
      {/* Activation Field */}
      <Card className="p-8 border-indigo-200 bg-indigo-50/30">
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-grow">
            <Input 
              label="Activation Code" 
              placeholder="ENTER-11-CHAR" 
              value={activationCode} 
              onChange={(v) => setActivationCode(v.toUpperCase())}
            />
          </div>
          <Button onClick={handleActivate} className="min-w-[150px]">Activate Now</Button>
        </div>
        <p className="mt-3 text-xs text-indigo-500 font-bold uppercase tracking-widest">
          Code must be 11 alphanumeric characters
        </p>
      </Card>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PLANS.map((plan) => (
          <Card 
            key={plan.id} 
            className="group p-8 relative hover:ring-2 hover:ring-indigo-600 transition-all flex flex-col"
          >
            {plan.bestValue && (
              <div className="absolute top-4 right-4 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">
                Best Value
              </div>
            )}
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
            <p className="text-indigo-600 font-bold text-xl mb-6">{plan.price}</p>
            <ul className="space-y-3 mb-10 flex-grow">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-indigo-500">✓</span> {f}
                </li>
              ))}
            </ul>
            <Button onClick={() => openPayment(plan)} className="w-full">Buy Now</Button>
          </Card>
        ))}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Complete Purchase</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <p className="text-gray-500 mb-6">Plan: <span className="font-bold text-indigo-600">{selectedPlan?.name}</span></p>

            <Select 
              label="Select Payment Method" 
              value={selectedPaymentMethod} 
              onChange={setSelectedPaymentMethod} 
              options={[
                { label: 'Select Method', value: '' },
                ...settings.paymentMethods.map(p => ({ label: p.name, value: p.id }))
              ]} 
            />

            {paymentInfo && (
              <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 relative">
                  <h4 className="font-bold text-sm mb-2 text-indigo-600 uppercase tracking-widest">{paymentInfo.name} Details</h4>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{paymentInfo.details}</p>
                  <Button 
                    variant="ghost" 
                    className="absolute top-2 right-2 text-xs h-7 px-2"
                    onClick={() => {
                      navigator.clipboard.writeText(paymentInfo.details);
                      alert('Details copied!');
                    }}
                  >
                    📋 Copy
                  </Button>
                </div>
                {paymentInfo.qrImage && (
                  <div className="text-center">
                    <img src={paymentInfo.qrImage} alt="QR Code" className="w-48 h-48 mx-auto rounded-xl shadow-lg border-4 border-white" loading="lazy" />
                    <p className="text-xs text-gray-400 mt-2">Scan to Pay</p>
                  </div>
                )}
                <div className="pt-4">
                  <p className="text-xs text-center text-gray-500 italic">
                    After payment, enter your Transaction ID or Reference as an activation code above for manual approval.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      <div className="flex justify-center">
        <Button variant="ghost" onClick={onBack}>Back to Home</Button>
      </div>
    </div>
  );
};

export default Premium;
