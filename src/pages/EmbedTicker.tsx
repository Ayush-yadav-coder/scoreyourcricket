import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Circle } from 'lucide-react';

interface Match {
  id: string;
  status: string;
  team1_name: string;
  team2_name: string;
  team1_score: number;
  team1_wickets: number;
  team1_overs: number;
  team2_score: number;
  team2_wickets: number;
  team2_overs: number;
  current_batting: string;
}

const themeStyles: Record<string, { bg: string; text: string; muted: string; border: string; accent: string }> = {
  dark: {
    bg: 'bg-gray-900',
    text: 'text-white',
    muted: 'text-gray-400',
    border: 'border-gray-700',
    accent: 'bg-red-500',
  },
  light: {
    bg: 'bg-white',
    text: 'text-gray-900',
    muted: 'text-gray-500',
    border: 'border-gray-200',
    accent: 'bg-red-500',
  },
  ipl: {
    bg: 'bg-[#1e3a5f]',
    text: 'text-[#f7d046]',
    muted: 'text-blue-200',
    border: 'border-blue-400/30',
    accent: 'bg-[#f7d046]',
  },
  bcci: {
    bg: 'bg-[#0a4f9c]',
    text: 'text-white',
    muted: 'text-blue-200',
    border: 'border-blue-400/30',
    accent: 'bg-orange-500',
  },
  cricket: {
    bg: 'bg-[#1b4d3e]',
    text: 'text-white',
    muted: 'text-green-200',
    border: 'border-green-400/30',
    accent: 'bg-yellow-500',
  },
  minimal: {
    bg: 'bg-slate-50',
    text: 'text-slate-900',
    muted: 'text-slate-500',
    border: 'border-slate-200',
    accent: 'bg-slate-900',
  },
  neon: {
    bg: 'bg-[#0a0a0a]',
    text: 'text-[#39ff14]',
    muted: 'text-green-400/70',
    border: 'border-[#39ff14]/30',
    accent: 'bg-[#39ff14]',
  },
  retro: {
    bg: 'bg-[#2d1b69]',
    text: 'text-[#ff6b6b]',
    muted: 'text-pink-300',
    border: 'border-pink-500/30',
    accent: 'bg-[#ff6b6b]',
  },
};

const EmbedTicker: React.FC = () => {
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get('match');
  const theme = searchParams.get('theme') || 'dark';
  const refreshInterval = parseInt(searchParams.get('refresh') || '30') * 1000;
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (matchId) {
      fetchMatch(matchId);
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel(`embed-ticker-${matchId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'innings', filter: `match_id=eq.${matchId}` },
          () => fetchMatch(matchId)
        )
        .subscribe();

      // Also set up polling as fallback
      const pollInterval = setInterval(() => fetchMatch(matchId), refreshInterval);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(pollInterval);
      };
    }
  }, [matchId, refreshInterval]);

  const fetchMatch = async (id: string) => {
    const { data: matchData } = await supabase
      .from('matches')
      .select(`
        id,
        status,
        team1:teams!matches_team1_id_fkey(id, name),
        team2:teams!matches_team2_id_fkey(id, name)
      `)
      .eq('id', id)
      .single();

    if (matchData) {
      const { data: inningsData } = await supabase
        .from('innings')
        .select('*')
        .eq('match_id', id)
        .order('innings_number', { ascending: true });

      const team1Innings = inningsData?.find((i: any) => i.batting_team_id === (matchData as any).team1?.id);
      const team2Innings = inningsData?.find((i: any) => i.batting_team_id === (matchData as any).team2?.id);
      const currentInnings = inningsData?.find((i: any) => !i.is_completed) || inningsData?.[inningsData.length - 1];

      setMatch({
        id: matchData.id,
        status: matchData.status || 'upcoming',
        team1_name: (matchData as any).team1?.name || 'Team 1',
        team2_name: (matchData as any).team2?.name || 'Team 2',
        team1_score: team1Innings?.total_runs || 0,
        team1_wickets: team1Innings?.total_wickets || 0,
        team1_overs: team1Innings?.total_overs || 0,
        team2_score: team2Innings?.total_runs || 0,
        team2_wickets: team2Innings?.total_wickets || 0,
        team2_overs: team2Innings?.total_overs || 0,
        current_batting: currentInnings?.batting_team_id === (matchData as any).team1?.id 
          ? (matchData as any).team1?.name 
          : (matchData as any).team2?.name,
      });
    }

    setLoading(false);
  };

  const styles = themeStyles[theme] || themeStyles.dark;

  if (loading) {
    return (
      <div className={`min-h-screen ${styles.bg} flex items-center justify-center`}>
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${styles.accent}`}></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className={`min-h-screen ${styles.bg} ${styles.text} flex items-center justify-center`}>
        <p>Match not found</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${styles.bg} ${styles.text} p-4`}>
      <div className={`border ${styles.border} rounded-lg overflow-hidden`}>
        {/* Header */}
        <div className={`px-4 py-2 border-b ${styles.border} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            {match.status === 'live' && (
              <Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" />
            )}
            <span className="text-xs font-medium uppercase tracking-wide">
              {match.status === 'live' ? 'LIVE' : match.status.toUpperCase()}
            </span>
          </div>
          <span className={`text-xs ${styles.muted}`}>Powered by Cric Score</span>
        </div>

        {/* Scores */}
        <div className="p-4">
          <div className="space-y-3">
            {/* Team 1 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${styles.border} border-2 flex items-center justify-center font-bold text-sm`}>
                  {match.team1_name.charAt(0)}
                </div>
                <span className="font-medium truncate max-w-[120px]">{match.team1_name}</span>
                {match.current_batting === match.team1_name && match.status === 'live' && (
                  <span className={`text-xs px-1.5 py-0.5 ${styles.accent} text-white rounded font-medium`}>BAT</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-xl font-bold">{match.team1_score}/{match.team1_wickets}</span>
                <span className={`text-sm ${styles.muted} ml-2`}>({match.team1_overs} ov)</span>
              </div>
            </div>

            {/* Team 2 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${styles.border} border-2 flex items-center justify-center font-bold text-sm`}>
                  {match.team2_name.charAt(0)}
                </div>
                <span className="font-medium truncate max-w-[120px]">{match.team2_name}</span>
                {match.current_batting === match.team2_name && match.status === 'live' && (
                  <span className={`text-xs px-1.5 py-0.5 ${styles.accent} text-white rounded font-medium`}>BAT</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-xl font-bold">{match.team2_score}/{match.team2_wickets}</span>
                <span className={`text-sm ${styles.muted} ml-2`}>({match.team2_overs} ov)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmbedTicker;
