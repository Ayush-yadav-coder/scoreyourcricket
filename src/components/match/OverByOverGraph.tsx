import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface OverData {
  over: number;
  runs: number;
  cumulativeRuns: number;
  wickets: number;
  isBoundary?: boolean;
  isSix?: boolean;
  isWicket?: boolean;
}

interface OverByOverGraphProps {
  overData: OverData[];
  teamName?: string;
}

const OverByOverGraph: React.FC<OverByOverGraphProps> = ({ overData, teamName }) => {
  if (overData.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Run Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">No over data available yet</p>
        </CardContent>
      </Card>
    );
  }

  // Find key events
  const wicketOvers = overData.filter(o => o.isWicket);
  const bigOvers = overData.filter(o => o.runs >= 12);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Run Progression {teamName && `- ${teamName}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={overData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="over" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                label={{ value: 'Overs', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                label={{ value: 'Runs', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'cumulativeRuns') return [value, 'Total Score'];
                  if (name === 'runs') return [value, 'Runs in Over'];
                  return [value, name];
                }}
                labelFormatter={(label) => `Over ${label}`}
              />
              <Legend />
              
              {/* Cumulative runs line */}
              <Line 
                type="monotone" 
                dataKey="cumulativeRuns" 
                name="Total Score"
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
              
              {/* Runs per over as bars conceptually shown via another line */}
              <Line 
                type="monotone" 
                dataKey="runs" 
                name="Runs/Over"
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
              
              {/* Mark wickets */}
              {wicketOvers.map((wo, idx) => (
                <ReferenceDot 
                  key={`wicket-${idx}`}
                  x={wo.over} 
                  y={wo.cumulativeRuns} 
                  r={8} 
                  fill="hsl(var(--destructive))"
                  stroke="hsl(var(--destructive))"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend for events */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Score Progression</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Wicket</span>
          </div>
        </div>

        {/* Summary stats */}
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-foreground">
              {overData.length}
            </p>
            <p className="text-xs text-muted-foreground">Overs</p>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">
              {overData[overData.length - 1]?.cumulativeRuns || 0}
            </p>
            <p className="text-xs text-muted-foreground">Total Runs</p>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">
              {Math.max(...overData.map(o => o.runs))}
            </p>
            <p className="text-xs text-muted-foreground">Best Over</p>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">
              {(overData[overData.length - 1]?.cumulativeRuns / overData.length || 0).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">Run Rate</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OverByOverGraph;
