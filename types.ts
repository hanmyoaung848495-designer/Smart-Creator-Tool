
export type FeatureType = 
  | 'home' 
  | 'transcribe' 
  | 'translate' 
  | 'srt-translate' 
  | 'sub-generator' 
  | 'text-to-srt'
  | 'script-writer' 
  | 'teleprompter'
  | 'ai-voice'
  | 'video-generator' 
  | 'content-creator'
  | 'admin'
  | 'tutorial'
  | 'premium'
  | 'api-guide';

export type TaskStatus = 'uploading' | 'processing' | 'completed' | 'failed';

export interface ProcessingTask {
  id: string;
  type: FeatureType;
  status: TaskStatus;
  progress: number;
  title: string;
  error?: string;
  result?: any;
  timestamp: number;
}

export interface PaymentMethodData {
  id: string;
  name: string;
  details: string;
  qrImage?: string;
}

export interface ActivationRequest {
  id: string;
  userId: string;
  userEmail: string;
  code: string;
  planId: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AdminSettings {
  appLogo: string;
  welcomeMessage: string;
  marqueeText: string;
  footerText: string;
  premiumEnabled: boolean;
  usageLimits: {
    free: number;
    premium: number;
  };
  paymentMethods: PaymentMethodData[];
  activationRequests: ActivationRequest[];
  customCategories: string[];
}

export interface ActivityRecord {
  id: string;
  type: FeatureType;
  timestamp: number;
  description: string;
}

export interface StoredResult {
  id: string;
  type: FeatureType;
  timestamp: number;
  title: string;
  content: string;
  fileName?: string;
  mimeType?: string;
}

export interface UserUsage {
  appApiUsedToday: number;
  ownApiUsedToday: number;
  lastResetDate: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferredLanguage: string;
  joinedAt: number;
  history: ActivityRecord[];
  credits: number;
  plan: 'free' | 'premium' | 'premium-ultra' | 'premium-plus';
  usage: UserUsage;
}

export interface UserSession {
  role: 'free' | 'premium' | 'admin';
  useCustomKey: boolean;
  customApiKey?: string;
  user?: UserProfile;
}

export interface FeatureCardData {
  id: FeatureType;
  title: string;
  description: string;
  icon: string;
  premiumOnly?: boolean;
}

export interface SRTBlock {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

export interface Recording {
  id: string;
  url: string;
  timestamp: number;
  duration: number;
}

export interface ScriptVersion {
  id: string;
  text: string;
  timestamp: number;
}
