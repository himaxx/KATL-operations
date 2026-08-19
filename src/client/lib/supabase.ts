import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://rjcgkmsqgzugvwxkkqfh.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqY2drbXNxZ3p1Z3Z3eGtrcWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMTYzMjYsImV4cCI6MjEwMjU5MjMyNn0.FMhsC_m76aKecCA9X4FNPj2n32tWb0G8L2hyQUKWkVg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Hook helper to subscribe to real-time work item updates for a specific staff member
 */
export function subscribeToUserWorkItems(userId: string, onChange: () => void) {
  const channel = supabase
    .channel(`realtime-work-items-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'work_items',
        filter: `assignee_user_id=eq.${userId}`,
      },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Hook helper to subscribe to all operational updates for Mandate Holder & Owner Tower
 */
export function subscribeToOperationsBroadcast(onChange: (table: string, eventType: string) => void) {
  const channel = supabase
    .channel('realtime-operations-tower')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'work_items' },
      (payload) => onChange('work_items', payload.eventType)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'help_slips' },
      (payload) => onChange('help_slips', payload.eventType)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'delegations' },
      (payload) => onChange('delegations', payload.eventType)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
