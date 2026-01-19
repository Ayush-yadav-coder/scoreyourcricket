import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { Activity } from 'lucide-react';

interface Delivery {
  runs: number;
  is_wicket: boolean;
  over_number: number;
  ball_number: number;
}

interface MomentumGraphProps {
  deliveries: Delivery[];
  team1Name: string;
  team2Name: string;
  innings1Deliveries?: Delivery[];
  innings2Deliveries?: Delivery[];
}

const MomentumGraph: React.FC<MomentumGraphProps> = ({
  deliveries,
  team1Name,
  team2Name,
  innings1Deliveries = [],
  innings2Deliveries = [],
}) => {
  const graphData = useMemo(() => {
    // Group deliveries by over for both innings
    const processInnings = (dels: Delivery[]) => {
      const overData: { [key: number]: { runs: number; wickets: number } } = {};
      
      dels.forEach(d => {
        if (!overData[d.over_number]) {
          overData[d.over_number] = { runs: 0, wickets: 0 };
        }
        overData[d.over_number].runs += d.runs || 0;
        if (d.is_wicket) overData[d.over_number].wickets++;
      });

      return overData;
    };

    const innings1Data = processInnings(innings1Deliveries.length > 0 ? innings1Deliveries : deliveries);
    const innings2Data = processInnings(innings2Deliveries);

    // Calculate cumulative runs and momentum
    const data = [];
    let team1Total = 0;
    let team2Total = 0;
    
    const maxOvers = Math.max(
      ...Object.keys(innings1Data).map(Number),
      ...Object.keys(innings2Data).map(Number),
      0
    ) + 1;

    for (let over = 0; over < maxOvers; over++) {
      const t1 = innings1Data[over] || { runs: 0, wickets: 0 };
      const t2 = innings2Data[over] || { runs: 0, wickets: 0 };
      
      team1Total += t1.runs;
      team2Total += t2.runs;

      // Calculate momentum (runs - wickets * 10)
      const t1Momentum = t1.runs - (t1.wickets * 10);
      const t2Momentum = t2.runs - (t2.wickets * 10);

      data.push({
        over: over + 1,
        team1Runs: team1Total,
        team2Runs: team2Total,
        team1Momentum: t1Momentum,
        team2Momentum: t2Momentum,
        team1OverRuns: t1.runs,
        team2OverRuns: t2.runs,
      });
    }

    return data;
  }, [deliveries, innings1Deliveries, innings2Deliveries]);

  // Calculate worm chart data (cumulative runs)
  const wormData = useMemo(() => {
    const processWorm = (dels: Delivery[]) => {
      const data: { over: number; runs: number }[] = [];
      let cumulative = 0;
      let currentOver = 0;
      let overRuns = 0;

      dels.sort((a, b) => {
        if (a.over_number !== b.over_number) return a.over_number - b.over_number;
        return a.ball_number - b.ball_number;
      });

      dels.forEach(d => {
        if (d.over_number !== currentOver) {
          if (currentOver >= 0) {
            data.push({ over: currentOver + 1, runs: cumulative });
          }
          currentOver = d.over_number;
          overRuns = 0;
        }
        cumulative += d.runs || 0;
        overRuns += d.runs || 0;
      });

      // Add final over
      if (dels.length > 0) {
        data.push({ over: currentOver + 1, runs: cumulative });
      }

      return data;
    };

    return {
      team1: processWorm(innings1Deliveries.length > 0 ? innings1Deliveries : deliveries),
      team2: processWorm(innings2Deliveries),
    };
  }, [deliveries, innings1Deliveries, innings2Deliveries]);

  // Combine worm data for chart
  const combinedWormData = useMemo(() => {
    const maxOvers = Math.max(
      wormData.team1.length,
      wormData.team2.length,
      1
    );

    const data = [];
    for (let i = 0; i < maxOvers; i++) {
      data.push({
        over: i + 1,
        [team1Name]: wormData.team1[i]?.runs || null,
        [team2Name]: wormData.team2[i]?.runs || null,
      });
    }
    return data;
  }, [wormData, team1Name, team2Name]);

  if (graphData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Worm Chart */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Manhattan & Worm Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedWormData}>
                <defs>
                  <linearGradient id="team1Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="team2Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="over" 
                  tick={{ fontSize: 10 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey={team1Name} 
                  stroke="hsl(var(--primary))" 
                  fill="url(#team1Gradient)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                {innings2Deliveries.length > 0 && (
                  <Area 
                    type="monotone" 
                    dataKey={team2Name} 
                    stroke="hsl(var(--destructive))" 
                    fill="url(#team2Gradient)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span>{team1Name}</span>
            </div>
            {innings2Deliveries.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span>{team2Name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Over-by-over comparison */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Over-by-Over Run Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graphData}>
                <XAxis 
                  dataKey="over" 
                  tick={{ fontSize: 10 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  domain={[0, 'auto']}
                />
                <ReferenceLine y={6} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [value, name.includes('1') ? team1Name : team2Name]}
                />
                <Line 
                  type="monotone" 
                  dataKey="team1OverRuns" 
                  name={team1Name}
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
                {innings2Deliveries.length > 0 && (
                  <Line 
                    type="monotone" 
                    dataKey="team2OverRuns" 
                    name={team2Name}
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MomentumGraph;
