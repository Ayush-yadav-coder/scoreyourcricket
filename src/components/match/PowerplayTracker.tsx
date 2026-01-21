import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, Shield, TrendingUp, Target } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface Delivery {
  over_number: number;
  ball_number: number;
  runs: number;
  is_wicket: boolean;
  is_boundary?: boolean;
  is_six?: boolean;
  is_wide?: boolean;
  is_no_ball?: boolean;
}

interface PowerplayTrackerProps {
  team1Deliveries: Delivery[];
  team2Deliveries: Delivery[];
  team1Name: string;
  team2Name: string;
  powerplayOvers?: number;
}

interface PowerplayStats {
  runs: number;
  wickets: number;
  boundaries: number;
  sixes: number;
  dots: number;
  runRate: number;
  legalBalls: number;
  extras: number;
  overProgress: { over: number; runs: number; cumulative: number }[];
}

const PowerplayTracker: React.FC<PowerplayTrackerProps> = ({
  team1Deliveries,
  team2Deliveries,
  team1Name,
  team2Name,
  powerplayOvers = 6,
}) => {
  const calculatePowerplayStats = (deliveries: Delivery[]): PowerplayStats | null => {
    const ppDeliveries = deliveries.filter(d => d.over_number < powerplayOvers);
    
    if (ppDeliveries.length === 0) return null;

    let runs = 0;
    let wickets = 0;
    let boundaries = 0;
    let sixes = 0;
    let dots = 0;
    let legalBalls = 0;
    let extras = 0;

    const overMap = new Map<number, number>();

    ppDeliveries.forEach(d => {
      runs += d.runs;
      if (!d.is_wide && !d.is_no_ball) legalBalls++;
      if (d.is_wicket) wickets++;
      if (d.is_boundary && !d.is_six) boundaries++;
      if (d.is_six) sixes++;
      if (d.runs === 0 && !d.is_wide && !d.is_no_ball && !d.is_wicket) dots++;
      if (d.is_wide || d.is_no_ball) extras++;

      const overKey = d.over_number;
      overMap.set(overKey, (overMap.get(overKey) || 0) + d.runs);
    });

    // Build cumulative progress
    const overProgress: { over: number; runs: number; cumulative: number }[] = [];
    let cumulative = 0;
    for (let i = 0; i < powerplayOvers; i++) {
      const overRuns = overMap.get(i) || 0;
      cumulative += overRuns;
      if (overMap.has(i)) {
        overProgress.push({
          over: i + 1,
          runs: overRuns,
          cumulative,
        });
      }
    }

    const overs = legalBalls / 6;
    
    return {
      runs,
      wickets,
      boundaries,
      sixes,
      dots,
      runRate: overs > 0 ? runs / overs : 0,
      legalBalls,
      extras,
      overProgress,
    };
  };

  const team1Stats = useMemo(() => calculatePowerplayStats(team1Deliveries), [team1Deliveries, powerplayOvers]);
  const team2Stats = useMemo(() => calculatePowerplayStats(team2Deliveries), [team2Deliveries, powerplayOvers]);

  const getGrade = (stats: PowerplayStats | null): { grade: string; color: string } => {
    if (!stats) return { grade: '-', color: 'text-muted-foreground' };
    
    const score = stats.runRate * 10 - stats.wickets * 5;
    
    if (score >= 70) return { grade: 'A+', color: 'text-green-500' };
    if (score >= 60) return { grade: 'A', color: 'text-green-400' };
    if (score >= 50) return { grade: 'B+', color: 'text-blue-500' };
    if (score >= 40) return { grade: 'B', color: 'text-blue-400' };
    if (score >= 30) return { grade: 'C', color: 'text-yellow-500' };
    return { grade: 'D', color: 'text-red-500' };
  };

  const team1Grade = getGrade(team1Stats);
  const team2Grade = getGrade(team2Stats);

  // Prepare comparison chart data
  const chartData = useMemo(() => {
    const data: { over: number; team1: number; team2: number }[] = [];
    
    for (let i = 1; i <= powerplayOvers; i++) {
      const t1Point = team1Stats?.overProgress.find(p => p.over === i);
      const t2Point = team2Stats?.overProgress.find(p => p.over === i);
      
      if (t1Point || t2Point) {
        data.push({
          over: i,
          team1: t1Point?.cumulative || 0,
          team2: t2Point?.cumulative || 0,
        });
      }
    }
    
    return data;
  }, [team1Stats, team2Stats, powerplayOvers]);

  if (!team1Stats && !team2Stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Powerplay Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Powerplay data will appear as overs are bowled
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
            <Zap className="h-5 w-5 text-primary" />
            Powerplay Tracker
          </CardTitle>
          <Badge variant="outline">
            Overs 1-{powerplayOvers}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team Comparison */}
        <div className="grid grid-cols-2 gap-4">
          {/* Team 1 */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium truncate">{team1Name}</span>
              <Badge variant="outline" className={team1Grade.color}>
                {team1Grade.grade}
              </Badge>
            </div>
            {team1Stats ? (
              <div className="space-y-2">
                <p className="text-3xl font-bold">
                  {team1Stats.runs}/{team1Stats.wickets}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(team1Stats.legalBalls / 6).toFixed(1)} overs | RR: {team1Stats.runRate.toFixed(2)}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    <span>{team1Stats.boundaries} Fours</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-yellow-500" />
                    <span>{team1Stats.sixes} Sixes</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not yet started</p>
            )}
          </div>

          {/* Team 2 */}
          <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium truncate">{team2Name}</span>
              <Badge variant="outline" className={team2Grade.color}>
                {team2Grade.grade}
              </Badge>
            </div>
            {team2Stats ? (
              <div className="space-y-2">
                <p className="text-3xl font-bold">
                  {team2Stats.runs}/{team2Stats.wickets}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(team2Stats.legalBalls / 6).toFixed(1)} overs | RR: {team2Stats.runRate.toFixed(2)}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    <span>{team2Stats.boundaries} Fours</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-yellow-500" />
                    <span>{team2Stats.sixes} Sixes</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not yet started</p>
            )}
          </div>
        </div>

        {/* Comparison Chart */}
        {chartData.length > 1 && (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="over" 
                  className="text-xs"
                  label={{ value: 'Over', position: 'bottom', offset: -5 }}
                />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="team1" 
                  name={team1Name}
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="team2" 
                  name={team2Name}
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--secondary))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Detailed Stats Comparison */}
        {team1Stats && team2Stats && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Comparison
            </h4>
            <div className="space-y-2">
              {/* Run Rate */}
              <div className="p-2 rounded bg-muted/30">
                <div className="flex justify-between text-xs mb-1">
                  <span>Run Rate</span>
                  <span>{team1Stats.runRate.toFixed(2)} vs {team2Stats.runRate.toFixed(2)}</span>
                </div>
                <div className="flex gap-1">
                  <Progress 
                    value={(team1Stats.runRate / (team1Stats.runRate + team2Stats.runRate)) * 100} 
                    className="h-2 flex-1" 
                  />
                </div>
              </div>

              {/* Dot Ball % */}
              <div className="p-2 rounded bg-muted/30">
                <div className="flex justify-between text-xs mb-1">
                  <span>Dot Ball %</span>
                  <span>
                    {((team1Stats.dots / team1Stats.legalBalls) * 100).toFixed(0)}% vs{' '}
                    {((team2Stats.dots / team2Stats.legalBalls) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Boundaries */}
              <div className="p-2 rounded bg-muted/30">
                <div className="flex justify-between text-xs mb-1">
                  <span>Total Boundaries</span>
                  <span>
                    {team1Stats.boundaries + team1Stats.sixes} vs{' '}
                    {team2Stats.boundaries + team2Stats.sixes}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PowerplayTracker;
