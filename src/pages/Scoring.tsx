import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Menu, MoreVertical, Camera, Users, Clock, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import CricketField from '@/components/scoring/CricketField';
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
  is_current_bowler: boolean;
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
  
  const [showSelectBatsmen, setShowSelectBatsmen] = useState(false);
  const [showSelectBowler, setShowSelectBowler] = useState(false);
  const [showShotField, setShowShotField] = useState(false);
  const [pendingRuns, setPendingRuns] = useState(0);
  const [selectedShot, setSelectedShot] = useState<{ x: number; y: number } | null>(null);
  
  const [ballsInOver, setBallsInOver] = useState(0);
  const [currentOver, setCurrentOver] = useState(0);

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
        setCurrentOver(Math.floor(inningsData.total_overs));
        setBallsInOver(Math.round((inningsData.total_overs % 1) * 10));
        
        // Fetch team players
        await fetchTeamPlayers(inningsData.batting_team_id, inningsData.bowling_team_id);
        
        // Fetch current batsmen
        await fetchCurrentBatsmen(inningsData.id);
        
        // Fetch current bowler
        await fetchCurrentBowler(inningsData.id);
      } else {
        setShowSelectBatsmen(true);
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
    const { data: batsmen } = await supabase
      .from('batting_scores')
      .select('*')
      .eq('innings_id', inningsId)
      .eq('is_out', false)
      .limit(2);
    
    if (batsmen && batsmen.length >= 2) {
      const strikerData = batsmen.find(b => b.is_striker);
      const nonStrikerData = batsmen.find(b => !b.is_striker);
      setStriker(strikerData || null);
      setNonStriker(nonStrikerData || null);
    } else if (batsmen && batsmen.length === 1) {
      setStriker(batsmen[0]);
      setShowSelectBatsmen(true);
    } else {
      setShowSelectBatsmen(true);
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
      setShowSelectBowler(true);
    }
  };

  const handleRunClick = (runs: number) => {
    setPendingRuns(runs);
    setShowShotField(true);
  };

  const handleShotSelect = async (x: number, y: number, region: string) => {
    setSelectedShot({ x, y });
  };

  const confirmShot = async () => {
    if (!innings || !striker || !nonStriker || !currentBowler) return;

    const newBallNumber = ballsInOver + 1;
    const newOver = newBallNumber >= 6 ? currentOver + 1 : currentOver;
    const newBallsInOver = newBallNumber >= 6 ? 0 : newBallNumber;

    // Add delivery
    await supabase.from('deliveries').insert({
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

    // Update batsman score
    await supabase
      .from('batting_scores')
      .update({
        runs: striker.runs + pendingRuns,
        balls_faced: striker.balls_faced + 1,
        fours: striker.fours + (pendingRuns === 4 ? 1 : 0),
        sixes: striker.sixes + (pendingRuns === 6 ? 1 : 0),
      })
      .eq('id', striker.id);

    // Update bowler score
    const newOvers = newBallNumber >= 6 
      ? currentBowler.overs + 1 
      : parseFloat((currentBowler.overs + 0.1).toFixed(1));
    
    await supabase
      .from('bowling_scores')
      .update({
        overs: newOvers,
        runs_conceded: currentBowler.runs_conceded + pendingRuns,
      })
      .eq('id', currentBowler.id);

    // Update innings
    const newInningsOvers = newBallNumber >= 6 
      ? innings.total_overs + 1 
      : parseFloat((innings.total_overs + 0.1).toFixed(1));
    
    await supabase
      .from('innings')
      .update({
        total_runs: innings.total_runs + pendingRuns,
        total_overs: newInningsOvers,
      })
      .eq('id', innings.id);

    // Swap strike if odd runs
    if (pendingRuns % 2 === 1) {
      await supabase.from('batting_scores').update({ is_striker: false }).eq('id', striker.id);
      await supabase.from('batting_scores').update({ is_striker: true }).eq('id', nonStriker.id);
    }

    // End of over - swap strike and change bowler
    if (newBallNumber >= 6) {
      await supabase.from('batting_scores').update({ is_striker: true }).eq('id', nonStriker.id);
      await supabase.from('batting_scores').update({ is_striker: false }).eq('id', striker.id);
      setShowSelectBowler(true);
    }

    setShowShotField(false);
    setSelectedShot(null);
    setPendingRuns(0);
    setBallsInOver(newBallsInOver);
    setCurrentOver(newOver);
    
    // Refresh data
    await fetchMatchData();
    toast.success(`${pendingRuns} runs scored!`);
  };

  const handleWicket = async () => {
    // Simplified wicket handling - would need full dismissal dialog in production
    if (!striker || !innings) return;
    
    await supabase
      .from('batting_scores')
      .update({ is_out: true, dismissal_type: 'bowled' })
      .eq('id', striker.id);
    
    await supabase
      .from('innings')
      .update({ total_wickets: innings.total_wickets + 1 })
      .eq('id', innings.id);
    
    if (currentBowler) {
      await supabase
        .from('bowling_scores')
        .update({ wickets: currentBowler.wickets + 1 })
        .eq('id', currentBowler.id);
    }
    
    setStriker(null);
    setShowSelectBatsmen(true);
    toast.success('Wicket!');
    await fetchMatchData();
  };

  const getPlayerName = (playerId: string, isStriker: boolean = false) => {
    const allPlayers = [...battingTeamPlayers];
    const player = allPlayers.find(p => p.player_id === playerId);
    return player?.profiles?.full_name || 'Unknown';
  };

  if (!match || !innings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const battingTeam = innings.batting_team_id === match.team1?.id ? match.team1 : match.team2;
  const bowlingTeam = innings.bowling_team_id === match.team1?.id ? match.team1 : match.team2;

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
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="mr-2 h-4 w-4" />
                  Set Break (Tea/Lunch/Rain)
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Add Officials
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Camera className="mr-2 h-4 w-4" />
                  Go Live
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
              <p className="score-display mt-2">
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
              {striker && (
                <div className="flex justify-between items-center p-2 bg-secondary rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">*</span>
                    <span className="font-medium">{getPlayerName(striker.batsman_id)}</span>
                  </div>
                  <span className="font-bold">{striker.runs} ({striker.balls_faced})</span>
                </div>
              )}
              {nonStriker && (
                <div className="flex justify-between items-center p-2 rounded-lg">
                  <span className="font-medium">{getPlayerName(nonStriker.batsman_id)}</span>
                  <span className="font-bold">{nonStriker.runs} ({nonStriker.balls_faced})</span>
                </div>
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
            {currentBowler && (
              <div className="flex justify-between items-center">
                <span className="font-medium">{getPlayerName(currentBowler.bowler_id)}</span>
                <span className="font-bold">
                  {currentBowler.wickets}-{currentBowler.runs_conceded} ({currentBowler.overs})
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scoring Buttons */}
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((run) => (
            <Button
              key={run}
              variant="run"
              className="text-xl h-16"
              onClick={() => handleRunClick(run)}
            >
              {run}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-3">
          <Button variant="score" className="bg-cricket-blue text-primary-foreground" onClick={() => handleRunClick(4)}>
            4
          </Button>
          <Button variant="score" className="bg-cricket-gold text-foreground" onClick={() => handleRunClick(6)}>
            6
          </Button>
          <Button variant="wicket" className="col-span-2" onClick={handleWicket}>
            OUT
          </Button>
        </div>

        {/* Extra buttons */}
        <div className="grid grid-cols-4 gap-3">
          <Button variant="outline" size="sm">Wide</Button>
          <Button variant="outline" size="sm">No Ball</Button>
          <Button variant="outline" size="sm">Bye</Button>
          <Button variant="outline" size="sm">Leg Bye</Button>
        </div>
      </main>

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
            <Button className="flex-1" onClick={confirmShot} disabled={!selectedShot}>
              <Check className="mr-2 h-4 w-4" />
              Confirm {pendingRuns} Runs
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Scoring;
