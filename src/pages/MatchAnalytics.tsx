import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, BarChart2, TrendingUp, Target, Zap, Users, Activity } from 'lucide-react';

import EnhancedRunRateGraph from '@/components/match/EnhancedRunRateGraph';
import MomentumGraph from '@/components/match/MomentumGraph';
import AdvancedMatchStats from '@/components/match/AdvancedMatchStats';
import PartnershipAnalysis from '@/components/match/PartnershipAnalysis';
import FallOfWickets from '@/components/match/FallOfWickets';
import WagonWheel from '@/components/match/WagonWheel';
import BowlerComparison from '@/components/match/BowlerComparison';
import MatchTimeline from '@/components/match/MatchTimeline';
import MatchPrediction from '@/components/match/MatchPrediction';

interface Delivery {
  id: string;
  innings_id: string;
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
  shot_x: number | null;
  shot_y: number | null;
  batsman_id: string;
  bowler_id: string;
}

interface Team {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  full_name: string;
}

interface BattingScore {
  id: string;
  batsman_id: string;
  runs: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  is_out: boolean;
  dismissal_type: string | null;
  bowler_id: string | null;
}

interface BowlingScore {
  id: string;
  bowler_id: string;
  overs: number;
  runs_conceded: number;
  wickets: number;
  maidens: number;
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

const MatchAnalytics: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<any>(null);
  const [teams, setTeams] = useState<{ team1: Team | null; team2: Team | null }>({ team1: null, team2: null });
  const [allInnings, setAllInnings] = useState<Innings[]>([]);
  const [allDeliveries, setAllDeliveries] = useState<Delivery[]>([]);
  const [battingScores, setBattingScores] = useState<BattingScore[]>([]);
  const [bowlingScores, setBowlingScores] = useState<BowlingScore[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [selectedInnings, setSelectedInnings] = useState<number>(1);

  useEffect(() => {
    if (!user) {
      toast.error('Please login to view analytics');
      navigate('/auth');
      return;
    }
    
    if (matchId) {
      fetchMatchData();
    }
  }, [matchId, user]);

  const fetchMatchData = async () => {
    if (!matchId) return;
    setLoading(true);

    try {
      // Fetch match
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

      // Fetch innings
      const { data: inningsData } = await supabase
        .from('innings')
        .select('*')
        .eq('match_id', matchId)
        .order('innings_number', { ascending: true });

      if (inningsData) {
        setAllInnings(inningsData);
      }

      // Fetch deliveries
      const inningsIds = inningsData?.map(i => i.id) || [];
      if (inningsIds.length > 0) {
        const { data: deliveriesData } = await supabase
          .from('deliveries')
          .select('*')
          .in('innings_id', inningsIds)
          .order('created_at', { ascending: true });

        if (deliveriesData) {
          setAllDeliveries(deliveriesData);
        }

        // Fetch batting scores
        const { data: battingData } = await supabase
          .from('batting_scores')
          .select('*')
          .in('innings_id', inningsIds);

        if (battingData) {
          setBattingScores(battingData);
        }

        // Fetch bowling scores
        const { data: bowlingData } = await supabase
          .from('bowling_scores')
          .select('*')
          .in('innings_id', inningsIds);

        if (bowlingData) {
          setBowlingScores(bowlingData);
        }

        // Fetch profiles
        const playerIds = new Set<string>();
        deliveriesData?.forEach(d => {
          playerIds.add(d.batsman_id);
          playerIds.add(d.bowler_id);
        });

        if (playerIds.size > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', Array.from(playerIds));

          if (profilesData) {
            const profileMap = new Map<string, Profile>();
            profilesData.forEach(p => profileMap.set(p.id, p));
            setProfiles(profileMap);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching match data:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentInnings = () => allInnings.find(i => i.innings_number === selectedInnings);

  const getInningsDeliveries = (inningsNumber: number) => {
    const innings = allInnings.find(i => i.innings_number === inningsNumber);
    if (!innings) return [];
    return allDeliveries.filter(d => d.innings_id === innings.id);
  };

  const getFallOfWickets = () => {
    const innings = getCurrentInnings();
    if (!innings) return [];
    
    const wicketDeliveries = allDeliveries
      .filter(d => d.innings_id === innings.id && d.is_wicket)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let runningScore = 0;
    const wickets: any[] = [];
    const sortedDeliveries = allDeliveries
      .filter(d => d.innings_id === innings.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    sortedDeliveries.forEach(delivery => {
      runningScore += delivery.runs || 0;
      if (delivery.is_wicket) {
        const batsman = profiles.get(delivery.batsman_id);
        const bowler = profiles.get(delivery.bowler_id);
        const battingScore = battingScores.find(b => b.batsman_id === delivery.batsman_id && b.is_out);
        
        wickets.push({
          wicket_number: wickets.length + 1,
          batsman_name: batsman?.full_name || 'Unknown',
          runs: battingScore?.runs || 0,
          score_at_wicket: runningScore,
          overs_at_wicket: delivery.over_number + (delivery.ball_number / 10),
          dismissal_type: delivery.dismissal_type || 'Out',
          bowler_name: bowler?.full_name,
        });
      }
    });

    return wickets;
  };

  const getWagonWheelShots = () => {
    const innings = getCurrentInnings();
    if (!innings) return [];
    
    return allDeliveries
      .filter(d => d.innings_id === innings.id && d.shot_x !== null && d.shot_y !== null && d.runs > 0)
      .map(d => ({
        x: d.shot_x!,
        y: d.shot_y!,
        runs: d.runs,
        is_boundary: d.is_boundary,
        is_six: d.is_six,
      }));
  };

  const getPartnerships = () => {
    const innings = getCurrentInnings();
    if (!innings) return [];
    
    const sortedDeliveries = allDeliveries
      .filter(d => d.innings_id === innings.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    if (sortedDeliveries.length === 0) return [];

    const partnerships: any[] = [];
    let currentPartnership = {
      batsman1_id: '',
      batsman2_id: '',
      batsman1_runs: 0,
      batsman2_runs: 0,
      batsman1_balls: 0,
      batsman2_balls: 0,
      runs: 0,
      balls: 0,
    };
    let wicketCount = 0;

    sortedDeliveries.forEach((delivery, index) => {
      if (index === 0) {
        currentPartnership.batsman1_id = delivery.batsman_id;
        currentPartnership.batsman2_id = sortedDeliveries.find(d => d.batsman_id !== delivery.batsman_id)?.batsman_id || '';
      }

      if (!delivery.is_wide) {
        currentPartnership.balls++;
        if (delivery.batsman_id === currentPartnership.batsman1_id) {
          currentPartnership.batsman1_runs += delivery.runs || 0;
          currentPartnership.batsman1_balls++;
        } else {
          currentPartnership.batsman2_runs += delivery.runs || 0;
          currentPartnership.batsman2_balls++;
        }
      }
      currentPartnership.runs += delivery.runs || 0;

      if (delivery.is_wicket) {
        partnerships.push({
          batsman1_name: profiles.get(currentPartnership.batsman1_id)?.full_name || 'Unknown',
          batsman2_name: profiles.get(currentPartnership.batsman2_id)?.full_name || 'Unknown',
          runs: currentPartnership.runs,
          balls: currentPartnership.balls,
          batsman1_runs: currentPartnership.batsman1_runs,
          batsman2_runs: currentPartnership.batsman2_runs,
          batsman1_balls: currentPartnership.batsman1_balls,
          batsman2_balls: currentPartnership.batsman2_balls,
          wicket_number: wicketCount,
        });
        wicketCount++;
        
        const newBatsman = sortedDeliveries.slice(index + 1).find(d => 
          d.batsman_id !== currentPartnership.batsman1_id && 
          d.batsman_id !== currentPartnership.batsman2_id
        )?.batsman_id;
        
        const survivingBatsman = delivery.batsman_id === currentPartnership.batsman1_id 
          ? currentPartnership.batsman2_id 
          : currentPartnership.batsman1_id;
        
        currentPartnership = {
          batsman1_id: survivingBatsman,
          batsman2_id: newBatsman || '',
          batsman1_runs: 0,
          batsman2_runs: 0,
          batsman1_balls: 0,
          batsman2_balls: 0,
          runs: 0,
          balls: 0,
        };
      }
    });

    if (currentPartnership.runs > 0 || currentPartnership.balls > 0) {
      partnerships.push({
        batsman1_name: profiles.get(currentPartnership.batsman1_id)?.full_name || 'Unknown',
        batsman2_name: profiles.get(currentPartnership.batsman2_id)?.full_name || 'Unknown',
        runs: currentPartnership.runs,
        balls: currentPartnership.balls,
        batsman1_runs: currentPartnership.batsman1_runs,
        batsman2_runs: currentPartnership.batsman2_runs,
        batsman1_balls: currentPartnership.batsman1_balls,
        batsman2_balls: currentPartnership.batsman2_balls,
        wicket_number: wicketCount,
      });
    }

    return partnerships;
  };

  const getBattingTeamName = (inningsNumber: number) => {
    const innings = allInnings.find(i => i.innings_number === inningsNumber);
    if (!innings) return 'Team';
    return innings.batting_team_id === teams.team1?.id ? teams.team1?.name : teams.team2?.name;
  };

  const generateTimelineEvents = () => {
    const events: { over: number; ball: number; type: 'wicket' | 'boundary' | 'six' | 'milestone' | 'momentum' | 'review'; description: string; player?: string; runs?: number }[] = [];
    
    let cumulativeRuns = 0;
    let lastMilestone = 0;
    
    const sortedDeliveries = [...inningsDeliveries].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    sortedDeliveries.forEach(d => {
      cumulativeRuns += d.runs || 0;
      
      if (d.is_wicket) {
        events.push({
          over: d.over_number,
          ball: d.ball_number,
          type: 'wicket',
          description: `WICKET! ${d.dismissal_type || 'Out'}`,
          player: profiles.get(d.batsman_id)?.full_name,
        });
      }
      
      if (d.is_six) {
        events.push({
          over: d.over_number,
          ball: d.ball_number,
          type: 'six',
          description: 'SIX! Maximum!',
          player: profiles.get(d.batsman_id)?.full_name,
          runs: 6,
        });
      } else if (d.is_boundary) {
        events.push({
          over: d.over_number,
          ball: d.ball_number,
          type: 'boundary',
          description: 'FOUR! Boundary',
          player: profiles.get(d.batsman_id)?.full_name,
          runs: 4,
        });
      }
      
      // Check milestones
      const currentMilestone = Math.floor(cumulativeRuns / 50) * 50;
      if (currentMilestone > lastMilestone && currentMilestone >= 50) {
        events.push({
          over: d.over_number,
          ball: d.ball_number,
          type: 'milestone',
          description: `${currentMilestone} runs reached!`,
          runs: currentMilestone,
        });
        lastMilestone = currentMilestone;
      }
    });
    
    return events.sort((a, b) => (b.over * 10 + b.ball) - (a.over * 10 + a.ball)).slice(0, 50);
  };

  const getTeamBowlers = (teamId: string) => {
    // Get innings where this team was bowling
    const bowlingInnings = allInnings.filter(i => i.bowling_team_id === teamId);
    const bowlingInningsIds = bowlingInnings.map(i => i.id);
    
    return bowlingScores
      .filter(bs => {
        const delivery = allDeliveries.find(d => d.bowler_id === bs.bowler_id);
        return delivery && bowlingInningsIds.includes(delivery.innings_id);
      })
      .map(bs => ({
        name: profiles.get(bs.bowler_id)?.full_name || 'Unknown',
        overs: bs.overs,
        maidens: bs.maidens,
        runs: bs.runs_conceded,
        wickets: bs.wickets,
        economy: bs.overs > 0 ? bs.runs_conceded / bs.overs : 0,
      }));
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!match) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold">Match not found</h1>
        </div>
      </MainLayout>
    );
  }

  const currentInnings = getCurrentInnings();
  const inningsDeliveries = getInningsDeliveries(selectedInnings);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {teams.team1?.name || 'Team 1'} vs {teams.team2?.name || 'Team 2'} - Analytics
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{match.match_type?.toUpperCase()}</Badge>
              <Badge variant={match.status === 'completed' ? 'secondary' : 'destructive'}>
                {match.status?.toUpperCase()}
              </Badge>
            </div>
          </div>
          <Button onClick={() => navigate(`/match/${matchId}`)}>
            <BarChart2 className="h-4 w-4 mr-2" />
            View Match
          </Button>
        </div>

        {/* Innings Selector */}
        {allInnings.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Select Innings:</span>
            {allInnings.map(inn => (
              <Button
                key={inn.id}
                variant={selectedInnings === inn.innings_number ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedInnings(inn.innings_number)}
              >
                {getBattingTeamName(inn.innings_number)} ({inn.total_runs}/{inn.total_wickets})
              </Button>
            ))}
          </div>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="gap-1">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="runrate" className="gap-1">
              <TrendingUp className="h-4 w-4" />
              Run Rate
            </TabsTrigger>
            <TabsTrigger value="batting" className="gap-1">
              <Target className="h-4 w-4" />
              Batting
            </TabsTrigger>
            <TabsTrigger value="bowling" className="gap-1">
              <Zap className="h-4 w-4" />
              Bowling
            </TabsTrigger>
            <TabsTrigger value="momentum" className="gap-1">
              <Users className="h-4 w-4" />
              Momentum
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Advanced Stats */}
              {currentInnings && (
                <AdvancedMatchStats
                  currentInnings={{
                    total_runs: currentInnings.total_runs,
                    total_wickets: currentInnings.total_wickets,
                    total_overs: currentInnings.total_overs,
                    is_completed: currentInnings.is_completed,
                  }}
                  targetScore={
                    currentInnings.innings_number > 1 
                      ? (allInnings[0]?.total_runs || 0) + 1 
                      : undefined
                  }
                  deliveries={inningsDeliveries.map(d => ({
                    runs: d.runs,
                    is_wicket: d.is_wicket,
                    is_boundary: d.is_boundary,
                    is_six: d.is_six,
                    is_wide: d.is_wide,
                    is_no_ball: d.is_no_ball,
                    over_number: d.over_number,
                    ball_number: d.ball_number,
                  }))}
                  matchOvers={match.overs || 20}
                />
              )}

              {/* Match Prediction */}
              {match && teams.team1 && teams.team2 && (
                <MatchPrediction
                  team1Name={teams.team1.name}
                  team2Name={teams.team2.name}
                  team1Score={allInnings.find(i => i.batting_team_id === match.team1_id)?.total_runs || 0}
                  team1Wickets={allInnings.find(i => i.batting_team_id === match.team1_id)?.total_wickets || 0}
                  team1Overs={Number(allInnings.find(i => i.batting_team_id === match.team1_id)?.total_overs || 0)}
                  team2Score={allInnings.find(i => i.batting_team_id === match.team2_id)?.total_runs || 0}
                  team2Wickets={allInnings.find(i => i.batting_team_id === match.team2_id)?.total_wickets || 0}
                  team2Overs={Number(allInnings.find(i => i.batting_team_id === match.team2_id)?.total_overs || 0)}
                  totalOvers={match.overs || 20}
                  isFirstInnings={selectedInnings === 1}
                  target={selectedInnings > 1 ? (allInnings[0]?.total_runs || 0) + 1 : undefined}
                />
              )}
            </div>

            {/* Match Timeline */}
            <MatchTimeline
              events={generateTimelineEvents()}
              teamName={getBattingTeamName(selectedInnings) || undefined}
            />
          </TabsContent>

          {/* Run Rate Tab */}
          <TabsContent value="runrate" className="space-y-6 mt-6">
            <EnhancedRunRateGraph
              deliveries={inningsDeliveries.map(d => ({
                over_number: d.over_number,
                ball_number: d.ball_number,
                runs: d.runs,
                is_wicket: d.is_wicket,
                is_boundary: d.is_boundary,
                is_six: d.is_six,
              }))}
              teamName={getBattingTeamName(selectedInnings) || undefined}
              targetScore={
                selectedInnings > 1 
                  ? (allInnings[0]?.total_runs || 0) + 1 
                  : undefined
              }
              totalOvers={match.overs || 20}
            />
          </TabsContent>

          {/* Batting Tab */}
          <TabsContent value="batting" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Partnerships */}
              <PartnershipAnalysis partnerships={getPartnerships()} />

              {/* Wagon Wheel */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Wagon Wheel - Shot Placement</CardTitle>
                </CardHeader>
                <CardContent>
                  {getWagonWheelShots().length > 0 ? (
                    <WagonWheel shots={getWagonWheelShots()} />
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No shot data available
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Bowling Tab */}
          <TabsContent value="bowling" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fall of Wickets */}
              <FallOfWickets wickets={getFallOfWickets()} />

              {/* Bowler Comparison */}
              <BowlerComparison
                team1Bowlers={getTeamBowlers(teams.team1?.id || '')}
                team2Bowlers={getTeamBowlers(teams.team2?.id || '')}
                team1Name={teams.team1?.name || 'Team 1'}
                team2Name={teams.team2?.name || 'Team 2'}
              />
            </div>
          </TabsContent>

          {/* Momentum Tab */}
          <TabsContent value="momentum" className="space-y-6 mt-6">
            <MomentumGraph
              deliveries={inningsDeliveries.map(d => ({
                runs: d.runs,
                is_wicket: d.is_wicket,
                over_number: d.over_number,
                ball_number: d.ball_number,
              }))}
              team1Name={teams.team1?.name || 'Team 1'}
              team2Name={teams.team2?.name || 'Team 2'}
              innings1Deliveries={getInningsDeliveries(1).map(d => ({
                runs: d.runs,
                is_wicket: d.is_wicket,
                over_number: d.over_number,
                ball_number: d.ball_number,
              }))}
              innings2Deliveries={getInningsDeliveries(2).map(d => ({
                runs: d.runs,
                is_wicket: d.is_wicket,
                over_number: d.over_number,
                ball_number: d.ball_number,
              }))}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default MatchAnalytics;
