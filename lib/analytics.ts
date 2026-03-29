import { supabase } from './supabase';
import localforage from 'localforage';

export interface AnalyticsEvent {
  id: string;
  action: string;
  tool: string;
  timestamp: string;
  synced: boolean;
}

export const trackEvent = async (action: string, tool: string) => {
  const event: AnalyticsEvent = {
    id: crypto.randomUUID(),
    action,
    tool,
    timestamp: new Date().toISOString(),
    synced: false,
  };

  try {
    // Save locally first
    const events: AnalyticsEvent[] = (await localforage.getItem('analytics_events')) || [];
    events.push(event);
    await localforage.setItem('analytics_events', events);

    // Try to sync immediately if online
    if (navigator.onLine) {
      await syncAnalytics();
    }
  } catch (error) {
    console.error('Error tracking event:', error);
  }
};

export const syncAnalytics = async () => {
  if (!supabase || !navigator.onLine) return;

  try {
    const events: AnalyticsEvent[] = (await localforage.getItem('analytics_events')) || [];
    const unsyncedEvents = events.filter(e => !e.synced);

    if (unsyncedEvents.length === 0) return;

    // Prepare data for Supabase
    const dataToInsert = unsyncedEvents.map(e => ({
      id: e.id,
      action: e.action,
      tool: e.tool,
      timestamp: e.timestamp,
    }));

    const { error } = await supabase
      .from('analytics')
      .insert(dataToInsert);

    if (!error) {
      // Mark as synced
      const updatedEvents = events.map(e => 
        unsyncedEvents.some(ue => ue.id === e.id) ? { ...e, synced: true } : e
      );
      // Keep only unsynced events to save space, or keep all if you want history.
      // Let's just keep unsynced to save space.
      const remainingEvents = updatedEvents.filter(e => !e.synced);
      await localforage.setItem('analytics_events', remainingEvents);
    } else {
      console.error('Failed to sync analytics to Supabase:', error);
    }
  } catch (error) {
    console.error('Error syncing analytics:', error);
  }
};

// Listen for online event to trigger sync
if (typeof window !== 'undefined') {
  window.addEventListener('online', syncAnalytics);
}
