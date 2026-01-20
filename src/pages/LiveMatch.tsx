import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Circle, Trophy, Target, Zap, Info, Download, BarChart2, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WagonWheel from '@/components/match/WagonWheel';
import FallOfWickets from '@/components/match/FallOfWickets';
import MatchAwards from '@/components/match/MatchAwards';
import PartnershipAnalysis from '@/components/match/PartnershipAnalysis';
import OverByOverGraph from '@/components/match/OverByOverGraph';
import DetailedScorecard from '@/components/match/DetailedScorecard';
import HeadToHead from '@/components/match/HeadToHead';
import ScorecardExport from '@/components/match/ScorecardExport';
import AdvancedMatchStats from '@/components/match/AdvancedMatchStats';
import MomentumGraph from '@/components/match/MomentumGraph';
import EmbedCodeGenerator from '@/components/embed/EmbedCodeGenerator';
import EnhancedRunRateGraph from '@/components/match/EnhancedRunRateGraph';
import MatchMVP from '@/components/match/MatchMVP';
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
  batting_position: number;
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

interface Match {
  id: string;
  match_type: string;
  overs: number | null;
  status: string;
  team1_id: string;
  team2_id: string;
  toss_winner_id: string | null;
  toss_decision: string | null;
  is_live_streaming: boolean | null;
  stream_url: string | null;
}

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface WicketData {
  wicket_number: number;
  batsman_name: string;
  runs: number;
  score_at_wicket: number;
  overs_at_wicket: number;
  dismissal_type: string;
  bowler_name?: string;
}

interface ShotData {
  x: number;
  y: number;
  runs: number;
  is_boundary: boolean;
  is_six: boolean;
}

interface PlayerPerformance {
  player_id: string;
  player_name: string;
  avatar_url?: string | null;
  performance_type: 'batting' | 'bowling' | 'fielding';
  runs?: number;
  balls_faced?: number;
  fours?: number;
  sixes?: number;
  wickets?: number;
  overs?: number;
  runs_conceded?: number;
  catches?: number;
  strike_rate?: number;
  economy?: number;
}

const LiveMatch = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'scorecard';
  const { user } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<{ team1: Team | null; team2: Team | null }>({ team1: null, team2: null });
  const [currentInnings, setCurrentInnings] = useState<Innings | null>(null);
  const [allInnings, setAllInnings] = useState<Innings[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [allDeliveries, setAllDeliveries] = useState<Delivery[]>([]);
  const [battingScores, setBattingScores] = useState<BattingScore[]>([]);
  const [bowlingScores, setBowlingScores] = useState<BowlingScore[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [previousScore, setPreviousScore] = useState<number>(0);
  const [previousWickets, setPreviousWickets] = useState<number>(0);
  const [selectedBatsmanForWheel, setSelectedBatsmanForWheel] = useState<string | null>(null);

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
                if (newInnings.total_wickets > previousWickets) {
                  toast.error('WICKET! 🏏', {
                    description: `${teams.team1?.name || 'Batting team'} loses a wicket!`,
                    duration: 5000,
                  });
                }
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
            // Refresh all data when innings updates
            fetchMatchData();
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
          setAllDeliveries(prev => [newDelivery, ...prev]);
          
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
            fetchMatchData(); // Refresh to get final stats
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

      // Fetch all innings
      const { data: inningsData } = await supabase
        .from('innings')
        .select('*')
        .eq('match_id', matchId)
        .order('innings_number', { ascending: true });

      if (inningsData && inningsData.length > 0) {
        setAllInnings(inningsData);
        const current = inningsData.find(i => !i.is_completed) || inningsData[inningsData.length - 1];
        setCurrentInnings(current);
        setPreviousScore(current.total_runs);
        setPreviousWickets(current.total_wickets);

        // Fetch all deliveries for all innings
        const inningsIds = inningsData.map(i => i.id);
        const { data: deliveriesData } = await supabase
          .from('deliveries')
          .select('*')
          .in('innings_id', inningsIds)
          .order('created_at', { ascending: false });

        if (deliveriesData) {
          setAllDeliveries(deliveriesData);
          setDeliveries(deliveriesData.slice(0, 30));
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

        // Fetch profiles for all players
        const playerIds = new Set<string>();
        deliveriesData?.forEach(d => {
          playerIds.add(d.batsman_id);
          playerIds.add(d.bowler_id);
        });
        battingData?.forEach(b => {
          playerIds.add(b.batsman_id);
          if (b.bowler_id) playerIds.add(b.bowler_id);
        });
        bowlingData?.forEach(b => playerIds.add(b.bowler_id));

        if (playerIds.size > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
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
      toast.error('Failed to load match data');
    } finally {
      setLoading(false);
    }
  };

  const getDeliveryDescription = (delivery: Delivery): string => {
    const overBall = `${delivery.over_number}.${delivery.ball_number}`;
    
    if (delivery.is_wicket) {
      return `${overBall} - WICKET! ${delivery.dismissal_type || 'Out'}`;
    } else if (delivery.is_six) {
      return `${overBall} - SIX! 💥`;
    } else if (delivery.is_boundary) {
      return `${overBall} - FOUR! 🏏`;
    } else if (delivery.is_wide) {
      return `${overBall} - Wide, ${delivery.runs} run(s)`;
    } else if (delivery.is_no_ball) {
      return `${overBall} - No ball, ${delivery.runs} run(s)`;
    } else {
      return `${overBall} - ${delivery.runs} run(s)`;
    }
  };

  const getBattingTeamName = () => {
    if (!currentInnings || !teams.team1 || !teams.team2) return 'Batting Team';
    return currentInnings.batting_team_id === teams.team1.id ? teams.team1.name : teams.team2.name;
  };

  const getFallOfWickets = (): WicketData[] => {
    if (!currentInnings) return [];
    
    const wicketDeliveries = allDeliveries
      .filter(d => d.innings_id === currentInnings.id && d.is_wicket)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let runningScore = 0;
    const wickets: WicketData[] = [];

    // Calculate running score for each wicket
    const sortedDeliveries = allDeliveries
      .filter(d => d.innings_id === currentInnings.id)
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

  const getWagonWheelShots = (batsmanId?: string): ShotData[] => {
    if (!currentInnings) return [];
    
    return allDeliveries
      .filter(d => 
        d.innings_id === currentInnings.id && 
        d.shot_x !== null && 
        d.shot_y !== null &&
        d.runs > 0 &&
        (!batsmanId || d.batsman_id === batsmanId)
      )
      .map(d => ({
        x: d.shot_x!,
        y: d.shot_y!,
        runs: d.runs,
        is_boundary: d.is_boundary,
        is_six: d.is_six,
      }));
  };

  const getPlayerPerformances = (): { playerOfMatch?: PlayerPerformance; bestBatsman?: PlayerPerformance; bestBowler?: PlayerPerformance; starPerformances: PlayerPerformance[] } => {
    const performances: PlayerPerformance[] = [];
    
    // Get batting performances
    battingScores.forEach(bs => {
      const profile = profiles.get(bs.batsman_id);
      if (profile && bs.runs >= 20) {
        const strikeRate = bs.balls_faced > 0 ? (bs.runs / bs.balls_faced) * 100 : 0;
        performances.push({
          player_id: bs.batsman_id,
          player_name: profile.full_name,
          avatar_url: profile.avatar_url,
          performance_type: 'batting',
          runs: bs.runs,
          balls_faced: bs.balls_faced,
          fours: bs.fours,
          sixes: bs.sixes,
          strike_rate: strikeRate,
        });
      }
    });

    // Get bowling performances
    bowlingScores.forEach(bs => {
      const profile = profiles.get(bs.bowler_id);
      if (profile && bs.wickets >= 1) {
        const economy = bs.overs > 0 ? bs.runs_conceded / bs.overs : 0;
        performances.push({
          player_id: bs.bowler_id,
          player_name: profile.full_name,
          avatar_url: profile.avatar_url,
          performance_type: 'bowling',
          wickets: bs.wickets,
          overs: bs.overs,
          runs_conceded: bs.runs_conceded,
          economy: economy,
        });
      }
    });

    // Sort and determine awards
    const sortedBatting = performances
      .filter(p => p.performance_type === 'batting')
      .sort((a, b) => (b.runs || 0) - (a.runs || 0));
    
    const sortedBowling = performances
      .filter(p => p.performance_type === 'bowling')
      .sort((a, b) => (b.wickets || 0) - (a.wickets || 0));

    const bestBatsman = sortedBatting[0];
    const bestBowler = sortedBowling[0];

    // Player of match - highest impact (runs or wickets * 25)
    let playerOfMatch: PlayerPerformance | undefined;
    const allSorted = [...performances].sort((a, b) => {
      const scoreA = (a.runs || 0) + ((a.wickets || 0) * 25);
      const scoreB = (b.runs || 0) + ((b.wickets || 0) * 25);
      return scoreB - scoreA;
    });
    playerOfMatch = allSorted[0];

    // Star performances - other notable performances not getting main awards
    const starPerformances = allSorted.filter(p => 
      p !== playerOfMatch && 
      p !== bestBatsman && 
      p !== bestBowler
    ).slice(0, 4);

    return { playerOfMatch, bestBatsman, bestBowler, starPerformances };
  };

  const getUniqueBatsmen = () => {
    if (!currentInnings) return [];
    const batsmenIds = new Set(
      allDeliveries
        .filter(d => d.innings_id === currentInnings.id && d.shot_x !== null)
        .map(d => d.batsman_id)
    );
    return Array.from(batsmenIds).map(id => ({
      id,
      name: profiles.get(id)?.full_name || 'Unknown',
    }));
  };

  const getPartnerships = () => {
    if (!currentInnings) return [];
    
    // Sort deliveries by time
    const sortedDeliveries = allDeliveries
      .filter(d => d.innings_id === currentInnings.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    if (sortedDeliveries.length === 0) return [];

    const partnerships: {
      batsman1_name: string;
      batsman2_name: string;
      runs: number;
      balls: number;
      batsman1_runs: number;
      batsman2_runs: number;
      batsman1_balls: number;
      batsman2_balls: number;
      wicket_number: number;
    }[] = [];

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
      // Initialize partnership on first delivery
      if (index === 0) {
        currentPartnership.batsman1_id = delivery.batsman_id;
        currentPartnership.batsman2_id = sortedDeliveries.find(d => d.batsman_id !== delivery.batsman_id)?.batsman_id || '';
      }

      // Add to partnership
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

      // If wicket, save partnership and start new one
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
        
        // Reset for new partnership
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

    // Add current partnership if there are runs
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

  const getOverByOverData = () => {
    if (!currentInnings) return [];
    
    const deliveriesByOver = new Map<number, { runs: number; wickets: number; hasBoundary: boolean; hasSix: boolean; hasWicket: boolean }>();
    
    allDeliveries
      .filter(d => d.innings_id === currentInnings.id)
      .forEach(d => {
        const overNum = d.over_number + 1; // Make it 1-indexed for display
        const existing = deliveriesByOver.get(overNum) || { runs: 0, wickets: 0, hasBoundary: false, hasSix: false, hasWicket: false };
        existing.runs += d.runs || 0;
        if (d.is_wicket) {
          existing.wickets++;
          existing.hasWicket = true;
        }
        if (d.is_boundary) existing.hasBoundary = true;
        if (d.is_six) existing.hasSix = true;
        deliveriesByOver.set(overNum, existing);
      });

    let cumulativeRuns = 0;
    const overData: { over: number; runs: number; cumulativeRuns: number; wickets: number; isBoundary: boolean; isSix: boolean; isWicket: boolean }[] = [];
    
    const sortedOvers = Array.from(deliveriesByOver.keys()).sort((a, b) => a - b);
    sortedOvers.forEach(over => {
      const data = deliveriesByOver.get(over)!;
      cumulativeRuns += data.runs;
      overData.push({
        over,
        runs: data.runs,
        cumulativeRuns,
        wickets: data.wickets,
        isBoundary: data.hasBoundary,
        isSix: data.hasSix,
        isWicket: data.hasWicket,
      });
    });

    return overData;
  };

  const getBattingScorecard = () => {
    if (!currentInnings) return [];
    
    return battingScores
      .filter(bs => {
        // Find if this batting score belongs to current innings
        const delivery = allDeliveries.find(d => d.batsman_id === bs.batsman_id && d.innings_id === currentInnings.id);
        return delivery !== undefined || battingScores.some(b => b.batsman_id === bs.batsman_id);
      })
      .map(bs => {
        const profile = profiles.get(bs.batsman_id);
        const bowler = bs.bowler_id ? profiles.get(bs.bowler_id) : null;
        return {
          batsman_id: bs.batsman_id,
          batsman_name: profile?.full_name || 'Unknown',
          runs: bs.runs,
          balls_faced: bs.balls_faced,
          fours: bs.fours,
          sixes: bs.sixes,
          strike_rate: bs.balls_faced > 0 ? (bs.runs / bs.balls_faced) * 100 : 0,
          is_out: bs.is_out,
          dismissal_type: bs.dismissal_type,
          bowler_name: bowler?.full_name || null,
          fielder_name: null, // Would need to add fielder tracking
        };
      })
      .sort((a, b) => (b.runs || 0) - (a.runs || 0));
  };

  const getBowlingScorecard = () => {
    if (!currentInnings) return [];
    
    return bowlingScores
      .map(bs => {
        const profile = profiles.get(bs.bowler_id);
        return {
          bowler_id: bs.bowler_id,
          bowler_name: profile?.full_name || 'Unknown',
          overs: bs.overs,
          maidens: bs.maidens,
          runs_conceded: bs.runs_conceded,
          wickets: bs.wickets,
          economy: bs.overs > 0 ? bs.runs_conceded / bs.overs : 0,
        };
      })
      .sort((a, b) => b.wickets - a.wickets || a.economy - b.economy);
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

  const fallOfWickets = getFallOfWickets();
  const wagonWheelShots = getWagonWheelShots(selectedBatsmanForWheel || undefined);
  const { playerOfMatch, bestBatsman, bestBowler, starPerformances } = getPlayerPerformances();
  const uniqueBatsmen = getUniqueBatsmen();
  const partnerships = getPartnerships();
  const overByOverData = getOverByOverData();
  const battingScorecard = getBattingScorecard();
  const bowlingScorecard = getBowlingScorecard();

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

        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="info">Info & Awards</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="live">
              {match.is_live_streaming ? '🔴 Live' : 'Stream'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scorecard" className="space-y-6">
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

            {/* Fall of Wickets */}
            <FallOfWickets wickets={fallOfWickets} />

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
          </TabsContent>

          {/* Analytics Tab - Advanced Stats */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Link to Full Analytics Page */}
            <div className="flex justify-end">
              <Button onClick={() => navigate(`/match/${matchId}/analytics`)} variant="outline">
                <BarChart2 className="h-4 w-4 mr-2" />
                View Full Analytics
              </Button>
            </div>

            {currentInnings && (
              <>
                {/* Enhanced Run Rate Graph */}
                <EnhancedRunRateGraph
                  deliveries={allDeliveries
                    .filter(d => d.innings_id === currentInnings.id)
                    .map(d => ({
                      over_number: d.over_number,
                      ball_number: d.ball_number,
                      runs: d.runs,
                      is_wicket: d.is_wicket,
                      is_boundary: d.is_boundary,
                      is_six: d.is_six,
                    }))}
                  teamName={getBattingTeamName()}
                  targetScore={
                    currentInnings.innings_number > 1 
                      ? (allInnings[0]?.total_runs || 0) + 1 
                      : undefined
                  }
                  totalOvers={match.overs || 20}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Advanced Match Stats */}
                  <div>
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
                      deliveries={allDeliveries
                        .filter(d => d.innings_id === currentInnings.id)
                        .map(d => ({
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
                  </div>

                  {/* Momentum Graph */}
                  <div>
                    <MomentumGraph
                      deliveries={allDeliveries
                        .filter(d => d.innings_id === currentInnings.id)
                        .map(d => ({
                          runs: d.runs,
                          is_wicket: d.is_wicket,
                          over_number: d.over_number,
                          ball_number: d.ball_number,
                        }))}
                      team1Name={teams.team1?.name || 'Team 1'}
                      team2Name={teams.team2?.name || 'Team 2'}
                      innings1Deliveries={
                        allInnings[0] 
                          ? allDeliveries
                              .filter(d => d.innings_id === allInnings[0].id)
                              .map(d => ({
                                runs: d.runs,
                                is_wicket: d.is_wicket,
                                over_number: d.over_number,
                                ball_number: d.ball_number,
                              }))
                          : []
                      }
                      innings2Deliveries={
                        allInnings[1] 
                          ? allDeliveries
                              .filter(d => d.innings_id === allInnings[1].id)
                              .map(d => ({
                                runs: d.runs,
                                is_wicket: d.is_wicket,
                                over_number: d.over_number,
                                ball_number: d.ball_number,
                              }))
                          : []
                      }
                    />
                  </div>
                </div>
              </>
            )}

            {!currentInnings && (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center text-muted-foreground">
                  Analytics will be available once the match starts
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="info" className="space-y-6">
            {/* Match Info */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="w-5 h-5 text-primary" />
                  Match Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Match Type</p>
                    <p className="font-medium text-foreground">{match.match_type.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Overs</p>
                    <p className="font-medium text-foreground">{match.overs || 'Unlimited'}</p>
                  </div>
                  {match.toss_winner_id && (
                    <>
                      <div>
                        <p className="text-muted-foreground">Toss Winner</p>
                        <p className="font-medium text-foreground">
                          {match.toss_winner_id === teams.team1?.id ? teams.team1?.name : teams.team2?.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Elected to</p>
                        <p className="font-medium text-foreground capitalize">{match.toss_decision}</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Match MVP */}
            {matchId && (
              <MatchMVP
                matchId={matchId}
                battingScores={battingScores.map(bs => ({
                  batsman_id: bs.batsman_id,
                  runs: bs.runs,
                  balls_faced: bs.balls_faced,
                  fours: bs.fours,
                  sixes: bs.sixes,
                }))}
                bowlingScores={bowlingScores.map(bs => ({
                  bowler_id: bs.bowler_id,
                  wickets: bs.wickets,
                  runs_conceded: bs.runs_conceded,
                  overs: bs.overs,
                }))}
                playerNames={Object.fromEntries(
                  Array.from(profiles.entries()).map(([id, p]) => [id, p.full_name])
                )}
              />
            )}

            {/* Awards Section - Only for completed matches */}
            <MatchAwards
              playerOfMatch={playerOfMatch}
              bestBatsman={bestBatsman}
              bestBowler={bestBowler}
              starPerformances={starPerformances}
              matchStatus={match.status || ''}
            />

            {/* Head to Head Comparison */}
            {teams.team1 && teams.team2 && (
              <HeadToHead
                team1Id={teams.team1.id}
                team2Id={teams.team2.id}
                team1Name={teams.team1.name}
                team2Name={teams.team2.name}
              />
            )}

            {/* Scorecard Export */}
            {currentInnings && (
              <ScorecardExport
                matchData={{
                  team1Name: teams.team1?.name || 'Team 1',
                  team2Name: teams.team2?.name || 'Team 2',
                  team1Score: allInnings.find(i => i.batting_team_id === teams.team1?.id)?.total_runs || 0,
                  team1Wickets: allInnings.find(i => i.batting_team_id === teams.team1?.id)?.total_wickets || 0,
                  team1Overs: allInnings.find(i => i.batting_team_id === teams.team1?.id)?.total_overs || 0,
                  team2Score: allInnings.find(i => i.batting_team_id === teams.team2?.id)?.total_runs || 0,
                  team2Wickets: allInnings.find(i => i.batting_team_id === teams.team2?.id)?.total_wickets || 0,
                  team2Overs: allInnings.find(i => i.batting_team_id === teams.team2?.id)?.total_overs || 0,
                  matchType: match.match_type,
                  battingScorecard: battingScorecard,
                  bowlingScorecard: bowlingScorecard,
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            {/* Detailed Scorecard */}
            {currentInnings && (
              <DetailedScorecard
                battingTeamName={getBattingTeamName()}
                bowlingTeamName={currentInnings.batting_team_id === teams.team1?.id ? teams.team2?.name || 'Team 2' : teams.team1?.name || 'Team 1'}
                battingScorecard={battingScorecard}
                bowlingScorecard={bowlingScorecard}
                totalRuns={currentInnings.total_runs}
                totalWickets={currentInnings.total_wickets}
                totalOvers={currentInnings.total_overs}
              />
            )}

            {/* Partnership Analysis */}
            <PartnershipAnalysis partnerships={partnerships} />

            {/* Over-by-over Graph */}
            <OverByOverGraph overData={overByOverData} teamName={getBattingTeamName()} />

            {/* Wagon Wheel */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Wagon Wheel</CardTitle>
                {uniqueBatsmen.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge
                      variant={selectedBatsmanForWheel === null ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedBatsmanForWheel(null)}
                    >
                      All Batsmen
                    </Badge>
                    {uniqueBatsmen.map(b => (
                      <Badge
                        key={b.id}
                        variant={selectedBatsmanForWheel === b.id ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setSelectedBatsmanForWheel(b.id)}
                      >
                        {b.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {wagonWheelShots.length > 0 ? (
                  <WagonWheel 
                    shots={wagonWheelShots}
                    batsmanName={selectedBatsmanForWheel ? profiles.get(selectedBatsmanForWheel)?.full_name : undefined}
                  />
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No shot data available yet. Shot locations will appear as runs are scored.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Stream Tab */}
          <TabsContent value="live" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Circle className="w-4 h-4 fill-red-500 text-red-500 animate-pulse" />
                  Live Match Stream
                </CardTitle>
              </CardHeader>
              <CardContent>
                {match.is_live_streaming ? (
                  <div className="space-y-4">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                      {match.stream_url ? (
                        <iframe
                          src={match.stream_url}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="text-center text-white">
                          <Circle className="w-12 h-12 mx-auto mb-4 fill-red-500 text-red-500 animate-pulse" />
                          <p className="text-lg font-medium">Live Stream Active</p>
                          <p className="text-sm opacity-70 mt-2">
                            The scorer is currently live streaming this match
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <span className="font-medium">LIVE</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {teams.team1?.name} vs {teams.team2?.name}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Circle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium text-muted-foreground">No Live Stream Available</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      This match is not being streamed live at the moment
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Win Prediction */}
            {currentInnings && match && (
              <MatchPrediction
                team1Name={teams.team1?.name || 'Team 1'}
                team2Name={teams.team2?.name || 'Team 2'}
                team1Score={allInnings.find(i => i.batting_team_id === match.team1_id)?.total_runs || 0}
                team1Wickets={allInnings.find(i => i.batting_team_id === match.team1_id)?.total_wickets || 0}
                team1Overs={Number(allInnings.find(i => i.batting_team_id === match.team1_id)?.total_overs || 0)}
                team2Score={allInnings.find(i => i.batting_team_id === match.team2_id)?.total_runs || 0}
                team2Wickets={allInnings.find(i => i.batting_team_id === match.team2_id)?.total_wickets || 0}
                team2Overs={Number(allInnings.find(i => i.batting_team_id === match.team2_id)?.total_overs || 0)}
                totalOvers={match.overs || 20}
                isFirstInnings={currentInnings.innings_number === 1}
                target={currentInnings.innings_number > 1 ? (allInnings[0]?.total_runs || 0) + 1 : undefined}
              />
            )}

            {/* Embed Code Generator */}
            {matchId && <EmbedCodeGenerator matchId={matchId} />}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default LiveMatch;
