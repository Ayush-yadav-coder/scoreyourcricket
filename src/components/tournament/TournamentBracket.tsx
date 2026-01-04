import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Match {
  id: string;
  status: string;
  team1_id: string;
  team2_id: string;
  team1_name: string;
  team2_name: string;
  team1_score?: number;
  team2_score?: number;
  winner_id?: string;
  round: string;
}

interface TournamentBracketProps {
  tournamentId: string;
  tournamentName: string;
}

const TournamentBracket: React.FC<TournamentBracketProps> = ({ tournamentId, tournamentName }) => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBracketData();
  }, [tournamentId]);

  const fetchBracketData = async () => {
    setLoading(true);

    // Fetch matches for this tournament
    const { data: matchesData } = await supabase
      .from('matches')
      .select(`
        id,
        status,
        team1_id,
        team2_id,
        team1:teams!matches_team1_id_fkey(id, name),
        team2:teams!matches_team2_id_fkey(id, name)
      `)
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });

    if (matchesData) {
      // Fetch innings data for scores
      const matchIds = matchesData.map(m => m.id);
      const { data: inningsData } = await supabase
        .from('innings')
        .select('match_id, batting_team_id, total_runs, total_wickets')
        .in('match_id', matchIds);

      const processedMatches: Match[] = matchesData.map((match: any, index) => {
        const team1Innings = inningsData?.find(i => i.match_id === match.id && i.batting_team_id === match.team1_id);
        const team2Innings = inningsData?.find(i => i.match_id === match.id && i.batting_team_id === match.team2_id);

        // Determine round based on remaining matches
        let round = 'Qualifier';
        const totalMatches = matchesData.length;
        
        if (index === totalMatches - 1) {
          round = 'Final';
        } else if (index >= totalMatches - 3) {
          round = 'Semi Final';
        } else if (index >= totalMatches - 7) {
          round = 'Quarter Final';
        }

        // Determine winner
        let winner_id: string | undefined;
        if (match.status === 'completed' && team1Innings && team2Innings) {
          winner_id = (team1Innings.total_runs || 0) > (team2Innings.total_runs || 0)
            ? match.team1_id
            : match.team2_id;
        }

        return {
          id: match.id,
          status: match.status,
          team1_id: match.team1_id,
          team2_id: match.team2_id,
          team1_name: match.team1?.name || 'TBD',
          team2_name: match.team2?.name || 'TBD',
          team1_score: team1Innings?.total_runs,
          team2_score: team2Innings?.total_runs,
          winner_id,
          round,
        };
      });

      setMatches(processedMatches);
    }

    setLoading(false);
  };

  const getRoundMatches = (round: string) => matches.filter(m => m.round === round);

  const rounds = ['Quarter Final', 'Semi Final', 'Final'];
  const qualifiers = matches.filter(m => m.round === 'Qualifier');

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="py-8">
          <div className="h-64 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No matches scheduled yet</p>
        </CardContent>
      </Card>
    );
  }

  const MatchBox = ({ match }: { match: Match }) => (
    <div
      className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary transition-colors min-w-[180px]"
      onClick={() => navigate(`/match/${match.id}`)}
    >
      <div className="space-y-2">
        <div className={`flex items-center justify-between p-2 rounded ${
          match.winner_id === match.team1_id ? 'bg-primary/10' : 'bg-muted/50'
        }`}>
          <span className={`text-sm ${match.winner_id === match.team1_id ? 'font-bold text-primary' : ''}`}>
            {match.team1_name}
          </span>
          {match.team1_score !== undefined && (
            <span className="font-bold">{match.team1_score}</span>
          )}
        </div>
        <div className={`flex items-center justify-between p-2 rounded ${
          match.winner_id === match.team2_id ? 'bg-primary/10' : 'bg-muted/50'
        }`}>
          <span className={`text-sm ${match.winner_id === match.team2_id ? 'font-bold text-primary' : ''}`}>
            {match.team2_name}
          </span>
          {match.team2_score !== undefined && (
            <span className="font-bold">{match.team2_score}</span>
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-center">
        <Badge variant={match.status === 'live' ? 'destructive' : match.status === 'completed' ? 'secondary' : 'outline'} className="text-xs">
          {match.status === 'live' && <span className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse" />}
          {match.status.toUpperCase()}
        </Badge>
      </div>
    </div>
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Tournament Bracket - {tournamentName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex items-center gap-4 min-w-max p-4">
            {/* Qualifiers */}
            {qualifiers.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground text-center">Qualifiers</h3>
                <div className="space-y-4">
                  {qualifiers.map(match => (
                    <MatchBox key={match.id} match={match} />
                  ))}
                </div>
              </div>
            )}

            {qualifiers.length > 0 && rounds.some(r => getRoundMatches(r).length > 0) && (
              <ChevronRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />
            )}

            {/* Main Rounds */}
            {rounds.map((round, roundIndex) => {
              const roundMatches = getRoundMatches(round);
              if (roundMatches.length === 0) return null;

              return (
                <React.Fragment key={round}>
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground text-center">
                      {round}
                      {round === 'Final' && <Trophy className="w-4 h-4 inline ml-1 text-yellow-500" />}
                    </h3>
                    <div className="flex flex-col justify-center gap-8" style={{ minHeight: roundMatches.length > 1 ? `${roundMatches.length * 100}px` : 'auto' }}>
                      {roundMatches.map(match => (
                        <MatchBox key={match.id} match={match} />
                      ))}
                    </div>
                  </div>
                  {roundIndex < rounds.length - 1 && getRoundMatches(rounds[roundIndex + 1]).length > 0 && (
                    <ChevronRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                  )}
                </React.Fragment>
              );
            })}

            {/* Winner Display */}
            {matches.find(m => m.round === 'Final' && m.winner_id) && (
              <>
                <ChevronRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground text-center">Champion</h3>
                  <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-2 border-yellow-500 rounded-lg p-4 text-center min-w-[180px]">
                    <Trophy className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                    <p className="font-bold text-lg">
                      {(() => {
                        const final = matches.find(m => m.round === 'Final');
                        if (final?.winner_id === final?.team1_id) return final.team1_name;
                        if (final?.winner_id === final?.team2_id) return final.team2_name;
                        return 'TBD';
                      })()}
                    </p>
                    <Badge className="mt-2 bg-yellow-500 text-yellow-950">WINNER</Badge>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TournamentBracket;
