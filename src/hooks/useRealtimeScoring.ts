import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseRealtimeScoringProps {
  matchId: string | undefined;
  inningsId: string | undefined;
  onInningsUpdate: () => void;
  onBattingUpdate: () => void;
  onBowlingUpdate: () => void;
  onDeliveryInsert: () => void;
}

export const useRealtimeScoring = ({
  matchId,
  inningsId,
  onInningsUpdate,
  onBattingUpdate,
  onBowlingUpdate,
  onDeliveryInsert,
}: UseRealtimeScoringProps) => {
  useEffect(() => {
    if (!matchId || !inningsId) return;

    const channel = supabase
      .channel(`scoring-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'innings',
          filter: `id=eq.${inningsId}`,
        },
        () => {
          console.log('Innings updated via realtime');
          onInningsUpdate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batting_scores',
          filter: `innings_id=eq.${inningsId}`,
        },
        () => {
          console.log('Batting scores updated via realtime');
          onBattingUpdate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bowling_scores',
          filter: `innings_id=eq.${inningsId}`,
        },
        () => {
          console.log('Bowling scores updated via realtime');
          onBowlingUpdate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deliveries',
          filter: `innings_id=eq.${inningsId}`,
        },
        () => {
          console.log('New delivery via realtime');
          onDeliveryInsert();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, inningsId, onInningsUpdate, onBattingUpdate, onBowlingUpdate, onDeliveryInsert]);
};
