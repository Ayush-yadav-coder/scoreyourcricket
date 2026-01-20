import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Users, TrendingUp, Target, Award, Zap } from 'lucide-react';

interface TeamPerformanceTrackerProps {
  teamId: string;
  teamName: string;
}

interface TeamStats {
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  totalRuns: number;
  totalWickets: number;
  avgScore: number;
  highestScore: number;
  recentForm: ('W' | 'L' | 'D')[];
  topScorers: { name: string; runs: number }[];
  topWicketTakers: { name: string; wickets: number }[];
}

const TeamPerformanceTracker: React.FC<TeamPerformanceTrackerProps> = ({ teamId, teamName }) => {
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamStats();
  }, [teamId]);

  const fetchTeamStats = async () => {
    try {
      // Fetch all matches for this team
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          id,
          status,
          team1_id,
          team2_id,
          innings (
            batting_team_id,
            total_runs,
            total_wickets,
            innings_number
          )
        `)
        .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (!matchesData || matchesData.length === 0) {
        setStats(null);
        setLoading(false);
        return;
      }

      let wins = 0;
      let losses = 0;
      let draws = 0;
      let totalRuns = 0;
      let highestScore = 0;
      const recentForm: ('W' | 'L' | 'D')[] = [];

      matchesData.forEach((match) => {
        const innings = match.innings || [];
        const teamInnings = innings.filter((i: any) => i.batting_team_id === teamId);
        const oppInnings = innings.filter((i: any) => i.batting_team_id !== teamId);

        teamInnings.forEach((inn: any) => {
          totalRuns += inn.total_runs || 0;
          highestScore = Math.max(highestScore, inn.total_runs || 0);
        });

        // Determine result
        const teamScore = teamInnings.reduce((sum: number, i: any) => sum + (i.total_runs || 0), 0);
        const oppScore = oppInnings.reduce((sum: number, i: any) => sum + (i.total_runs || 0), 0);

        if (teamScore > oppScore) {
          wins++;
          if (recentForm.length < 5) recentForm.push('W');
        } else if (teamScore < oppScore) {
          losses++;
          if (recentForm.length < 5) recentForm.push('L');
        } else {
          draws++;
          if (recentForm.length < 5) recentForm.push('D');
        }
      });

      // Fetch team members and their stats
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('player_id, profiles:player_id (full_name)')
        .eq('team_id', teamId);

      const playerIds = teamMembers?.map(m => m.player_id) || [];

      // Fetch batting stats
      const { data: battingData } = await supabase
        .from('batting_scores')
        .select('batsman_id, runs')
        .in('batsman_id', playerIds);

      // Fetch bowling stats
      const { data: bowlingData } = await supabase
        .from('bowling_scores')
        .select('bowler_id, wickets')
        .in('bowler_id', playerIds);

      // Aggregate player stats
      const playerRuns: Record<string, number> = {};
      const playerWickets: Record<string, number> = {};
      const playerNames: Record<string, string> = {};

      teamMembers?.forEach((m: any) => {
        playerNames[m.player_id] = m.profiles?.full_name || 'Unknown';
        playerRuns[m.player_id] = 0;
        playerWickets[m.player_id] = 0;
      });

      battingData?.forEach(b => {
        if (playerRuns[b.batsman_id] !== undefined) {
          playerRuns[b.batsman_id] += b.runs || 0;
        }
      });

      bowlingData?.forEach(b => {
        if (playerWickets[b.bowler_id] !== undefined) {
          playerWickets[b.bowler_id] += b.wickets || 0;
        }
      });

      const topScorers = Object.entries(playerRuns)
        .map(([id, runs]) => ({ name: playerNames[id], runs }))
        .sort((a, b) => b.runs - a.runs)
        .slice(0, 3);

      const topWicketTakers = Object.entries(playerWickets)
        .map(([id, wickets]) => ({ name: playerNames[id], wickets }))
        .sort((a, b) => b.wickets - a.wickets)
        .slice(0, 3);

      const totalWickets = bowlingData?.reduce((sum, b) => sum + (b.wickets || 0), 0) || 0;

      setStats({
        totalMatches: matchesData.length,
        wins,
        losses,
        draws,
        winRate: matchesData.length > 0 ? (wins / matchesData.length) * 100 : 0,
        totalRuns,
        totalWickets,
        avgScore: matchesData.length > 0 ? totalRuns / matchesData.length : 0,
        highestScore,
        recentForm,
        topScorers,
        topWicketTakers,
      });
    } catch (error) {
      console.error('Error fetching team stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {teamName} Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No match data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {teamName} Performance
          </CardTitle>
          <Badge variant="outline">
            {stats.totalMatches} Matches
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Win Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Win Rate</span>
            <span className="text-lg font-bold text-primary">{stats.winRate.toFixed(0)}%</span>
          </div>
          <Progress value={stats.winRate} className="h-3" />
        </div>

        {/* Record */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-green-500/10">
            <p className="text-2xl font-bold text-green-500">{stats.wins}</p>
            <p className="text-xs text-muted-foreground">Wins</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10">
            <p className="text-2xl font-bold text-red-500">{stats.losses}</p>
            <p className="text-xs text-muted-foreground">Losses</p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-2xl font-bold">{stats.draws}</p>
            <p className="text-xs text-muted-foreground">Draws</p>
          </div>
        </div>

        {/* Recent Form */}
        <div>
          <h4 className="text-sm font-medium mb-2">Recent Form</h4>
          <div className="flex gap-1">
            {stats.recentForm.map((result, index) => (
              <div
                key={index}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  result === 'W' ? 'bg-green-500' :
                  result === 'L' ? 'bg-red-500' :
                  'bg-gray-500'
                }`}
              >
                {result}
              </div>
            ))}
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3 w-3" />
              Avg Score
            </div>
            <p className="text-xl font-bold">{stats.avgScore.toFixed(0)}</p>
          </div>
          <div className="p-3 rounded bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Zap className="h-3 w-3" />
              Highest Score
            </div>
            <p className="text-xl font-bold">{stats.highestScore}</p>
          </div>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <Award className="h-4 w-4" />
              Top Scorers
            </h4>
            <div className="space-y-1">
              {stats.topScorers.map((player, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="truncate">{player.name}</span>
                  <span className="font-medium">{player.runs}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <Target className="h-4 w-4" />
              Top Wicket Takers
            </h4>
            <div className="space-y-1">
              {stats.topWicketTakers.map((player, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="truncate">{player.name}</span>
                  <span className="font-medium">{player.wickets}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamPerformanceTracker;
