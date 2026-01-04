import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SeriesMatch {
  id: string;
  match_number: number;
  status: string;
  team1_id: string;
  team2_id: string;
  team1_name: string;
  team2_name: string;
  team1_score?: number;
  team2_score?: number;
  winner_id?: string;
}

interface SeriesBracketProps {
  seriesId: string;
  seriesName: string;
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  totalMatches: number;
}

const SeriesBracket: React.FC<SeriesBracketProps> = ({
  seriesId,
  seriesName,
  team1Id,
  team2Id,
  team1Name,
  team2Name,
  totalMatches
}) => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<SeriesMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [team1Wins, setTeam1Wins] = useState(0);
  const [team2Wins, setTeam2Wins] = useState(0);

  useEffect(() => {
    fetchSeriesData();
  }, [seriesId]);

  const fetchSeriesData = async () => {
    setLoading(true);

    // For now, we'll fetch matches that involve both teams
    // In a real implementation, you'd have a series_matches junction table
    const { data: matchesData } = await supabase
      .from('matches')
      .select(`
        id,
        status,
        team1_id,
        team2_id,
        created_at
      `)
      .or(`and(team1_id.eq.${team1Id},team2_id.eq.${team2Id}),and(team1_id.eq.${team2Id},team2_id.eq.${team1Id})`)
      .order('created_at', { ascending: true })
      .limit(totalMatches);

    if (matchesData) {
      // Fetch innings for scores
      const matchIds = matchesData.map(m => m.id);
      const { data: inningsData } = await supabase
        .from('innings')
        .select('match_id, batting_team_id, total_runs, total_wickets')
        .in('match_id', matchIds);

      let t1Wins = 0;
      let t2Wins = 0;

      const processedMatches: SeriesMatch[] = matchesData.map((match, index) => {
        const team1Innings = inningsData?.find(i => i.match_id === match.id && i.batting_team_id === team1Id);
        const team2Innings = inningsData?.find(i => i.match_id === match.id && i.batting_team_id === team2Id);

        let winner_id: string | undefined;
        if (match.status === 'completed' && team1Innings && team2Innings) {
          winner_id = (team1Innings.total_runs || 0) > (team2Innings.total_runs || 0) ? team1Id : team2Id;
          if (winner_id === team1Id) t1Wins++;
          else t2Wins++;
        }

        return {
          id: match.id,
          match_number: index + 1,
          status: match.status,
          team1_id: team1Id,
          team2_id: team2Id,
          team1_name: team1Name,
          team2_name: team2Name,
          team1_score: team1Innings?.total_runs,
          team2_score: team2Innings?.total_runs,
          winner_id,
        };
      });

      setMatches(processedMatches);
      setTeam1Wins(t1Wins);
      setTeam2Wins(t2Wins);
    }

    setLoading(false);
  };

  const getSeriesStatus = () => {
    const winsNeeded = Math.ceil(totalMatches / 2);
    if (team1Wins >= winsNeeded) return { winner: team1Name, status: 'completed' };
    if (team2Wins >= winsNeeded) return { winner: team2Name, status: 'completed' };
    return { winner: null, status: 'in_progress' };
  };

  const seriesStatus = getSeriesStatus();

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="py-8">
          <div className="h-48 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Series Progress - {seriesName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Series Score */}
        <div className="flex items-center justify-center gap-8 p-4 bg-muted rounded-lg">
          <div className={`text-center ${team1Wins > team2Wins ? 'text-primary' : ''}`}>
            <p className="font-medium">{team1Name}</p>
            <p className="text-4xl font-bold">{team1Wins}</p>
          </div>
          <div className="text-2xl font-bold text-muted-foreground">-</div>
          <div className={`text-center ${team2Wins > team1Wins ? 'text-primary' : ''}`}>
            <p className="font-medium">{team2Name}</p>
            <p className="text-4xl font-bold">{team2Wins}</p>
          </div>
        </div>

        {seriesStatus.winner && (
          <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 rounded-lg">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="font-bold text-primary">{seriesStatus.winner} wins the series!</span>
          </div>
        )}

        {/* Match Timeline */}
        <div className="relative">
          <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-border"></div>
          <div className="space-y-4">
            {Array.from({ length: totalMatches }).map((_, index) => {
              const match = matches[index];
              const isPlayed = match && match.status === 'completed';
              const isLive = match && match.status === 'live';

              return (
                <div
                  key={index}
                  className={`relative flex items-center gap-4 ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  {/* Match Card */}
                  <div
                    className={`flex-1 ${index % 2 === 0 ? 'text-right pr-8' : 'text-left pl-8'}`}
                  >
                    {match ? (
                      <div
                        className={`inline-block p-3 rounded-lg border cursor-pointer hover:border-primary transition-colors ${
                          isLive ? 'border-destructive bg-destructive/5' : 'border-border bg-card'
                        }`}
                        onClick={() => navigate(`/match/${match.id}`)}
                      >
                        <div className="flex items-center gap-2 justify-between mb-2">
                          <Badge variant={isLive ? 'destructive' : isPlayed ? 'secondary' : 'outline'}>
                            {isLive ? 'LIVE' : isPlayed ? 'Completed' : 'Upcoming'}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className={`flex items-center gap-2 ${index % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                            <span className={match.winner_id === team1Id ? 'font-bold text-primary' : ''}>
                              {team1Name}
                            </span>
                            {match.team1_score !== undefined && (
                              <span className="font-bold">{match.team1_score}</span>
                            )}
                            {match.winner_id === team1Id && <Trophy className="w-4 h-4 text-primary" />}
                          </div>
                          <div className={`flex items-center gap-2 ${index % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                            <span className={match.winner_id === team2Id ? 'font-bold text-primary' : ''}>
                              {team2Name}
                            </span>
                            {match.team2_score !== undefined && (
                              <span className="font-bold">{match.team2_score}</span>
                            )}
                            {match.winner_id === team2Id && <Trophy className="w-4 h-4 text-primary" />}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="inline-block p-3 rounded-lg border border-dashed border-border bg-muted/50">
                        <p className="text-sm text-muted-foreground">Match {index + 1}</p>
                        <p className="text-xs text-muted-foreground">Not scheduled</p>
                      </div>
                    )}
                  </div>

                  {/* Center Dot */}
                  <div className={`absolute left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full border-2 ${
                    isLive 
                      ? 'bg-destructive border-destructive animate-pulse' 
                      : isPlayed 
                        ? 'bg-primary border-primary' 
                        : 'bg-muted border-border'
                  }`}>
                    <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                  </div>

                  {/* Spacer for opposite side */}
                  <div className="flex-1"></div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SeriesBracket;
