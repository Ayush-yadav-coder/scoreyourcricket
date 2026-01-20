import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  Line,
  ComposedChart,
  Bar,
  Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Zap, AlertTriangle } from 'lucide-react';

interface Delivery {
  over_number: number;
  ball_number: number;
  runs: number | null;
  is_wicket: boolean | null;
  is_boundary: boolean | null;
  is_six: boolean | null;
}

interface EnhancedRunRateGraphProps {
  deliveries: Delivery[];
  teamName?: string;
  targetScore?: number;
  totalOvers?: number;
}

const EnhancedRunRateGraph: React.FC<EnhancedRunRateGraphProps> = ({ 
  deliveries, 
  teamName,
  targetScore,
  totalOvers = 20
}) => {
  const graphData = useMemo(() => {
    if (deliveries.length === 0) return [];

    const overMap = new Map<number, { runs: number; wickets: number; boundaries: number; sixes: number; balls: number }>();
    
    deliveries.forEach(d => {
      const over = d.over_number;
      const existing = overMap.get(over) || { runs: 0, wickets: 0, boundaries: 0, sixes: 0, balls: 0 };
      overMap.set(over, {
        runs: existing.runs + (d.runs || 0),
        wickets: existing.wickets + (d.is_wicket ? 1 : 0),
        boundaries: existing.boundaries + (d.is_boundary ? 1 : 0),
        sixes: existing.sixes + (d.is_six ? 1 : 0),
        balls: existing.balls + 1,
      });
    });

    let cumulativeRuns = 0;
    let cumulativeWickets = 0;
    const data: any[] = [];

    // Calculate momentum based on run rate changes
    let prevRunRate = 0;
    
    Array.from(overMap.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([over, stats], idx) => {
        cumulativeRuns += stats.runs;
        cumulativeWickets += stats.wickets;
        
        const currentRR = cumulativeRuns / (over + 1);
        const requiredRR = targetScore 
          ? (targetScore - cumulativeRuns) / Math.max(1, totalOvers - over - 1)
          : 0;
        
        // Momentum: positive when scoring accelerates, negative when it slows
        const momentum = idx > 0 ? ((currentRR - prevRunRate) / Math.max(prevRunRate, 1)) * 100 : 0;
        
        // Determine phase
        let phase = 'middle';
        if (over < 6) phase = 'powerplay';
        else if (over >= 15) phase = 'death';
        
        // Pressure index: based on required rate vs current rate
        const pressureIndex = targetScore 
          ? Math.max(0, Math.min(100, (requiredRR / Math.max(currentRR, 0.1)) * 50))
          : 0;
        
        data.push({
          over: over + 1,
          runs: stats.runs,
          cumulativeRuns,
          wickets: stats.wickets,
          cumulativeWickets,
          runRate: Math.round(currentRR * 100) / 100,
          requiredRR: Math.round(requiredRR * 100) / 100,
          momentum: Math.round(momentum),
          boundaries: stats.boundaries,
          sixes: stats.sixes,
          phase,
          pressureIndex: Math.round(pressureIndex),
          isMomentumShift: Math.abs(momentum) > 25,
        });
        
        prevRunRate = currentRR;
      });

    return data;
  }, [deliveries, targetScore, totalOvers]);

  // Find momentum shifts
  const momentumShifts = useMemo(() => {
    return graphData
      .filter(d => d.isMomentumShift)
      .map(d => ({
        over: d.over,
        type: d.momentum > 0 ? 'positive' : 'negative',
        value: d.momentum,
        runs: d.runs,
        wickets: d.wickets,
      }));
  }, [graphData]);

  // Calculate phase summaries
  const phaseSummary = useMemo(() => {
    const phases = {
      powerplay: { runs: 0, wickets: 0, overs: 0 },
      middle: { runs: 0, wickets: 0, overs: 0 },
      death: { runs: 0, wickets: 0, overs: 0 },
    };

    graphData.forEach(d => {
      const phase = d.phase as keyof typeof phases;
      phases[phase].runs += d.runs;
      phases[phase].wickets += d.wickets;
      phases[phase].overs += 1;
    });

    return phases;
  }, [graphData]);

  if (graphData.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Enhanced Run Rate Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">No delivery data available</p>
        </CardContent>
      </Card>
    );
  }

  const currentRR = graphData[graphData.length - 1]?.runRate || 0;
  const projectedScore = Math.round(currentRR * totalOvers);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Run Rate Analysis {teamName && `- ${teamName}`}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">RR: {currentRR}</Badge>
            <Badge variant="outline">Projected: {projectedScore}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Graph */}
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={graphData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRuns" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPressure" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="over" 
                tick={{ fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                label={{ value: 'Overs', position: 'insideBottom', offset: -5, fontSize: 12 }}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                label={{ value: 'Runs', angle: -90, position: 'insideLeft', fontSize: 12 }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                domain={[0, 15]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    cumulativeRuns: 'Total Score',
                    runRate: 'Run Rate',
                    requiredRR: 'Required RR',
                    runs: 'Runs in Over',
                    momentum: 'Momentum %',
                  };
                  return [value, labels[name] || name];
                }}
              />
              <Legend />
              
              {/* Cumulative runs area */}
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="cumulativeRuns" 
                name="Total Score"
                stroke="hsl(var(--primary))" 
                fillOpacity={1}
                fill="url(#colorRuns)"
                strokeWidth={2}
              />
              
              {/* Per-over runs as bars */}
              <Bar 
                yAxisId="right"
                dataKey="runs" 
                name="Runs/Over"
                fill="hsl(var(--primary))"
                opacity={0.5}
                radius={[2, 2, 0, 0]}
              />
              
              {/* Run rate line */}
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="runRate" 
                name="Run Rate"
                stroke="hsl(var(--accent))" 
                strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(var(--accent))' }}
              />
              
              {/* Required run rate line (if chasing) */}
              {targetScore && (
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="requiredRR" 
                  name="Required RR"
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
              
              {/* Phase markers */}
              <ReferenceLine x={6} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" yAxisId="left" />
              <ReferenceLine x={15} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" yAxisId="left" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Momentum Shifts */}
        {momentumShifts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              Momentum Shifts
            </h4>
            <div className="flex flex-wrap gap-2">
              {momentumShifts.map((shift, idx) => (
                <Badge 
                  key={idx}
                  variant={shift.type === 'positive' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {shift.type === 'positive' ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  Over {shift.over}: {shift.runs} runs
                  {shift.wickets > 0 && ` (${shift.wickets}W)`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Phase Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-secondary/30 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Powerplay (1-6)</p>
            <p className="font-bold text-lg">
              {phaseSummary.powerplay.runs}/{phaseSummary.powerplay.wickets}
            </p>
            <p className="text-xs text-muted-foreground">
              RR: {phaseSummary.powerplay.overs > 0 
                ? (phaseSummary.powerplay.runs / phaseSummary.powerplay.overs).toFixed(2) 
                : '-'}
            </p>
          </div>
          <div className="p-3 bg-secondary/30 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Middle (7-15)</p>
            <p className="font-bold text-lg">
              {phaseSummary.middle.runs}/{phaseSummary.middle.wickets}
            </p>
            <p className="text-xs text-muted-foreground">
              RR: {phaseSummary.middle.overs > 0 
                ? (phaseSummary.middle.runs / phaseSummary.middle.overs).toFixed(2) 
                : '-'}
            </p>
          </div>
          <div className="p-3 bg-secondary/30 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Death (16-20)</p>
            <p className="font-bold text-lg">
              {phaseSummary.death.runs}/{phaseSummary.death.wickets}
            </p>
            <p className="text-xs text-muted-foreground">
              RR: {phaseSummary.death.overs > 0 
                ? (phaseSummary.death.runs / phaseSummary.death.overs).toFixed(2) 
                : '-'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedRunRateGraph;
