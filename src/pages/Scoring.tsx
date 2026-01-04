import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Camera, Users, Clock, X, Check, FileText, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import CricketField from '@/components/scoring/CricketField';
import PlayerSelectDialog from '@/components/scoring/PlayerSelectDialog';
import DismissalDialog from '@/components/scoring/DismissalDialog';
import ExtrasDialog from '@/components/scoring/ExtrasDialog';
import BallTimeline from '@/components/scoring/BallTimeline';
import LiveStreamDialog from '@/components/scoring/LiveStreamDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRealtimeScoring } from '@/hooks/useRealtimeScoring';

interface Player {
  id: string;
  full_name: string;
}

interface TeamMember {
  player_id: string;
  profiles: Player;
}

interface BattingScore {
  id: string;
  batsman_id: string;
  runs: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  is_out: boolean;
  is_striker: boolean;
}

interface BowlingScore {
  id: string;
  bowler_id: string;
  overs: number;
  maidens: number;
  runs_conceded: number;
  wickets: number;
  wides: number;
  no_balls: number;
  is_current_bowler: boolean;
}

interface Delivery {
  id: string;
  ball_number: number;
  runs: number;
  is_wide: boolean;
  is_no_ball: boolean;
  is_bye: boolean;
  is_leg_bye: boolean;
  is_wicket: boolean;
  is_boundary: boolean;
  is_six: boolean;
}

const Scoring: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [match, setMatch] = useState<any>(null);
  const [innings, setInnings] = useState<any>(null);
  const [battingTeamPlayers, setBattingTeamPlayers] = useState<TeamMember[]>([]);
  const [bowlingTeamPlayers, setBowlingTeamPlayers] = useState<TeamMember[]>([]);
  
  const [striker, setStriker] = useState<BattingScore | null>(null);
  const [nonStriker, setNonStriker] = useState<BattingScore | null>(null);
  const [currentBowler, setCurrentBowler] = useState<BowlingScore | null>(null);
  
  const [showSelectStriker, setShowSelectStriker] = useState(false);
  const [showSelectNonStriker, setShowSelectNonStriker] = useState(false);
  const [showSelectBowler, setShowSelectBowler] = useState(false);
  const [showShotField, setShowShotField] = useState(false);
  const [pendingRuns, setPendingRuns] = useState(0);
  const [selectedShot, setSelectedShot] = useState<{ x: number; y: number } | null>(null);
  
  const [showDismissalDialog, setShowDismissalDialog] = useState(false);
  const [showExtrasDialog, setShowExtrasDialog] = useState(false);
  const [currentExtraType, setCurrentExtraType] = useState<'wide' | 'no_ball' | 'bye' | 'leg_bye'>('wide');
  
  const [ballsInOver, setBallsInOver] = useState(0);
  const [currentOver, setCurrentOver] = useState(0);
  const [savingScore, setSavingScore] = useState(false);
  
  // Track already batting players
  const [battingPlayerIds, setBattingPlayerIds] = useState<string[]>([]);
  
  // Current over deliveries for ball timeline
  const [currentOverDeliveries, setCurrentOverDeliveries] = useState<Delivery[]>([]);
  
  // Live streaming state
  const [showLiveStreamDialog, setShowLiveStreamDialog] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamTickerStyle, setStreamTickerStyle] = useState<string>('');

  const refetchInnings = useCallback(async () => {
    if (!innings?.id) return;
    const { data } = await supabase
      .from('innings')
      .select('*')
      .eq('id', innings.id)
      .single();
    if (data) {
      setInnings(data);
      setCurrentOver(Math.floor(data.total_overs));
      setBallsInOver(Math.round((data.total_overs % 1) * 10));
    }
  }, [innings?.id]);

  const refetchBatsmen = useCallback(async () => {
    if (!innings?.id) return;
    const { data: batsmen } = await supabase
      .from('batting_scores')
      .select('*')
      .eq('innings_id', innings.id)
      .eq('is_out', false)
      .limit(2);
    if (batsmen && batsmen.length >= 2) {
      const strikerData = batsmen.find(b => b.is_striker);
      const nonStrikerData = batsmen.find(b => !b.is_striker);
      setStriker(strikerData || null);
      setNonStriker(nonStrikerData || null);
    }
  }, [innings?.id]);

  const refetchBowler = useCallback(async () => {
    if (!innings?.id) return;
    const { data: bowler } = await supabase
      .from('bowling_scores')
      .select('*')
      .eq('innings_id', innings.id)
      .eq('is_current_bowler', true)
      .maybeSingle();
    if (bowler) setCurrentBowler(bowler);
  }, [innings?.id]);

  // Subscribe to realtime updates
  useRealtimeScoring({
    matchId,
    inningsId: innings?.id,
    onInningsUpdate: refetchInnings,
    onBattingUpdate: refetchBatsmen,
    onBowlingUpdate: refetchBowler,
    onDeliveryInsert: refetchInnings,
  });

  useEffect(() => {
    if (!user || !matchId) {
      navigate('/auth');
      return;
    }
    fetchMatchData();
  }, [matchId, user, navigate]);

  const fetchMatchData = async () => {
    // Fetch match
    const { data: matchData } = await supabase
      .from('matches')
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(id, name),
        team2:teams!matches_team2_id_fkey(id, name)
      `)
      .eq('id', matchId)
      .single();
    
    if (matchData) {
      setMatch(matchData);
      
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
        setInnings(inningsData);
        const overNum = Math.floor(inningsData.total_overs);
        const ballNum = Math.round((inningsData.total_overs % 1) * 10);
        setCurrentOver(overNum);
        setBallsInOver(ballNum);
        
        // Fetch team players
        await fetchTeamPlayers(inningsData.batting_team_id, inningsData.bowling_team_id);
        
        // Fetch current batsmen
        await fetchCurrentBatsmen(inningsData.id);
        
        // Fetch current bowler
        await fetchCurrentBowler(inningsData.id);
        
        // Fetch current over deliveries
        await fetchCurrentOverDeliveries(inningsData.id, overNum);
      }
    }
  };

  const fetchTeamPlayers = async (battingTeamId: string, bowlingTeamId: string) => {
    const { data: battingPlayers } = await supabase
      .from('team_members')
      .select('player_id, profiles(id, full_name)')
      .eq('team_id', battingTeamId);
    
    const { data: bowlingPlayers } = await supabase
      .from('team_members')
      .select('player_id, profiles(id, full_name)')
      .eq('team_id', bowlingTeamId);
    
    if (battingPlayers) setBattingTeamPlayers(battingPlayers as unknown as TeamMember[]);
    if (bowlingPlayers) setBowlingTeamPlayers(bowlingPlayers as unknown as TeamMember[]);
  };

  const fetchCurrentBatsmen = async (inningsId: string) => {
    // Fetch all batting scores to know who has already batted
    const { data: allBatsmen } = await supabase
      .from('batting_scores')
      .select('*')
      .eq('innings_id', inningsId);
    
    if (allBatsmen) {
      setBattingPlayerIds(allBatsmen.map(b => b.batsman_id));
      
      const notOutBatsmen = allBatsmen.filter(b => !b.is_out);
      
      if (notOutBatsmen.length >= 2) {
        const strikerData = notOutBatsmen.find(b => b.is_striker);
        const nonStrikerData = notOutBatsmen.find(b => !b.is_striker);
        setStriker(strikerData || null);
        setNonStriker(nonStrikerData || null);
      } else if (notOutBatsmen.length === 1) {
        if (notOutBatsmen[0].is_striker) {
          setStriker(notOutBatsmen[0]);
          setShowSelectNonStriker(true);
        } else {
          setNonStriker(notOutBatsmen[0]);
          setShowSelectStriker(true);
        }
      } else {
        // No batsmen yet - need to select both
        setShowSelectStriker(true);
      }
    } else {
      setShowSelectStriker(true);
    }
  };

  const fetchCurrentBowler = async (inningsId: string) => {
    const { data: bowler } = await supabase
      .from('bowling_scores')
      .select('*')
      .eq('innings_id', inningsId)
      .eq('is_current_bowler', true)
      .maybeSingle();
    
    if (bowler) {
      setCurrentBowler(bowler);
    } else {
      // Only show bowler selection if we have batsmen
      if (striker && nonStriker) {
        setShowSelectBowler(true);
      }
    }
  };

  const fetchCurrentOverDeliveries = async (inningsId: string, overNum: number) => {
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('*')
      .eq('innings_id', inningsId)
      .eq('over_number', overNum)
      .order('ball_number', { ascending: true });
    
    if (deliveries) {
      setCurrentOverDeliveries(deliveries as Delivery[]);
    }
  };

  const handleSelectStriker = async (playerId: string) => {
    if (!innings) return;
    
    setSavingScore(true);
    // Create new batting score entry
    const { data, error } = await supabase
      .from('batting_scores')
      .insert({
        innings_id: innings.id,
        batsman_id: playerId,
        is_striker: true,
        batting_position: battingPlayerIds.length + 1,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Failed to add batsman');
      setSavingScore(false);
      return;
    }
    
    setStriker(data);
    setBattingPlayerIds([...battingPlayerIds, playerId]);
    setShowSelectStriker(false);
    setSavingScore(false);
    
    // If no non-striker, show that dialog
    if (!nonStriker) {
      setShowSelectNonStriker(true);
    } else if (!currentBowler) {
      setShowSelectBowler(true);
    }
  };

  const handleSelectNonStriker = async (playerId: string) => {
    if (!innings) return;
    
    setSavingScore(true);
    const { data, error } = await supabase
      .from('batting_scores')
      .insert({
        innings_id: innings.id,
        batsman_id: playerId,
        is_striker: false,
        batting_position: battingPlayerIds.length + 1,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Failed to add batsman');
      setSavingScore(false);
      return;
    }
    
    setNonStriker(data);
    setBattingPlayerIds([...battingPlayerIds, playerId]);
    setShowSelectNonStriker(false);
    setSavingScore(false);
    
    // If no bowler, show that dialog
    if (!currentBowler) {
      setShowSelectBowler(true);
    }
  };

  const handleSelectBowler = async (playerId: string) => {
    if (!innings) return;
    
    setSavingScore(true);
    
    // Set any existing bowler as not current
    await supabase
      .from('bowling_scores')
      .update({ is_current_bowler: false })
      .eq('innings_id', innings.id)
      .eq('is_current_bowler', true);
    
    // Check if bowler already has an entry
    const { data: existingBowler } = await supabase
      .from('bowling_scores')
      .select('*')
      .eq('innings_id', innings.id)
      .eq('bowler_id', playerId)
      .maybeSingle();
    
    if (existingBowler) {
      // Update existing entry
      const { data, error } = await supabase
        .from('bowling_scores')
        .update({ is_current_bowler: true })
        .eq('id', existingBowler.id)
        .select()
        .single();
      
      if (error) {
        toast.error('Failed to select bowler');
        setSavingScore(false);
        return;
      }
      setCurrentBowler(data);
    } else {
      // Create new bowling score entry
      const { data, error } = await supabase
        .from('bowling_scores')
        .insert({
          innings_id: innings.id,
          bowler_id: playerId,
          is_current_bowler: true,
        })
        .select()
        .single();
      
      if (error) {
        toast.error('Failed to add bowler');
        setSavingScore(false);
        return;
      }
      setCurrentBowler(data);
    }
    
    setShowSelectBowler(false);
    setSavingScore(false);
    toast.success('Ready to score!');
  };

  const handleRunClick = (runs: number) => {
    if (!striker || !nonStriker || !currentBowler) {
      toast.error('Please select batsmen and bowler first');
      return;
    }
    setPendingRuns(runs);
    setShowShotField(true);
  };

  const handleShotSelect = (x: number, y: number, region: string) => {
    setSelectedShot({ x, y });
  };

  const confirmShot = async () => {
    if (!innings || !striker || !nonStriker || !currentBowler) {
      toast.error('Missing required data');
      return;
    }

    setSavingScore(true);

    try {
      const newBallNumber = ballsInOver + 1;
      const newOver = newBallNumber >= 6 ? currentOver + 1 : currentOver;
      const newBallsInOver = newBallNumber >= 6 ? 0 : newBallNumber;

      // Add delivery
      const { error: deliveryError } = await supabase.from('deliveries').insert({
        innings_id: innings.id,
        over_number: currentOver,
        ball_number: ballsInOver + 1,
        bowler_id: currentBowler.bowler_id,
        batsman_id: striker.batsman_id,
        non_striker_id: nonStriker.batsman_id,
        runs: pendingRuns,
        is_boundary: pendingRuns === 4,
        is_six: pendingRuns === 6,
        shot_x: selectedShot?.x,
        shot_y: selectedShot?.y,
      });

      if (deliveryError) {
        console.error('Delivery error:', deliveryError);
        toast.error('Failed to record delivery');
        setSavingScore(false);
        return;
      }

      // Update batsman score
      const { error: batsmanError } = await supabase
        .from('batting_scores')
        .update({
          runs: striker.runs + pendingRuns,
          balls_faced: striker.balls_faced + 1,
          fours: striker.fours + (pendingRuns === 4 ? 1 : 0),
          sixes: striker.sixes + (pendingRuns === 6 ? 1 : 0),
        })
        .eq('id', striker.id);

      if (batsmanError) {
        console.error('Batsman update error:', batsmanError);
        toast.error('Failed to update batsman score');
        setSavingScore(false);
        return;
      }

      // Update bowler score
      const newOvers = newBallNumber >= 6 
        ? currentBowler.overs + 1 
        : parseFloat((currentBowler.overs + 0.1).toFixed(1));
      
      const { error: bowlerError } = await supabase
        .from('bowling_scores')
        .update({
          overs: newOvers,
          runs_conceded: currentBowler.runs_conceded + pendingRuns,
        })
        .eq('id', currentBowler.id);

      if (bowlerError) {
        console.error('Bowler update error:', bowlerError);
        toast.error('Failed to update bowler score');
        setSavingScore(false);
        return;
      }

      // Update innings
      const newInningsOvers = newBallNumber >= 6 
        ? innings.total_overs + 1 
        : parseFloat((innings.total_overs + 0.1).toFixed(1));
      
      const { error: inningsError } = await supabase
        .from('innings')
        .update({
          total_runs: innings.total_runs + pendingRuns,
          total_overs: newInningsOvers,
        })
        .eq('id', innings.id);

      if (inningsError) {
        console.error('Innings update error:', inningsError);
        toast.error('Failed to update innings');
        setSavingScore(false);
        return;
      }

      // Swap strike if odd runs
      if (pendingRuns % 2 === 1) {
        await supabase.from('batting_scores').update({ is_striker: false }).eq('id', striker.id);
        await supabase.from('batting_scores').update({ is_striker: true }).eq('id', nonStriker.id);
        // Swap local state
        const temp = striker;
        setStriker({ ...nonStriker, is_striker: true });
        setNonStriker({ ...temp, is_striker: false });
      }

      // End of over - swap strike and change bowler
      if (newBallNumber >= 6) {
        await supabase.from('batting_scores').update({ is_striker: true }).eq('id', nonStriker.id);
        await supabase.from('batting_scores').update({ is_striker: false }).eq('id', striker.id);
        setShowSelectBowler(true);
      }

      // Update local state
      setInnings({
        ...innings,
        total_runs: innings.total_runs + pendingRuns,
        total_overs: newInningsOvers,
      });
      
      if (pendingRuns % 2 === 0) {
        setStriker({
          ...striker,
          runs: striker.runs + pendingRuns,
          balls_faced: striker.balls_faced + 1,
          fours: striker.fours + (pendingRuns === 4 ? 1 : 0),
          sixes: striker.sixes + (pendingRuns === 6 ? 1 : 0),
        });
      }
      
      setCurrentBowler({
        ...currentBowler,
        overs: newOvers,
        runs_conceded: currentBowler.runs_conceded + pendingRuns,
      });

      // Add to current over deliveries for ball timeline
      const newDelivery: Delivery = {
        id: `temp-${Date.now()}`,
        ball_number: newBallNumber,
        runs: pendingRuns,
        is_wide: false,
        is_no_ball: false,
        is_bye: false,
        is_leg_bye: false,
        is_wicket: false,
        is_boundary: pendingRuns === 4,
        is_six: pendingRuns === 6,
      };
      
      // Reset deliveries if new over, otherwise add to existing
      if (newBallNumber >= 6) {
        setCurrentOverDeliveries([]);
      } else {
        setCurrentOverDeliveries([...currentOverDeliveries, newDelivery]);
      }

      setShowShotField(false);
      setSelectedShot(null);
      setPendingRuns(0);
      setBallsInOver(newBallsInOver);
      setCurrentOver(newOver);
      
      toast.success(`${pendingRuns} run${pendingRuns !== 1 ? 's' : ''} scored!`);
    } catch (error) {
      console.error('Error in confirmShot:', error);
      toast.error('Failed to record score');
    } finally {
      setSavingScore(false);
    }
  };

  const handleWicket = async (dismissalType: string, fielderId?: string, dismissedBatsmanId?: string) => {
    if (!innings || !currentBowler) {
      toast.error('Missing required data');
      return;
    }
    
    // For run outs, we need to determine which batsman is out
    const isRunOut = dismissalType === 'run_out';
    let outBatsman = striker;
    let remainingBatsman = nonStriker;
    
    if (isRunOut && dismissedBatsmanId && nonStriker) {
      // Check if the dismissed batsman ID matches non-striker
      if (dismissedBatsmanId === nonStriker.id) {
        outBatsman = nonStriker;
        remainingBatsman = striker;
      }
    }
    
    if (!outBatsman) {
      toast.error('No batsman selected for dismissal');
      return;
    }
    
    setSavingScore(true);
    
    try {
      await supabase
        .from('batting_scores')
        .update({ 
          is_out: true, 
          dismissal_type: dismissalType as any, 
          bowler_id: currentBowler.bowler_id,
          fielder_id: fielderId || null
        })
        .eq('id', outBatsman.id);
      
      await supabase
        .from('innings')
        .update({ total_wickets: innings.total_wickets + 1 })
        .eq('id', innings.id);
      
      // Only credit bowler for wickets where they are responsible
      const bowlerGetsCreditDismissals = ['bowled', 'caught', 'lbw', 'stumped', 'hit_wicket'];
      if (bowlerGetsCreditDismissals.includes(dismissalType)) {
        await supabase
          .from('bowling_scores')
          .update({ wickets: currentBowler.wickets + 1 })
          .eq('id', currentBowler.id);
        setCurrentBowler({ ...currentBowler, wickets: currentBowler.wickets + 1 });
      }
      
      setInnings({ ...innings, total_wickets: innings.total_wickets + 1 });
      
      // Handle run out - if non-striker is out, striker remains
      if (isRunOut && outBatsman.id === nonStriker?.id) {
        setNonStriker(null);
        // Striker stays, need to select new non-striker
        setShowSelectNonStriker(true);
      } else {
        // Striker is out (or any other dismissal)
        setStriker(remainingBatsman);
        if (remainingBatsman && remainingBatsman.id !== striker?.id) {
          // Make the remaining batsman the striker
          await supabase.from('batting_scores').update({ is_striker: true }).eq('id', remainingBatsman.id);
        }
        setNonStriker(null);
        setShowSelectStriker(true);
      }
      
      setShowDismissalDialog(false);
      toast.success('Wicket!');
    } catch (error) {
      console.error('Error recording wicket:', error);
      toast.error('Failed to record wicket');
    } finally {
      setSavingScore(false);
    }
  };

  const handleExtra = async (runs: number) => {
    if (!innings || !currentBowler) {
      toast.error('Missing required data');
      return;
    }

    setSavingScore(true);
    const isLegalDelivery = currentExtraType === 'bye' || currentExtraType === 'leg_bye';

    try {
      // Update innings
      const newBallNumber = isLegalDelivery ? ballsInOver + 1 : ballsInOver;
      const newOver = newBallNumber >= 6 ? currentOver + 1 : currentOver;
      const newBallsInOver = newBallNumber >= 6 ? 0 : newBallNumber;

      const newInningsOvers = isLegalDelivery
        ? (newBallNumber >= 6 ? innings.total_overs + 1 : parseFloat((innings.total_overs + 0.1).toFixed(1)))
        : innings.total_overs;

      await supabase
        .from('innings')
        .update({
          total_runs: innings.total_runs + runs,
          extras: (innings.extras || 0) + runs,
          total_overs: newInningsOvers,
        })
        .eq('id', innings.id);

      // Update bowler
      if (currentExtraType === 'wide' || currentExtraType === 'no_ball') {
        await supabase
          .from('bowling_scores')
          .update({
            runs_conceded: currentBowler.runs_conceded + runs,
            wides: currentExtraType === 'wide' ? (currentBowler.wides || 0) + 1 : currentBowler.wides,
            no_balls: currentExtraType === 'no_ball' ? (currentBowler.no_balls || 0) + 1 : currentBowler.no_balls,
          })
          .eq('id', currentBowler.id);
      }

      setInnings({
        ...innings,
        total_runs: innings.total_runs + runs,
        extras: (innings.extras || 0) + runs,
        total_overs: newInningsOvers,
      });

      if (isLegalDelivery) {
        setBallsInOver(newBallsInOver);
        setCurrentOver(newOver);
        
        // Strike rotation for byes and leg byes when odd runs are taken
        if (striker && nonStriker && runs % 2 === 1) {
          await supabase.from('batting_scores').update({ is_striker: true }).eq('id', nonStriker.id);
          await supabase.from('batting_scores').update({ is_striker: false }).eq('id', striker.id);
          const tempStriker = striker;
          setStriker(nonStriker);
          setNonStriker(tempStriker);
        }
        
        // End of over - swap strike and change bowler
        if (newBallNumber >= 6) {
          if (striker && nonStriker) {
            await supabase.from('batting_scores').update({ is_striker: true }).eq('id', nonStriker.id);
            await supabase.from('batting_scores').update({ is_striker: false }).eq('id', striker.id);
            const tempStriker = striker;
            setStriker(nonStriker);
            setNonStriker(tempStriker);
          }
          setShowSelectBowler(true);
        }
      }

      // Add to current over deliveries for ball timeline (only for legal deliveries)
      if (isLegalDelivery) {
        const newDelivery: Delivery = {
          id: `temp-${Date.now()}`,
          ball_number: newBallNumber,
          runs: runs,
          is_wide: false,
          is_no_ball: false,
          is_bye: currentExtraType === 'bye',
          is_leg_bye: currentExtraType === 'leg_bye',
          is_wicket: false,
          is_boundary: false,
          is_six: false,
        };
        
        if (newBallNumber >= 6) {
          setCurrentOverDeliveries([]);
        } else {
          setCurrentOverDeliveries([...currentOverDeliveries, newDelivery]);
        }
      }

      setShowExtrasDialog(false);
      toast.success(`${runs} extra${runs !== 1 ? 's' : ''} added`);
    } catch (error) {
      console.error('Error recording extras:', error);
      toast.error('Failed to record extras');
    } finally {
      setSavingScore(false);
    }
  };

  const openExtrasDialog = (type: 'wide' | 'no_ball' | 'bye' | 'leg_bye') => {
    setCurrentExtraType(type);
    setShowExtrasDialog(true);
  };

  const getPlayerName = (playerId: string) => {
    const allPlayers = [...battingTeamPlayers, ...bowlingTeamPlayers];
    const player = allPlayers.find(p => p.player_id === playerId);
    return player?.profiles?.full_name || 'Unknown';
  };

  // Check if we need to show initial selection
  const needsPlayerSelection = !striker || !nonStriker || !currentBowler;

  if (!match || !innings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const battingTeam = innings.batting_team_id === match.team1?.id ? match.team1 : match.team2;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="container flex h-14 items-center justify-between px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary-foreground/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display font-bold">Live Scoring</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Match Options</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate(`/live/${matchId}`)}>
                  <FileText className="mr-2 h-4 w-4" />
                  View Full Scorecard
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="mr-2 h-4 w-4" />
                  Set Break (Tea/Lunch/Rain)
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Add Officials
                </Button>
                <Button 
                  variant="outline" 
                  className={`w-full justify-start ${isStreaming ? 'bg-red-100 border-red-500 text-red-700' : ''}`}
                  onClick={() => setShowLiveStreamDialog(true)}
                >
                  {isStreaming ? (
                    <>
                      <Video className="mr-2 h-4 w-4 text-red-500 animate-pulse" />
                      Live Streaming
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      Go Live
                    </>
                  )}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="container px-4 py-4 space-y-4">
        {/* Score Display */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="py-6">
            <div className="text-center">
              <p className="text-sm opacity-80">{battingTeam?.name}</p>
              <p className="text-4xl font-bold mt-2">
                {innings.total_runs}/{innings.total_wickets}
              </p>
              <p className="text-lg mt-1">
                ({innings.total_overs} overs)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Current Batsmen */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Batting</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {striker ? (
                <div className="flex justify-between items-center p-2 bg-secondary rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">*</span>
                    <span className="font-medium">{getPlayerName(striker.batsman_id)}</span>
                  </div>
                  <span className="font-bold">{striker.runs} ({striker.balls_faced})</span>
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => setShowSelectStriker(true)}>
                  Select Striker
                </Button>
              )}
              {nonStriker ? (
                <div className="flex justify-between items-center p-2 rounded-lg">
                  <span className="font-medium">{getPlayerName(nonStriker.batsman_id)}</span>
                  <span className="font-bold">{nonStriker.runs} ({nonStriker.balls_faced})</span>
                </div>
              ) : striker && (
                <Button variant="outline" className="w-full" onClick={() => setShowSelectNonStriker(true)}>
                  Select Non-Striker
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Bowler */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bowling</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {currentBowler ? (
              <div className="flex justify-between items-center">
                <span className="font-medium">{getPlayerName(currentBowler.bowler_id)}</span>
                <span className="font-bold">
                  {currentBowler.wickets}-{currentBowler.runs_conceded} ({currentBowler.overs})
                </span>
              </div>
            ) : striker && nonStriker && (
              <Button variant="outline" className="w-full" onClick={() => setShowSelectBowler(true)}>
                Select Bowler
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Ball Timeline */}
        <BallTimeline
          currentOver={currentOver}
          deliveries={currentOverDeliveries}
          ballsInOver={ballsInOver}
        />

        {/* Scoring Buttons */}
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((run) => (
            <Button
              key={run}
              variant="outline"
              className="text-xl h-16"
              onClick={() => handleRunClick(run)}
              disabled={needsPlayerSelection || savingScore}
            >
              {run}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-3">
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white" 
            onClick={() => handleRunClick(4)}
            disabled={needsPlayerSelection || savingScore}
          >
            4
          </Button>
          <Button 
            className="bg-yellow-500 hover:bg-yellow-600 text-black" 
            onClick={() => handleRunClick(6)}
            disabled={needsPlayerSelection || savingScore}
          >
            6
          </Button>
          <Button 
            className="col-span-2 bg-red-600 hover:bg-red-700 text-white" 
            onClick={() => setShowDismissalDialog(true)}
            disabled={needsPlayerSelection || savingScore}
          >
            OUT
          </Button>
        </div>

        {/* Extra buttons */}
        <div className="grid grid-cols-4 gap-3">
          <Button variant="outline" size="sm" disabled={needsPlayerSelection} onClick={() => openExtrasDialog('wide')}>Wide</Button>
          <Button variant="outline" size="sm" disabled={needsPlayerSelection} onClick={() => openExtrasDialog('no_ball')}>No Ball</Button>
          <Button variant="outline" size="sm" disabled={needsPlayerSelection} onClick={() => openExtrasDialog('bye')}>Bye</Button>
          <Button variant="outline" size="sm" disabled={needsPlayerSelection} onClick={() => openExtrasDialog('leg_bye')}>Leg Bye</Button>
        </div>
      </main>

      {/* Player Selection Dialogs */}
      <PlayerSelectDialog
        open={showSelectStriker}
        onOpenChange={setShowSelectStriker}
        title="Select Striker"
        players={battingTeamPlayers}
        excludePlayerIds={battingPlayerIds}
        onSelect={handleSelectStriker}
        loading={savingScore}
      />

      <PlayerSelectDialog
        open={showSelectNonStriker}
        onOpenChange={setShowSelectNonStriker}
        title="Select Non-Striker"
        players={battingTeamPlayers}
        excludePlayerIds={[...battingPlayerIds, striker?.batsman_id || '']}
        onSelect={handleSelectNonStriker}
        loading={savingScore}
      />

      <PlayerSelectDialog
        open={showSelectBowler}
        onOpenChange={setShowSelectBowler}
        title="Select Bowler"
        players={bowlingTeamPlayers}
        excludePlayerIds={currentBowler ? [currentBowler.bowler_id] : []}
        onSelect={handleSelectBowler}
        loading={savingScore}
      />

      {/* Shot Selection Dialog */}
      <Dialog open={showShotField} onOpenChange={setShowShotField}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Where did the ball go?</DialogTitle>
          </DialogHeader>
          <CricketField onShotSelect={handleShotSelect} selectedShot={selectedShot} />
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowShotField(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              className="flex-1" 
              onClick={confirmShot} 
              disabled={!selectedShot || savingScore}
            >
              {savingScore ? (
                'Saving...'
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirm {pendingRuns} Runs
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dismissal Dialog */}
      <DismissalDialog
        open={showDismissalDialog}
        onOpenChange={setShowDismissalDialog}
        bowlerName={currentBowler ? getPlayerName(currentBowler.bowler_id) : ''}
        fieldingPlayers={bowlingTeamPlayers}
        striker={striker ? { 
          id: striker.id, 
          batsman_id: striker.batsman_id, 
          name: getPlayerName(striker.batsman_id),
          is_striker: true 
        } : undefined}
        nonStriker={nonStriker ? { 
          id: nonStriker.id, 
          batsman_id: nonStriker.batsman_id, 
          name: getPlayerName(nonStriker.batsman_id),
          is_striker: false 
        } : undefined}
        onConfirm={handleWicket}
        loading={savingScore}
      />

      {/* Extras Dialog */}
      <ExtrasDialog
        open={showExtrasDialog}
        onOpenChange={setShowExtrasDialog}
        extraType={currentExtraType}
        onConfirm={handleExtra}
        loading={savingScore}
      />

      {/* Live Stream Dialog */}
      <LiveStreamDialog
        open={showLiveStreamDialog}
        onOpenChange={setShowLiveStreamDialog}
        matchData={{
          battingTeam: battingTeam?.name || 'Team',
          bowlingTeam: innings?.batting_team_id === match?.team1?.id ? match?.team2?.name : match?.team1?.name,
          score: innings?.total_runs || 0,
          wickets: innings?.total_wickets || 0,
          overs: innings?.total_overs || 0,
          striker: {
            name: striker ? getPlayerName(striker.batsman_id) : 'Striker',
            runs: striker?.runs || 0,
            balls: striker?.balls_faced || 0,
          },
          nonStriker: {
            name: nonStriker ? getPlayerName(nonStriker.batsman_id) : 'Non-Striker',
            runs: nonStriker?.runs || 0,
            balls: nonStriker?.balls_faced || 0,
          },
          bowler: {
            name: currentBowler ? getPlayerName(currentBowler.bowler_id) : 'Bowler',
            wickets: currentBowler?.wickets || 0,
            runs: currentBowler?.runs_conceded || 0,
            overs: currentBowler?.overs || 0,
          },
          currentOverBalls: currentOverDeliveries.map(d => {
            if (d.is_wicket) return 'W';
            if (d.is_wide) return 'WD';
            if (d.is_no_ball) return 'NB';
            if (d.is_bye) return `${d.runs}B`;
            if (d.is_leg_bye) return `${d.runs}LB`;
            return String(d.runs);
          }),
          runRate: innings?.total_overs > 0 ? Number((innings.total_runs / innings.total_overs).toFixed(2)) : 0,
        }}
        onStartStream={(withTicker, tickerStyle) => {
          setIsStreaming(true);
          setStreamTickerStyle(tickerStyle);
          toast.success(withTicker ? `Started streaming with ${tickerStyle} ticker!` : 'Started streaming without ticker!');
        }}
      />
    </div>
  );
};

export default Scoring;
