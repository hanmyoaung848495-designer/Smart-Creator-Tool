import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/device';

export type ToolType = 'ai_voice' | 'transcribe';

export interface UsageLimits {
  ai_voice_guest_limit: number;
  transcribe_guest_limit: number;
  transcribe_user_limit: number;
}

const DEFAULT_LIMITS: UsageLimits = {
  ai_voice_guest_limit: 2,
  transcribe_guest_limit: 2,
  transcribe_user_limit: 3
};

export const getUsageLimits = async (): Promise<UsageLimits> => {
  if (!supabase) return DEFAULT_LIMITS;
  
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'usage_limits')
      .single();
      
    if (error || !data) return DEFAULT_LIMITS;
    return data.value as UsageLimits;
  } catch (e) {
    console.error('Error fetching limits:', e);
    return DEFAULT_LIMITS;
  }
};

export const updateUsageLimits = async (limits: UsageLimits): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'usage_limits', value: limits, updated_at: new Date().toISOString() });
      
    return !error;
  } catch (e) {
    console.error('Error updating limits:', e);
    return false;
  }
};

const getLocalUsage = (): Record<string, number> => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const saved = localStorage.getItem('smart_creator_local_usage');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.date === today) {
        return parsed.usage || {};
      }
    }
  } catch (e) {
    console.error('Error parsing local usage', e);
  }
  return {};
};

const saveLocalUsage = (usage: Record<string, number>) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    localStorage.setItem(
      'smart_creator_local_usage',
      JSON.stringify({ date: today, usage })
    );
  } catch (e) {
    console.error('Error saving local usage', e);
  }
};

export const checkAndIncrementUsage = async (
  toolType: ToolType, 
  userId?: string | null,
  isLink?: boolean,
  linkTranscribeExpiry?: number | null
): Promise<{ allowed: boolean; remaining: number; message?: string }> => {
  const identifier = userId || getDeviceId();
  const limits = await getUsageLimits();
  const dbToolType = (toolType === 'transcribe' && isLink) ? 'link_transcribe' : toolType;
  
  // Define limit based on user status and tool type
  let limit = 0;
  const isGuest = !userId;

  if (dbToolType === 'ai_voice') {
    if (isGuest) {
      limit = limits.ai_voice_guest_limit || 2;
    } else {
      return { allowed: true, remaining: 999 }; // Unlimited for logged in premium users
    }
  } else if (dbToolType === 'transcribe') {
    if (isGuest) {
      limit = limits.transcribe_guest_limit || 2;
    } else {
      // Standard File Transcribe for premium users
      limit = limits.transcribe_user_limit || 3;
    }
  } else if (dbToolType === 'link_transcribe') {
    if (isGuest) {
      limit = 1; // 1 time/day for Free Link Transcribe
    } else {
      // For logged in users, Link Transcribe has a specific validity
      const now = Date.now();
      const expiry = linkTranscribeExpiry ? (typeof linkTranscribeExpiry === 'number' ? linkTranscribeExpiry : new Date(linkTranscribeExpiry).getTime()) : null;
      
      if (expiry && now <= expiry) {
        limit = limits.transcribe_user_limit || 3;
      } else {
        // Expired or No validity set: Fallback to 1 / day for Link Transcribe
        limit = 1;
      }
    }
  }

  const today = new Date().toISOString().split('T')[0];

  // Local storage check for Guest/Free users (always checked first as failproof fallback)
  const localUsage = getLocalUsage();
  const localCount = isGuest ? (localUsage[dbToolType] || 0) : 0;
  if (isGuest && localCount >= limit) {
    return {
      allowed: false,
      remaining: 0,
      message: `ယနေ့အတွက် အသုံးပြုနိုင်သည့် အကြိမ်ရေ (${limit} ကြိမ်) ပြည့်သွားပါပြီ။ မနက်ဖြန်မှ ထပ်မံကြိုးစားပေးပါ။`
    };
  }

  let dbCount = 0;
  if (supabase) {
    try {
      // Check current usage in database
      const { data, error } = await supabase
        .from('tool_usage')
        .select('count')
        .eq('identifier', identifier)
        .eq('tool_type', dbToolType)
        .eq('usage_date', today)
        .single();

      if (!error && data) {
        dbCount = data.count || 0;
      }
    } catch (e) {
      console.error('Database usage check error:', e);
    }
  }

  // Combine counts securely
  const activeCount = Math.max(dbCount, localCount);

  if (activeCount >= limit) {
    // If the database has recorded more usage, sync it to local storage for guest
    if (isGuest && dbCount > localCount) {
      const newLocal = { ...localUsage, [dbToolType]: dbCount };
      saveLocalUsage(newLocal);
    }
    return { 
      allowed: false, 
      remaining: 0, 
      message: `ယနေ့အတွက် အသုံးပြုနိုင်သည့် အကြိမ်ရေ (${limit} ကြိမ်) ပြည့်သွားပါပြီ။ မနက်ဖြန်မှ ထပ်မံကြိုးစားပေးပါ။` 
    };
  }

  const nextCount = activeCount + 1;

  // Save/Increment local storage count
  if (isGuest) {
    const newLocalUsage = { ...localUsage };
    newLocalUsage[dbToolType] = localCount + 1;
    saveLocalUsage(newLocalUsage);
  }

  // Save/Increment database count
  if (supabase) {
    try {
      const { error: upsertError } = await supabase
        .from('tool_usage')
        .upsert({
          identifier,
          tool_type: dbToolType,
          usage_date: today,
          count: nextCount
        }, { onConflict: 'identifier, tool_type, usage_date' });

      if (upsertError) {
        console.error('Database count upsert error (ignored due to local fallback):', upsertError);
      }
    } catch (e) {
      console.error('Database usage increment error:', e);
    }
  }

  return { allowed: true, remaining: limit - nextCount };
};
