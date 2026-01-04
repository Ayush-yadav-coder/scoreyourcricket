import React, { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface MatchNotificationsProps {
  matchId?: string;
  enabled?: boolean;
}

const MatchNotifications: React.FC<MatchNotificationsProps> = ({ matchId, enabled = true }) => {
  const { user } = useAuth();
  const lastNotifiedRef = useRef<Map<string, number>>(new Map());

  const showNotification = useCallback((title: string, description: string, type: 'success' | 'error' | 'info') => {
    // Debounce notifications - don't show same notification within 5 seconds
    const key = `${title}-${description}`;
    const now = Date.now();
    const lastNotified = lastNotifiedRef.current.get(key);
    
    if (lastNotified && now - lastNotified < 5000) {
      return;
    }
    
    lastNotifiedRef.current.set(key, now);

    if (type === 'success') {
      toast.success(title, { description, duration: 5000 });
    } else if (type === 'error') {
      toast.error(title, { description, duration: 5000 });
    } else {
      toast.info(title, { description, duration: 5000 });
    }

    // Play sound if supported
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Audio('/notification.mp3').play().catch(() => {});
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!enabled || !user) return;

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Subscribe to all live matches if no specific matchId
    const filter = matchId ? `id=eq.${matchId}` : `status=eq.live`;

    // Subscribe to match status changes
    const matchChannel = supabase
      .channel('match-notifications')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter },
        async (payload) => {
          const match = payload.new as any;
          const oldMatch = payload.old as any;
          
          if (match.status === 'live' && oldMatch?.status !== 'live') {
            // Fetch team names
            const { data: teams } = await supabase
              .from('teams')
              .select('id, name')
              .in('id', [match.team1_id, match.team2_id]);
            
            const team1 = teams?.find(t => t.id === match.team1_id)?.name || 'Team 1';
            const team2 = teams?.find(t => t.id === match.team2_id)?.name || 'Team 2';
            
            showNotification('🔴 Match Started!', `${team1} vs ${team2} is now LIVE`, 'info');
          } else if (match.status === 'completed' && oldMatch?.status === 'live') {
            showNotification('🏆 Match Completed!', 'The match has ended. Check the scorecard!', 'success');
          }
        }
      )
      .subscribe();

    // Subscribe to innings updates for milestone notifications
    const inningsFilter = matchId ? `match_id=eq.${matchId}` : undefined;
    const inningsChannel = supabase
      .channel('innings-notifications')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'innings', filter: inningsFilter },
        (payload) => {
          const innings = payload.new as any;
          const oldInnings = payload.old as any;
          
          // Wicket notification
          if (innings.total_wickets > (oldInnings?.total_wickets || 0)) {
            showNotification('🏏 WICKET!', `${innings.total_runs}/${innings.total_wickets}`, 'error');
          }
          
          // Milestone notifications
          const newMilestone = Math.floor(innings.total_runs / 50) * 50;
          const oldMilestone = Math.floor((oldInnings?.total_runs || 0) / 50) * 50;
          
          if (newMilestone > oldMilestone && newMilestone >= 50) {
            showNotification(
              `🎉 ${newMilestone} RUNS!`,
              `Team reaches ${newMilestone} runs!`,
              'success'
            );
          }
          
          // Century milestone
          if (innings.total_runs >= 100 && (oldInnings?.total_runs || 0) < 100) {
            showNotification('💯 CENTURY!', 'Team crosses 100 runs!', 'success');
          }
          
          // 200 milestone
          if (innings.total_runs >= 200 && (oldInnings?.total_runs || 0) < 200) {
            showNotification('🔥 200 RUNS!', 'Team crosses 200 runs!', 'success');
          }
        }
      )
      .subscribe();

    // Subscribe to deliveries for boundary notifications
    const deliveriesChannel = supabase
      .channel('delivery-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'deliveries' },
        (payload) => {
          const delivery = payload.new as any;
          
          if (delivery.is_wicket) {
            showNotification('🏏 WICKET!', `${delivery.dismissal_type || 'Out'}!`, 'error');
          } else if (delivery.is_six) {
            showNotification('💥 SIX!', 'Maximum! Ball sails over the boundary!', 'success');
          } else if (delivery.is_boundary) {
            showNotification('🏏 FOUR!', 'Shot to the boundary!', 'success');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
      supabase.removeChannel(inningsChannel);
      supabase.removeChannel(deliveriesChannel);
    };
  }, [matchId, enabled, user, showNotification]);

  return null; // This is a headless component
};

export default MatchNotifications;
