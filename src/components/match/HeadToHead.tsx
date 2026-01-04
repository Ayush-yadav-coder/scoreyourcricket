import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface HeadToHeadProps {
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
}

interface HeadToHeadStats {
  totalMatches: number;
  team1Wins: number;
  team2Wins: number;
  draws: number;
  team1TotalRuns: number;
  team2TotalRuns: number;
  team1HighestScore: number;
  team2HighestScore: number;
  team1LowestScore: number;
  team2LowestScore: number;
  lastMatchWinner: string | null;
  recentForm: ('team1' | 'team2' | 'draw')[];
}

const HeadToHead: React.FC<HeadToHeadProps> = ({ team1Id, team2Id, team1Name, team2Name }) => {
  const [stats, setStats] = useState<HeadToHeadStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHeadToHeadStats();
  }, [team1Id, team2Id]);

  const fetchHeadToHeadStats = async () => {
    setLoading(true);
    try {
      // Fetch all matches between these two teams
      const { data: matches } = await supabase
        .from('matches')
        .select('id, status, team1_id, team2_id, created_at')
        .or(`and(team1_id.eq.${team1Id},team2_id.eq.${team2Id}),and(team1_id.eq.${team2Id},team2_id.eq.${team1Id})`)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (!matches || matches.length === 0) {
        setStats({
          totalMatches: 0,
          team1Wins: 0,
          team2Wins: 0,
          draws: 0,
          team1TotalRuns: 0,
          team2TotalRuns: 0,
          team1HighestScore: 0,
          team2HighestScore: 0,
          team1LowestScore: 0,
          team2LowestScore: 0,
          lastMatchWinner: null,
          recentForm: [],
        });
        setLoading(false);
        return;
      }

      const matchIds = matches.map(m => m.id);

      // Fetch all innings for these matches
      const { data: allInnings } = await supabase
        .from('innings')
        .select('*')
        .in('match_id', matchIds);

      let team1Wins = 0;
      let team2Wins = 0;
      let draws = 0;
      let team1TotalRuns = 0;
      let team2TotalRuns = 0;
      let team1HighestScore = 0;
      let team2HighestScore = 0;
      let team1LowestScore = Infinity;
      let team2LowestScore = Infinity;
      const recentForm: ('team1' | 'team2' | 'draw')[] = [];

      matches.forEach(match => {
        const matchInnings = allInnings?.filter(i => i.match_id === match.id) || [];
        
        let team1Score = 0;
        let team2Score = 0;
        
        matchInnings.forEach(inn => {
          if (inn.batting_team_id === team1Id) {
            team1Score += inn.total_runs;
            team1TotalRuns += inn.total_runs;
            if (inn.total_runs > team1HighestScore) team1HighestScore = inn.total_runs;
            if (inn.total_runs < team1LowestScore && inn.is_completed) team1LowestScore = inn.total_runs;
          } else if (inn.batting_team_id === team2Id) {
            team2Score += inn.total_runs;
            team2TotalRuns += inn.total_runs;
            if (inn.total_runs > team2HighestScore) team2HighestScore = inn.total_runs;
            if (inn.total_runs < team2LowestScore && inn.is_completed) team2LowestScore = inn.total_runs;
          }
        });

        // Determine winner
        if (team1Score > team2Score) {
          team1Wins++;
          if (recentForm.length < 5) recentForm.push('team1');
        } else if (team2Score > team1Score) {
          team2Wins++;
          if (recentForm.length < 5) recentForm.push('team2');
        } else {
          draws++;
          if (recentForm.length < 5) recentForm.push('draw');
        }
      });

      setStats({
        totalMatches: matches.length,
        team1Wins,
        team2Wins,
        draws,
        team1TotalRuns,
        team2TotalRuns,
        team1HighestScore,
        team2HighestScore,
        team1LowestScore: team1LowestScore === Infinity ? 0 : team1LowestScore,
        team2LowestScore: team2LowestScore === Infinity ? 0 : team2LowestScore,
        lastMatchWinner: recentForm[0] === 'team1' ? team1Name : recentForm[0] === 'team2' ? team2Name : 'Draw',
        recentForm,
      });
    } catch (error) {
      console.error('Error fetching head-to-head stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Head to Head
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalMatches === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Head to Head
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No previous matches between these teams
          </p>
        </CardContent>
      </Card>
    );
  }

  const team1WinPercentage = stats.totalMatches > 0 ? (stats.team1Wins / stats.totalMatches) * 100 : 0;
  const team2WinPercentage = stats.totalMatches > 0 ? (stats.team2Wins / stats.totalMatches) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Head to Head
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Win Comparison Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{team1Name}</span>
            <span className="font-medium">{team2Name}</span>
          </div>
          <div className="flex h-8 rounded-lg overflow-hidden">
            <div 
              className="bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold transition-all"
              style={{ width: `${team1WinPercentage}%` }}
            >
              {stats.team1Wins > 0 && stats.team1Wins}
            </div>
            {stats.draws > 0 && (
              <div 
                className="bg-muted flex items-center justify-center text-muted-foreground text-sm font-bold"
                style={{ width: `${(stats.draws / stats.totalMatches) * 100}%` }}
              >
                {stats.draws}
              </div>
            )}
            <div 
              className="bg-destructive flex items-center justify-center text-destructive-foreground text-sm font-bold transition-all"
              style={{ width: `${team2WinPercentage}%` }}
            >
              {stats.team2Wins > 0 && stats.team2Wins}
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {stats.totalMatches} matches played
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-primary">{stats.team1Wins}</p>
            <p className="text-xs text-muted-foreground">Wins</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-muted-foreground">{stats.draws}</p>
            <p className="text-xs text-muted-foreground">Draws</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-destructive">{stats.team2Wins}</p>
            <p className="text-xs text-muted-foreground">Wins</p>
          </div>
        </div>

        {/* Recent Form */}
        {stats.recentForm.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Recent Form (Last 5)</p>
            <div className="flex gap-2 justify-center">
              {stats.recentForm.map((result, i) => (
                <div 
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    result === 'team1' ? 'bg-primary text-primary-foreground' :
                    result === 'team2' ? 'bg-destructive text-destructive-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}
                >
                  {result === 'team1' ? team1Name.charAt(0) : 
                   result === 'team2' ? team2Name.charAt(0) : 'D'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Score Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="font-medium text-sm border-b pb-1">{team1Name}</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Highest Score</span>
              <span className="font-medium">{stats.team1HighestScore}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Lowest Score</span>
              <span className="font-medium">{stats.team1LowestScore}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Runs</span>
              <span className="font-medium">{stats.team1TotalRuns}</span>
            </div>
          </div>
          <div className="space-y-3">
            <p className="font-medium text-sm border-b pb-1">{team2Name}</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Highest Score</span>
              <span className="font-medium">{stats.team2HighestScore}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Lowest Score</span>
              <span className="font-medium">{stats.team2LowestScore}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Runs</span>
              <span className="font-medium">{stats.team2TotalRuns}</span>
            </div>
          </div>
        </div>

        {/* Last Match Winner */}
        {stats.lastMatchWinner && (
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Last Match Winner</p>
            <p className="font-bold">{stats.lastMatchWinner}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HeadToHead;
