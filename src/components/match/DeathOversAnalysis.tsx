import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skull, Target, Zap, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
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
  batsman_id?: string;
  bowler_id?: string;
}

interface DeathOversAnalysisProps {
  deliveries: Delivery[];
  totalOvers: number;
  teamName: string;
  playerNames?: Record<string, string>;
}

const DeathOversAnalysis: React.FC<DeathOversAnalysisProps> = ({
  deliveries,
  totalOvers,
  teamName,
  playerNames = {},
}) => {
  const deathOversStart = totalOvers >= 20 ? 16 : Math.floor(totalOvers * 0.8);

  const analysis = useMemo(() => {
    // Filter death overs deliveries
    const deathDeliveries = deliveries.filter(d => d.over_number >= deathOversStart - 1);
    
    if (deathDeliveries.length === 0) {
      return null;
    }

    // Overall stats
    let totalRuns = 0;
    let totalWickets = 0;
    let boundaries = 0;
    let sixes = 0;
    let dots = 0;
    let legalBalls = 0;
    let extras = 0;

    // Per-over breakdown
    const overBreakdown: { over: number; runs: number; wickets: number; boundaries: number }[] = [];
    const overMap = new Map<number, typeof deathDeliveries>();

    deathDeliveries.forEach(d => {
      if (!d.is_wide && !d.is_no_ball) legalBalls++;
      totalRuns += d.runs;
      if (d.is_wicket) totalWickets++;
      if (d.is_boundary) boundaries++;
      if (d.is_six) sixes++;
      if (d.runs === 0 && !d.is_wide && !d.is_no_ball && !d.is_wicket) dots++;
      if (d.is_wide || d.is_no_ball) extras++;

      const overKey = d.over_number;
      if (!overMap.has(overKey)) {
        overMap.set(overKey, []);
      }
      overMap.get(overKey)!.push(d);
    });

    // Build over breakdown
    overMap.forEach((overDeliveries, overNum) => {
      overBreakdown.push({
        over: overNum + 1,
        runs: overDeliveries.reduce((sum, d) => sum + d.runs, 0),
        wickets: overDeliveries.filter(d => d.is_wicket).length,
        boundaries: overDeliveries.filter(d => d.is_boundary || d.is_six).length,
      });
    });

    // Top batsmen in death overs
    const batsmanRuns = new Map<string, { runs: number; balls: number; boundaries: number }>();
    deathDeliveries.forEach(d => {
      if (d.batsman_id && !d.is_wide) {
        const stats = batsmanRuns.get(d.batsman_id) || { runs: 0, balls: 0, boundaries: 0 };
        stats.runs += d.runs;
        if (!d.is_no_ball) stats.balls++;
        if (d.is_boundary || d.is_six) stats.boundaries++;
        batsmanRuns.set(d.batsman_id, stats);
      }
    });

    const topBatsmen = Array.from(batsmanRuns.entries())
      .map(([id, stats]) => ({
        id,
        name: playerNames[id] || 'Unknown',
        ...stats,
        strikeRate: stats.balls > 0 ? (stats.runs / stats.balls) * 100 : 0,
      }))
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 3);

    // Best death bowlers
    const bowlerStats = new Map<string, { runs: number; balls: number; wickets: number; dots: number }>();
    deathDeliveries.forEach(d => {
      if (d.bowler_id) {
        const stats = bowlerStats.get(d.bowler_id) || { runs: 0, balls: 0, wickets: 0, dots: 0 };
        stats.runs += d.runs;
        if (!d.is_wide && !d.is_no_ball) stats.balls++;
        if (d.is_wicket) stats.wickets++;
        if (d.runs === 0 && !d.is_wide && !d.is_no_ball) stats.dots++;
        bowlerStats.set(d.bowler_id, stats);
      }
    });

    const topBowlers = Array.from(bowlerStats.entries())
      .map(([id, stats]) => ({
        id,
        name: playerNames[id] || 'Unknown',
        ...stats,
        economy: stats.balls > 0 ? (stats.runs / stats.balls) * 6 : 0,
      }))
      .sort((a, b) => a.economy - b.economy)
      .slice(0, 3);

    const overs = legalBalls / 6;
    const runRate = overs > 0 ? totalRuns / overs : 0;

    return {
      totalRuns,
      totalWickets,
      boundaries,
      sixes,
      dots,
      legalBalls,
      extras,
      runRate,
      overBreakdown: overBreakdown.sort((a, b) => a.over - b.over),
      topBatsmen,
      topBowlers,
      dotPercentage: legalBalls > 0 ? (dots / legalBalls) * 100 : 0,
      boundaryPercentage: legalBalls > 0 ? ((boundaries + sixes) / legalBalls) * 100 : 0,
    };
  }, [deliveries, deathOversStart, playerNames]);

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skull className="h-5 w-5 text-primary" />
            Death Overs Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Death overs analysis will appear after over {deathOversStart}
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
            <Skull className="h-5 w-5 text-primary" />
            Death Overs Analysis
          </CardTitle>
          <Badge variant="outline">
            Overs {deathOversStart}-{totalOvers}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-primary">{analysis.totalRuns}</p>
            <p className="text-xs text-muted-foreground">Runs</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-red-500">{analysis.totalWickets}</p>
            <p className="text-xs text-muted-foreground">Wickets</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-green-500">{analysis.boundaries + analysis.sixes}</p>
            <p className="text-xs text-muted-foreground">Boundaries</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{analysis.runRate.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Run Rate</p>
          </div>
        </div>

        {/* Over-by-Over Chart */}
        {analysis.overBreakdown.length > 0 && (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analysis.overBreakdown}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="over" 
                  className="text-xs"
                  tickFormatter={(v) => `${v}`}
                />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'runs' ? 'Runs' : name === 'wickets' ? 'Wickets' : 'Boundaries'
                  ]}
                />
                <Bar dataKey="runs" fill="hsl(var(--primary))">
                  {analysis.overBreakdown.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={entry.wickets > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Control Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Dot Ball %</span>
              <span className="font-medium">{analysis.dotPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={analysis.dotPercentage} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Boundary %</span>
              <span className="font-medium">{analysis.boundaryPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={analysis.boundaryPercentage} className="h-2" />
          </div>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-2 gap-4">
          {/* Top Batsmen */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Top Batsmen
            </h4>
            <div className="space-y-1">
              {analysis.topBatsmen.map((batsman, idx) => (
                <div key={batsman.id} className="flex justify-between text-xs p-2 rounded bg-muted/30">
                  <span className="truncate">{batsman.name}</span>
                  <span className="font-medium">{batsman.runs} ({batsman.balls})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Bowlers */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              Top Bowlers
            </h4>
            <div className="space-y-1">
              {analysis.topBowlers.map((bowler, idx) => (
                <div key={bowler.id} className="flex justify-between text-xs p-2 rounded bg-muted/30">
                  <span className="truncate">{bowler.name}</span>
                  <span className="font-medium">{bowler.economy.toFixed(2)} eco</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeathOversAnalysis;
