import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Circle, Trophy, Target, Zap } from 'lucide-react';

interface Delivery {
  id: string;
  over_number: number;
  ball_number: number;
  runs: number;
  is_wicket: boolean;
  is_boundary: boolean;
  is_six: boolean;
  is_wide: boolean;
  is_no_ball: boolean;
  dismissal_type: string | null;
  created_at: string;
}

interface Innings {
  id: string;
  innings_number: number;
  total_runs: number;
  total_wickets: number;
  total_overs: number;
  is_completed: boolean;
  batting_team_id: string;
  bowling_team_id: string;
}

interface Match {
  id: string;
  match_type: string;
  overs: number | null;
  status: string;
  team1_id: string;
  team2_id: string;
  toss_winner_id: string | null;
  toss_decision: string | null;
}

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
}

const LiveMatch = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<{ team1: Team | null; team2: Team | null }>({ team1: null, team2: null });
  const [currentInnings, setCurrentInnings] = useState<Innings | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [previousScore, setPreviousScore] = useState<number>(0);
  const [previousWickets, setPreviousWickets] = useState<number>(0);

  useEffect(() => {
    if (!user) {
      toast.error('Please login to watch live matches');
      navigate('/auth');
      return;
    }

    if (!matchId) {
      navigate('/');
      return;
    }

    fetchMatchData();
    
    // Set up realtime subscriptions
    const inningsChannel = supabase
      .channel(`live-innings-${matchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'innings', filter: `match_id=eq.${matchId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newInnings = payload.new as Innings;
            setCurrentInnings(prev => {
              if (prev && newInnings.id === prev.id) {
                // Check for wickets
                if (newInnings.total_wickets > previousWickets) {
                  toast.error('WICKET! 🏏', {
                    description: `${teams.team1?.name || 'Batting team'} loses a wicket!`,
                    duration: 5000,
                  });
                }
                // Check for milestones
                if (Math.floor(newInnings.total_runs / 50) > Math.floor(previousScore / 50)) {
                  const milestone = Math.floor(newInnings.total_runs / 50) * 50;
                  toast.success(`${milestone} RUNS! 🎉`, {
                    description: `${teams.team1?.name || 'Batting team'} reaches ${milestone}!`,
                    duration: 5000,
                  });
                }
                setPreviousScore(newInnings.total_runs);
                setPreviousWickets(newInnings.total_wickets);
              }
              return newInnings;
            });
          }
        }
      )
      .subscribe();

    const deliveriesChannel = supabase
      .channel(`live-deliveries-${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'deliveries' },
        (payload) => {
          const newDelivery = payload.new as Delivery;
          setDeliveries(prev => [newDelivery, ...prev].slice(0, 30));
          
          // Notify on boundaries
          if (newDelivery.is_six) {
            toast.success('SIX! 💥', {
              description: 'Maximum! Ball sails over the boundary!',
              duration: 4000,
            });
          } else if (newDelivery.is_boundary) {
            toast.success('FOUR! 🏏', {
              description: 'Brilliant shot to the boundary!',
              duration: 3000,
            });
          }
        }
      )
      .subscribe();

    const matchChannel = supabase
      .channel(`live-match-${matchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        (payload) => {
          const updatedMatch = payload.new as Match;
          setMatch(updatedMatch);
          
          if (updatedMatch.status === 'live' && match?.status !== 'live') {
            toast.info('Match is LIVE! 🔴', {
              description: 'The match has started!',
              duration: 5000,
            });
          } else if (updatedMatch.status === 'completed') {
            toast.success('Match Completed! 🏆', {
              description: 'The match has ended.',
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(inningsChannel);
      supabase.removeChannel(deliveriesChannel);
      supabase.removeChannel(matchChannel);
    };
  }, [matchId, user, navigate]);

  const fetchMatchData = async () => {
    if (!matchId) return;

    try {
      // Fetch match details
      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .maybeSingle();

      if (!matchData) {
        toast.error('Match not found');
        navigate('/');
        return;
      }

      setMatch(matchData);

      // Fetch teams
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .in('id', [matchData.team1_id, matchData.team2_id]);

      if (teamsData) {
        setTeams({
          team1: teamsData.find(t => t.id === matchData.team1_id) || null,
          team2: teamsData.find(t => t.id === matchData.team2_id) || null,
        });
      }

      // Fetch current innings
      const { data: inningsData } = await supabase
        .from('innings')
        .select('*')
        .eq('match_id', matchId)
        .eq('is_completed', false)
        .order('innings_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (inningsData) {
        setCurrentInnings(inningsData);
        setPreviousScore(inningsData.total_runs);
        setPreviousWickets(inningsData.total_wickets);

        // Fetch recent deliveries
        const { data: deliveriesData } = await supabase
          .from('deliveries')
          .select('*')
          .eq('innings_id', inningsData.id)
          .order('created_at', { ascending: false })
          .limit(30);

        if (deliveriesData) {
          setDeliveries(deliveriesData);
        }
      }
    } catch (error) {
      console.error('Error fetching match data:', error);
      toast.error('Failed to load match data');
    } finally {
      setLoading(false);
    }
  };

  const getDeliveryDescription = (delivery: Delivery): string => {
    const parts: string[] = [];
    const overBall = `${delivery.over_number}.${delivery.ball_number}`;
    
    if (delivery.is_wicket) {
      parts.push(`${overBall} - WICKET! ${delivery.dismissal_type || 'Out'}`);
    } else if (delivery.is_six) {
      parts.push(`${overBall} - SIX! 💥`);
    } else if (delivery.is_boundary) {
      parts.push(`${overBall} - FOUR! 🏏`);
    } else if (delivery.is_wide) {
      parts.push(`${overBall} - Wide, ${delivery.runs} run(s)`);
    } else if (delivery.is_no_ball) {
      parts.push(`${overBall} - No ball, ${delivery.runs} run(s)`);
    } else {
      parts.push(`${overBall} - ${delivery.runs} run(s)`);
    }
    
    return parts.join('');
  };

  const getBattingTeamName = () => {
    if (!currentInnings || !teams.team1 || !teams.team2) return 'Batting Team';
    return currentInnings.batting_team_id === teams.team1.id ? teams.team1.name : teams.team2.name;
  };

  const getBowlingTeamName = () => {
    if (!currentInnings || !teams.team1 || !teams.team2) return 'Bowling Team';
    return currentInnings.bowling_team_id === teams.team1.id ? teams.team1.name : teams.team2.name;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!match) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Match not found</h1>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Match Header */}
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">
            {teams.team1?.name || 'Team 1'} vs {teams.team2?.name || 'Team 2'}
          </h1>
          <Badge variant={match.status === 'live' ? 'destructive' : 'secondary'} className="flex items-center gap-1">
            {match.status === 'live' && <Circle className="w-2 h-2 fill-current animate-pulse" />}
            {match.status?.toUpperCase()}
          </Badge>
        </div>

        {/* Scoreboard */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="w-5 h-5 text-primary" />
              Live Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentInnings ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Batting</p>
                    <p className="text-xl font-bold text-foreground">{getBattingTeamName()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold text-primary">
                      {currentInnings.total_runs}/{currentInnings.total_wickets}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Overs: {currentInnings.total_overs}{match.overs ? `/${match.overs}` : ''}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    <span>Run Rate: {currentInnings.total_overs > 0 ? (currentInnings.total_runs / Number(currentInnings.total_overs)).toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4" />
                    <span>Innings {currentInnings.innings_number}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {match.status === 'upcoming' ? 'Match has not started yet' : 'No active innings'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Ball-by-Ball Commentary */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Ball-by-Ball Commentary</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {deliveries.length > 0 ? (
                <div className="space-y-3">
                  {deliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className={`p-3 rounded-lg border ${
                        delivery.is_wicket
                          ? 'bg-destructive/10 border-destructive/30'
                          : delivery.is_six
                          ? 'bg-primary/10 border-primary/30'
                          : delivery.is_boundary
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-muted/50 border-border'
                      }`}
                    >
                      <p className="font-medium text-foreground">
                        {getDeliveryDescription(delivery)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No deliveries yet. Commentary will appear here as the match progresses.
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default LiveMatch;
