import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Swords, Trophy, Target, TrendingUp } from 'lucide-react';

interface MatchHeadToHeadStatsProps {
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
}

interface HeadToHeadData {
  totalMatches: number;
  team1Wins: number;
  team2Wins: number;
  draws: number;
  team1HighestScore: number;
  team2HighestScore: number;
  avgFirstInningsScore: number;
  avgSecondInningsScore: number;
  recentResults: { winner: string; margin: string }[];
}

const MatchHeadToHeadStats: React.FC<MatchHeadToHeadStatsProps> = ({
  team1Id,
  team2Id,
  team1Name,
  team2Name,
}) => {
  const [data, setData] = useState<HeadToHeadData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHeadToHeadData();
  }, [team1Id, team2Id]);

  const fetchHeadToHeadData = async () => {
    try {
      // Fetch all matches between these two teams
      const { data: matches } = await supabase
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
        .or(`and(team1_id.eq.${team1Id},team2_id.eq.${team2Id}),and(team1_id.eq.${team2Id},team2_id.eq.${team1Id})`)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (!matches || matches.length === 0) {
        setData(null);
        setLoading(false);
        return;
      }

      let team1Wins = 0;
      let team2Wins = 0;
      let draws = 0;
      let team1HighestScore = 0;
      let team2HighestScore = 0;
      let firstInningsTotal = 0;
      let secondInningsTotal = 0;
      const recentResults: { winner: string; margin: string }[] = [];

      matches.forEach((match) => {
        const innings = match.innings || [];
        const firstInnings = innings.find((i: any) => i.innings_number === 1);
        const secondInnings = innings.find((i: any) => i.innings_number === 2);

        if (firstInnings && secondInnings) {
          firstInningsTotal += firstInnings.total_runs || 0;
          secondInningsTotal += secondInnings.total_runs || 0;

          // Track highest scores for each team
          innings.forEach((inn: any) => {
            if (inn.batting_team_id === team1Id) {
              team1HighestScore = Math.max(team1HighestScore, inn.total_runs || 0);
            } else if (inn.batting_team_id === team2Id) {
              team2HighestScore = Math.max(team2HighestScore, inn.total_runs || 0);
            }
          });

          // Determine winner
          const firstBattingTeam = firstInnings.batting_team_id;
          const firstRuns = firstInnings.total_runs || 0;
          const secondRuns = secondInnings.total_runs || 0;

          if (firstRuns > secondRuns) {
            const wicketsRemaining = 10 - (secondInnings.total_wickets || 0);
            if (firstBattingTeam === team1Id) {
              team1Wins++;
              recentResults.push({ winner: team1Name, margin: `by ${firstRuns - secondRuns} runs` });
            } else {
              team2Wins++;
              recentResults.push({ winner: team2Name, margin: `by ${firstRuns - secondRuns} runs` });
            }
          } else if (secondRuns > firstRuns) {
            const wicketsRemaining = 10 - (secondInnings.total_wickets || 0);
            if (firstBattingTeam === team1Id) {
              team2Wins++;
              recentResults.push({ winner: team2Name, margin: `by ${wicketsRemaining} wickets` });
            } else {
              team1Wins++;
              recentResults.push({ winner: team1Name, margin: `by ${wicketsRemaining} wickets` });
            }
          } else {
            draws++;
            recentResults.push({ winner: 'Tie', margin: '' });
          }
        }
      });

      setData({
        totalMatches: matches.length,
        team1Wins,
        team2Wins,
        draws,
        team1HighestScore,
        team2HighestScore,
        avgFirstInningsScore: matches.length > 0 ? firstInningsTotal / matches.length : 0,
        avgSecondInningsScore: matches.length > 0 ? secondInningsTotal / matches.length : 0,
        recentResults: recentResults.slice(0, 5),
      });
    } catch (error) {
      console.error('Error fetching head-to-head data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/2 mx-auto" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" />
            Head-to-Head
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No previous matches between these teams
          </p>
        </CardContent>
      </Card>
    );
  }

  const team1WinPercent = data.totalMatches > 0 ? (data.team1Wins / data.totalMatches) * 100 : 0;
  const team2WinPercent = data.totalMatches > 0 ? (data.team2Wins / data.totalMatches) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-primary" />
          Head-to-Head: {team1Name} vs {team2Name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Win Comparison Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{team1Name}</span>
            <span className="text-muted-foreground">{data.totalMatches} matches</span>
            <span className="font-medium">{team2Name}</span>
          </div>
          <div className="flex h-8 rounded-full overflow-hidden">
            <div 
              className="bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold"
              style={{ width: `${team1WinPercent}%`, minWidth: data.team1Wins > 0 ? '40px' : 0 }}
            >
              {data.team1Wins > 0 && data.team1Wins}
            </div>
            {data.draws > 0 && (
              <div 
                className="bg-muted flex items-center justify-center text-muted-foreground text-sm font-bold"
                style={{ width: `${(data.draws / data.totalMatches) * 100}%`, minWidth: '30px' }}
              >
                {data.draws}
              </div>
            )}
            <div 
              className="bg-secondary flex items-center justify-center text-secondary-foreground text-sm font-bold"
              style={{ width: `${team2WinPercent}%`, minWidth: data.team2Wins > 0 ? '40px' : 0 }}
            >
              {data.team2Wins > 0 && data.team2Wins}
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{team1WinPercent.toFixed(0)}% wins</span>
            {data.draws > 0 && <span>{data.draws} draws</span>}
            <span>{team2WinPercent.toFixed(0)}% wins</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded bg-primary/10">
              <span className="text-sm text-muted-foreground">Highest Score</span>
              <span className="font-bold">{data.team1HighestScore}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-primary/10">
              <span className="text-sm text-muted-foreground">Win Rate</span>
              <span className="font-bold">{team1WinPercent.toFixed(0)}%</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded bg-secondary/20">
              <span className="font-bold">{data.team2HighestScore}</span>
              <span className="text-sm text-muted-foreground">Highest Score</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-secondary/20">
              <span className="font-bold">{team2WinPercent.toFixed(0)}%</span>
              <span className="text-sm text-muted-foreground">Win Rate</span>
            </div>
          </div>
        </div>

        {/* Average Scores */}
        <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/50">
          <div className="text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{Math.round(data.avgFirstInningsScore)}</p>
            <p className="text-xs text-muted-foreground">Avg 1st Innings</p>
          </div>
          <div className="text-center">
            <Target className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{Math.round(data.avgSecondInningsScore)}</p>
            <p className="text-xs text-muted-foreground">Avg 2nd Innings</p>
          </div>
        </div>

        {/* Recent Results */}
        {data.recentResults.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Recent Results</h4>
            <div className="space-y-2">
              {data.recentResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <Badge 
                    variant={result.winner === team1Name ? 'default' : result.winner === team2Name ? 'secondary' : 'outline'}
                  >
                    {result.winner}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{result.margin}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchHeadToHeadStats;
