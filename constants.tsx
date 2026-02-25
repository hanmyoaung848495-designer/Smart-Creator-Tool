
import React from 'react';
import { FeatureCardData, AdminSettings } from './types';

export const FEATURES: FeatureCardData[] = [
  {
    id: 'transcribe',
    title: 'Transcribe',
    description: 'Convert audio and video speech into high-quality text.',
    icon: '🎙️'
  },
  {
    id: 'translate',
    title: 'Translate',
    description: 'Advanced AI translation supporting 100+ languages.',
    icon: '🌐'
  },
  {
    id: 'srt-translate',
    title: 'SRT Translate',
    description: 'Translate subtitle files while preserving timestamps.',
    icon: '🎞️'
  },
  {
    id: 'sub-generator',
    title: 'Sub Generator',
    description: 'Automatically generate or manually create SRT files.',
    icon: '📝'
  },
  {
    id: 'script-writer',
    title: 'AI Script Writer',
    description: 'Generate creative and professional scripts for any topic.',
    icon: '🖋️'
  },
  {
    id: 'video-generator',
    title: 'AI Video Generator',
    description: 'Bring your scripts to life with AI-generated visuals.',
    icon: '🎥'
  },
  {
    id: 'content-creator',
    title: 'AI Content Creator',
    description: 'One-click viral content for YouTube, TikTok, and Blogs.',
    icon: '🚀'
  },
  {
    id: 'text-to-srt',
    title: 'Text To SRT',
    description: 'Convert Gemini output text into downloadable SRT subtitle files.',
    icon: '📄'
  }
];

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  appLogo: 'SmartCreator',
  welcomeMessage: 'Empower your creativity with world-class AI tools.',
  marqueeText: 'သူငယ်ချင်းတို့မင်္ဂလာပါ! Contentတွေလုပ်ရတာအဆင်ပြေအောင် စမ်းထားတဲ့ Websiteလေးဖြစ်ပါတယ်။ သုံးမယ်ဆိုရင် Own Keyကိုနှိပ်ပြီး API keyထည့်သုံးလို့ရပါတယ်။ Text to SRT လေးကတော့ API keyမလိုဘဲသုံးလို့ရပါတယ်။',
  footerText: '© 2024 Smart Creator Tools. All rights reserved.',
  premiumEnabled: true,
  usageLimits: {
    free: 5,
    premium: 50
  },
  paymentMethods: [
    { id: 'visa', name: 'Visa', details: 'Bank: International Bank\nName: Smart Creator Tools\nAccount: 1234 5678 9012 3456' },
    { id: 'kpay', name: 'KPay', details: 'Number: 09876543210\nName: Mr. Jame' },
    { id: 'wave', name: 'Wave', details: 'Number: 09876543210\nName: Mr. Jame' },
    { id: 'mmqr', name: 'MMQR', details: 'Name: ST', qrImage: 'https://placehold.co/400x400?text=MMQR+Placeholder' },
    { id: 'ton', name: 'TON', details: 'Wallet: EQ...WalletAddress' },
    { id: 'usdt', name: 'USDT', details: 'Network: TRC20\nAddress: T...USDTAddress' }
  ],
  activationRequests: [],
  customCategories: ['AI', 'Marketing', 'Gaming', 'Travel', 'Food', 'Beauty', 'Technology', 'Education', 'Finance', 'Health']
};
