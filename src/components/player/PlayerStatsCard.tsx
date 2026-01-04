import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Award, Target, Flame, Star } from 'lucide-react';

interface PlayerStats {
  matches_played: number;
  innings: number;
  runs: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  highest_score: number;
  average: number;
  strike_rate: number;
  fifties: number;
  hundreds: number;
  overs_bowled: number;
  runs_conceded: number;
  wickets: number;
  best_bowling: string;
  bowling_average: number;
  economy: number;
}

interface PlayerStatsCardProps {
  playerId: string;
  playerName: string;
  avatarUrl?: string | null;
}

const PlayerStatsCard: React.FC<PlayerStatsCardProps> = ({ playerId, playerName, avatarUrl }) => {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [milestones, setMilestones] = useState<string[]>([]);

  useEffect(() => {
    fetchPlayerStats();
  }, [playerId]);

  const fetchPlayerStats = async () => {
    setLoading(true);

    // Fetch batting scores
    const { data: battingData } = await supabase
      .from('batting_scores')
      .select('*')
      .eq('batsman_id', playerId);

    // Fetch bowling scores
    const { data: bowlingData } = await supabase
      .from('bowling_scores')
      .select('*')
      .eq('bowler_id', playerId);

    if (battingData || bowlingData) {
      const batting = battingData || [];
      const bowling = bowlingData || [];

      const totalRuns = batting.reduce((sum, b) => sum + (b.runs || 0), 0);
      const totalBalls = batting.reduce((sum, b) => sum + (b.balls_faced || 0), 0);
      const totalFours = batting.reduce((sum, b) => sum + (b.fours || 0), 0);
      const totalSixes = batting.reduce((sum, b) => sum + (b.sixes || 0), 0);
      const highestScore = Math.max(...batting.map(b => b.runs || 0), 0);
      const inningsWithRuns = batting.filter(b => (b.balls_faced || 0) > 0);
      const dismissedInnings = batting.filter(b => b.is_out).length;
      const fifties = batting.filter(b => (b.runs || 0) >= 50 && (b.runs || 0) < 100).length;
      const hundreds = batting.filter(b => (b.runs || 0) >= 100).length;

      const totalOvers = bowling.reduce((sum, b) => sum + (b.overs || 0), 0);
      const totalRunsConceded = bowling.reduce((sum, b) => sum + (b.runs_conceded || 0), 0);
      const totalWickets = bowling.reduce((sum, b) => sum + (b.wickets || 0), 0);
      const bestBowling = bowling.reduce(
        (best, b) => {
          if ((b.wickets || 0) > best.wickets || ((b.wickets || 0) === best.wickets && (b.runs_conceded || 0) < best.runs)) {
            return { wickets: b.wickets || 0, runs: b.runs_conceded || 0 };
          }
          return best;
        },
        { wickets: 0, runs: 0 }
      );

      const calculatedStats: PlayerStats = {
        matches_played: Math.max(batting.length, bowling.length),
        innings: inningsWithRuns.length,
        runs: totalRuns,
        balls_faced: totalBalls,
        fours: totalFours,
        sixes: totalSixes,
        highest_score: highestScore,
        average: dismissedInnings > 0 ? totalRuns / dismissedInnings : totalRuns,
        strike_rate: totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0,
        fifties,
        hundreds,
        overs_bowled: totalOvers,
        runs_conceded: totalRunsConceded,
        wickets: totalWickets,
        best_bowling: `${bestBowling.wickets}/${bestBowling.runs}`,
        bowling_average: totalWickets > 0 ? totalRunsConceded / totalWickets : 0,
        economy: totalOvers > 0 ? totalRunsConceded / totalOvers : 0,
      };

      setStats(calculatedStats);

      // Calculate milestones
      const newMilestones: string[] = [];
      if (totalRuns >= 1000) newMilestones.push('🏏 1000+ Career Runs');
      if (totalRuns >= 500) newMilestones.push('🔥 500+ Career Runs');
      if (hundreds >= 5) newMilestones.push('💯 5+ Centuries');
      if (hundreds >= 1) newMilestones.push('Century Scorer');
      if (fifties >= 5) newMilestones.push('⭐ 5+ Half-centuries');
      if (totalWickets >= 50) newMilestones.push('🎯 50+ Career Wickets');
      if (totalWickets >= 25) newMilestones.push('Wicket Taker');
      if (calculatedStats.average >= 40) newMilestones.push('Elite Averager');
      if (calculatedStats.strike_rate >= 150) newMilestones.push('Power Hitter');
      if (calculatedStats.economy <= 6 && totalOvers >= 10) newMilestones.push('Economy King');
      setMilestones(newMilestones.slice(0, 3));
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="py-6">
          <div className="h-24 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Card className="bg-card border-border hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={playerName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-primary">{playerName.charAt(0)}</span>
            )}
          </div>
          <div>
            <CardTitle className="text-lg">{playerName}</CardTitle>
            <p className="text-sm text-muted-foreground">{stats.matches_played} matches</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Milestones */}
        {milestones.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {milestones.map((milestone, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {milestone}
              </Badge>
            ))}
          </div>
        )}

        {/* Batting Stats */}
        {stats.innings > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>Batting</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-muted rounded p-2">
                <p className="text-lg font-bold text-foreground">{stats.runs}</p>
                <p className="text-xs text-muted-foreground">Runs</p>
              </div>
              <div className="bg-muted rounded p-2">
                <p className="text-lg font-bold text-foreground">{stats.average.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Avg</p>
              </div>
              <div className="bg-muted rounded p-2">
                <p className="text-lg font-bold text-foreground">{stats.strike_rate.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">SR</p>
              </div>
              <div className="bg-muted rounded p-2">
                <p className="text-lg font-bold text-foreground">{stats.highest_score}</p>
                <p className="text-xs text-muted-foreground">HS</p>
              </div>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{stats.fours} fours • {stats.sixes} sixes</span>
              <span>{stats.fifties} 50s • {stats.hundreds} 100s</span>
            </div>
          </div>
        )}

        {/* Bowling Stats */}
        {stats.overs_bowled > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="w-4 h-4 text-primary" />
              <span>Bowling</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-muted rounded p-2">
                <p className="text-lg font-bold text-foreground">{stats.wickets}</p>
                <p className="text-xs text-muted-foreground">Wkts</p>
              </div>
              <div className="bg-muted rounded p-2">
                <p className="text-lg font-bold text-foreground">{stats.bowling_average.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Avg</p>
              </div>
              <div className="bg-muted rounded p-2">
                <p className="text-lg font-bold text-foreground">{stats.economy.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Econ</p>
              </div>
              <div className="bg-muted rounded p-2">
                <p className="text-lg font-bold text-foreground">{stats.best_bowling}</p>
                <p className="text-xs text-muted-foreground">BB</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerStatsCard;
