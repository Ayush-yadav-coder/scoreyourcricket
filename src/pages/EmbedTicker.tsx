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

const EmbedTicker: React.FC = () => {
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get('match');
  const theme = searchParams.get('theme') || 'dark';
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

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [matchId]);

  const fetchMatch = async (id: string) => {
    setLoading(true);

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

  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-gray-900' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const mutedColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';

  if (loading) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className={`min-h-screen ${bgColor} ${textColor} flex items-center justify-center`}>
        <p>Match not found</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgColor} ${textColor} p-4`}>
      <div className={`border ${borderColor} rounded-lg overflow-hidden`}>
        {/* Header */}
        <div className={`px-4 py-2 border-b ${borderColor} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            {match.status === 'live' && (
              <Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" />
            )}
            <span className="text-xs font-medium uppercase tracking-wide">
              {match.status === 'live' ? 'LIVE' : match.status.toUpperCase()}
            </span>
          </div>
          <span className={`text-xs ${mutedColor}`}>Powered by Cric Score</span>
        </div>

        {/* Scores */}
        <div className="p-4">
          <div className="space-y-3">
            {/* Team 1 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center font-bold text-sm`}>
                  {match.team1_name.charAt(0)}
                </div>
                <span className="font-medium">{match.team1_name}</span>
                {match.current_batting === match.team1_name && match.status === 'live' && (
                  <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-500 rounded">BAT</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-xl font-bold">{match.team1_score}/{match.team1_wickets}</span>
                <span className={`text-sm ${mutedColor} ml-2`}>({match.team1_overs} ov)</span>
              </div>
            </div>

            {/* Team 2 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center font-bold text-sm`}>
                  {match.team2_name.charAt(0)}
                </div>
                <span className="font-medium">{match.team2_name}</span>
                {match.current_batting === match.team2_name && match.status === 'live' && (
                  <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-500 rounded">BAT</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-xl font-bold">{match.team2_score}/{match.team2_wickets}</span>
                <span className={`text-sm ${mutedColor} ml-2`}>({match.team2_overs} ov)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmbedTicker;
