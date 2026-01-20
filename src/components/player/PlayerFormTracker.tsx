import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, TrendingDown, Minus, Target, 
  Flame, BarChart2, Activity, Award
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';

interface PlayerFormTrackerProps {
  playerId: string;
  playerName: string;
}

interface MatchPerformance {
  matchId: string;
  date: string;
  runs: number;
  balls: number;
  strikeRate: number;
  wickets?: number;
  economy?: number;
  overs?: number;
  isRecent: boolean;
}

interface FormStats {
  recentMatches: MatchPerformance[];
  careerAverage: number;
  recentAverage: number;
  trend: 'up' | 'down' | 'stable';
  formRating: number;
  battingStats: {
    highestScore: number;
    totalRuns: number;
    totalMatches: number;
    fifties: number;
    hundreds: number;
    avgStrikeRate: number;
  };
  bowlingStats: {
    bestFigures: string;
    totalWickets: number;
    totalMatches: number;
    fiveWickets: number;
    avgEconomy: number;
  };
}

const PlayerFormTracker: React.FC<PlayerFormTrackerProps> = ({ playerId, playerName }) => {
  const [formStats, setFormStats] = useState<FormStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('batting');

  useEffect(() => {
    fetchFormData();
  }, [playerId]);

  const fetchFormData = async () => {
    setLoading(true);
    try {
      // Fetch batting scores with match details
      const { data: battingData } = await supabase
        .from('batting_scores')
        .select(`
          *,
          innings:innings_id (
            match_id,
            matches:match_id (
              created_at,
              status
            )
          )
        `)
        .eq('batsman_id', playerId)
        .order('created_at', { ascending: false });

      // Fetch bowling scores
      const { data: bowlingData } = await supabase
        .from('bowling_scores')
        .select(`
          *,
          innings:innings_id (
            match_id,
            matches:match_id (
              created_at,
              status
            )
          )
        `)
        .eq('bowler_id', playerId)
        .order('created_at', { ascending: false });

      const battingPerformances: MatchPerformance[] = (battingData || [])
        .filter(b => b.innings?.matches?.status === 'completed')
        .map((b, index) => ({
          matchId: b.innings?.match_id || '',
          date: b.innings?.matches?.created_at || '',
          runs: b.runs || 0,
          balls: b.balls_faced || 0,
          strikeRate: b.balls_faced ? ((b.runs || 0) / b.balls_faced) * 100 : 0,
          isRecent: index < 5,
        }));

      const bowlingPerformances: MatchPerformance[] = (bowlingData || [])
        .filter(b => b.innings?.matches?.status === 'completed')
        .map((b, index) => ({
          matchId: b.innings?.match_id || '',
          date: b.innings?.matches?.created_at || '',
          runs: 0,
          balls: 0,
          strikeRate: 0,
          wickets: b.wickets || 0,
          economy: b.overs ? (b.runs_conceded || 0) / Number(b.overs) : 0,
          overs: Number(b.overs) || 0,
          isRecent: index < 5,
        }));

      // Calculate batting stats
      const totalBattingRuns = battingPerformances.reduce((sum, p) => sum + p.runs, 0);
      const recentBattingRuns = battingPerformances.slice(0, 5).reduce((sum, p) => sum + p.runs, 0);
      const careerBattingAvg = battingPerformances.length > 0 ? totalBattingRuns / battingPerformances.length : 0;
      const recentBattingAvg = battingPerformances.length >= 5 ? recentBattingRuns / 5 : recentBattingRuns / Math.max(battingPerformances.length, 1);

      const battingTrend = recentBattingAvg > careerBattingAvg * 1.1 ? 'up' : 
                          recentBattingAvg < careerBattingAvg * 0.9 ? 'down' : 'stable';

      const battingFormRating = calculateFormRating(battingPerformances.slice(0, 10), 'batting');

      const highestScore = Math.max(...battingPerformances.map(p => p.runs), 0);
      const fifties = battingPerformances.filter(p => p.runs >= 50 && p.runs < 100).length;
      const hundreds = battingPerformances.filter(p => p.runs >= 100).length;
      const avgStrikeRate = battingPerformances.length > 0 
        ? battingPerformances.reduce((sum, p) => sum + p.strikeRate, 0) / battingPerformances.length 
        : 0;

      // Calculate bowling stats
      const totalWickets = bowlingPerformances.reduce((sum, p) => sum + (p.wickets || 0), 0);
      const fiveWickets = bowlingPerformances.filter(p => (p.wickets || 0) >= 5).length;
      const avgEconomy = bowlingPerformances.length > 0
        ? bowlingPerformances.reduce((sum, p) => sum + (p.economy || 0), 0) / bowlingPerformances.length
        : 0;
      
      const bestBowling = bowlingPerformances.reduce((best, p) => {
        if ((p.wickets || 0) > (best.wickets || 0)) return p;
        if ((p.wickets || 0) === (best.wickets || 0) && (p.economy || 99) < (best.economy || 99)) return p;
        return best;
      }, { wickets: 0, economy: 0 } as MatchPerformance);

      setFormStats({
        recentMatches: battingPerformances.slice(0, 10),
        careerAverage: careerBattingAvg,
        recentAverage: recentBattingAvg,
        trend: battingTrend,
        formRating: battingFormRating,
        battingStats: {
          highestScore,
          totalRuns: totalBattingRuns,
          totalMatches: battingPerformances.length,
          fifties,
          hundreds,
          avgStrikeRate,
        },
        bowlingStats: {
          bestFigures: `${bestBowling.wickets || 0}/${Math.round((bestBowling.economy || 0) * (bestBowling.overs || 0))}`,
          totalWickets,
          totalMatches: bowlingPerformances.length,
          fiveWickets,
          avgEconomy,
        },
      });
    } catch (error) {
      console.error('Error fetching form data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFormRating = (performances: MatchPerformance[], type: 'batting' | 'bowling'): number => {
    if (performances.length === 0) return 50;

    let rating = 50;
    const weights = [1.5, 1.4, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6];

    performances.forEach((perf, index) => {
      const weight = weights[index] || 0.5;
      if (type === 'batting') {
        if (perf.runs >= 100) rating += 15 * weight;
        else if (perf.runs >= 50) rating += 10 * weight;
        else if (perf.runs >= 30) rating += 5 * weight;
        else if (perf.runs < 10) rating -= 5 * weight;
        
        if (perf.strikeRate > 150) rating += 5 * weight;
        else if (perf.strikeRate < 80) rating -= 3 * weight;
      } else {
        if ((perf.wickets || 0) >= 5) rating += 15 * weight;
        else if ((perf.wickets || 0) >= 3) rating += 10 * weight;
        else if ((perf.wickets || 0) >= 1) rating += 5 * weight;
        
        if ((perf.economy || 99) < 6) rating += 5 * weight;
        else if ((perf.economy || 0) > 10) rating -= 5 * weight;
      }
    });

    return Math.min(100, Math.max(0, rating));
  };

  const getTrendIcon = () => {
    if (!formStats) return <Minus className="h-4 w-4" />;
    switch (formStats.trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getFormLabel = (rating: number): string => {
    if (rating >= 80) return 'Excellent';
    if (rating >= 65) return 'Good';
    if (rating >= 50) return 'Average';
    if (rating >= 35) return 'Below Average';
    return 'Poor';
  };

  const getFormColor = (rating: number): string => {
    if (rating >= 80) return 'text-green-500';
    if (rating >= 65) return 'text-blue-500';
    if (rating >= 50) return 'text-yellow-500';
    if (rating >= 35) return 'text-orange-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Player Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!formStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Player Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No performance data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = formStats.recentMatches.map((match, index) => ({
    match: `M${formStats.recentMatches.length - index}`,
    runs: match.runs,
    strikeRate: Math.round(match.strikeRate),
    average: Math.round(formStats.careerAverage),
  })).reverse();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {playerName}'s Form Tracker
          </CardTitle>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <Badge variant={formStats.trend === 'up' ? 'default' : formStats.trend === 'down' ? 'destructive' : 'secondary'}>
              {formStats.trend === 'up' ? 'In Form' : formStats.trend === 'down' ? 'Out of Form' : 'Steady'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form Rating */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Form Rating</span>
            <span className={`text-lg font-bold ${getFormColor(formStats.formRating)}`}>
              {Math.round(formStats.formRating)}/100 - {getFormLabel(formStats.formRating)}
            </span>
          </div>
          <Progress value={formStats.formRating} className="h-3" />
        </div>

        {/* Career vs Recent Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <BarChart2 className="h-4 w-4" />
              Career Average
            </div>
            <p className="text-2xl font-bold">{formStats.careerAverage.toFixed(1)}</p>
          </div>
          <div className="p-4 rounded-lg bg-primary/10">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Flame className="h-4 w-4" />
              Recent Average (Last 5)
            </div>
            <p className="text-2xl font-bold">{formStats.recentAverage.toFixed(1)}</p>
            <p className={`text-xs ${formStats.recentAverage > formStats.careerAverage ? 'text-green-500' : 'text-red-500'}`}>
              {formStats.recentAverage > formStats.careerAverage ? '+' : ''}
              {(formStats.recentAverage - formStats.careerAverage).toFixed(1)} vs career
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="batting">Batting</TabsTrigger>
            <TabsTrigger value="bowling">Bowling</TabsTrigger>
          </TabsList>

          <TabsContent value="batting" className="space-y-4">
            {/* Performance Graph */}
            {chartData.length > 0 && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="runGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="match" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <ReferenceLine 
                      y={formStats.careerAverage} 
                      stroke="hsl(var(--muted-foreground))" 
                      strokeDasharray="5 5" 
                      label={{ value: 'Career Avg', position: 'right', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="runs" 
                      stroke="hsl(var(--primary))" 
                      fill="url(#runGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Batting Stats Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-muted/50">
                <p className="text-lg font-bold">{formStats.battingStats.highestScore}</p>
                <p className="text-xs text-muted-foreground">Highest Score</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="text-lg font-bold">{formStats.battingStats.totalRuns}</p>
                <p className="text-xs text-muted-foreground">Total Runs</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="text-lg font-bold">{formStats.battingStats.avgStrikeRate.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Avg SR</p>
              </div>
              <div className="p-2 rounded bg-yellow-500/10">
                <p className="text-lg font-bold">{formStats.battingStats.fifties}</p>
                <p className="text-xs text-muted-foreground">50s</p>
              </div>
              <div className="p-2 rounded bg-green-500/10">
                <p className="text-lg font-bold">{formStats.battingStats.hundreds}</p>
                <p className="text-xs text-muted-foreground">100s</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="text-lg font-bold">{formStats.battingStats.totalMatches}</p>
                <p className="text-xs text-muted-foreground">Matches</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bowling" className="space-y-4">
            {/* Bowling Stats Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-muted/50">
                <p className="text-lg font-bold">{formStats.bowlingStats.bestFigures}</p>
                <p className="text-xs text-muted-foreground">Best Figures</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="text-lg font-bold">{formStats.bowlingStats.totalWickets}</p>
                <p className="text-xs text-muted-foreground">Total Wickets</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="text-lg font-bold">{formStats.bowlingStats.avgEconomy.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Avg Economy</p>
              </div>
              <div className="p-2 rounded bg-purple-500/10">
                <p className="text-lg font-bold">{formStats.bowlingStats.fiveWickets}</p>
                <p className="text-xs text-muted-foreground">5-Wicket Hauls</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="text-lg font-bold">{formStats.bowlingStats.totalMatches}</p>
                <p className="text-xs text-muted-foreground">Matches</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="text-lg font-bold">
                  {formStats.bowlingStats.totalMatches > 0 
                    ? (formStats.bowlingStats.totalWickets / formStats.bowlingStats.totalMatches).toFixed(1)
                    : '0'}
                </p>
                <p className="text-xs text-muted-foreground">Wickets/Match</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Recent Form Indicator */}
        <div className="flex gap-1 justify-center">
          {formStats.recentMatches.slice(0, 5).map((match, index) => (
            <div
              key={index}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                match.runs >= 50 ? 'bg-green-500 text-white' :
                match.runs >= 30 ? 'bg-yellow-500 text-white' :
                match.runs >= 15 ? 'bg-orange-500 text-white' :
                'bg-red-500 text-white'
              }`}
              title={`${match.runs} runs`}
            >
              {match.runs}
            </div>
          ))}
        </div>
        <p className="text-xs text-center text-muted-foreground">Last 5 innings</p>
      </CardContent>
    </Card>
  );
};

export default PlayerFormTracker;
