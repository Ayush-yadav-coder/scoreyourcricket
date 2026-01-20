import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Flame, Award } from 'lucide-react';

interface BowlerStats {
  name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  dotBalls?: number;
}

interface BowlerComparisonProps {
  team1Bowlers: BowlerStats[];
  team2Bowlers: BowlerStats[];
  team1Name: string;
  team2Name: string;
}

const BowlerComparison: React.FC<BowlerComparisonProps> = ({
  team1Bowlers,
  team2Bowlers,
  team1Name,
  team2Name,
}) => {
  const getBestBowler = (bowlers: BowlerStats[]): BowlerStats | null => {
    if (bowlers.length === 0) return null;
    return bowlers.reduce((best, current) => {
      // Priority: wickets > economy
      if (current.wickets > best.wickets) return current;
      if (current.wickets === best.wickets && current.economy < best.economy) return current;
      return best;
    }, bowlers[0]);
  };

  const best1 = getBestBowler(team1Bowlers);
  const best2 = getBestBowler(team2Bowlers);

  const team1Wickets = team1Bowlers.reduce((sum, b) => sum + b.wickets, 0);
  const team2Wickets = team2Bowlers.reduce((sum, b) => sum + b.wickets, 0);
  const team1Economy = team1Bowlers.length > 0 
    ? team1Bowlers.reduce((sum, b) => sum + b.economy, 0) / team1Bowlers.length 
    : 0;
  const team2Economy = team2Bowlers.length > 0 
    ? team2Bowlers.reduce((sum, b) => sum + b.economy, 0) / team2Bowlers.length 
    : 0;

  const ComparisonRow: React.FC<{
    label: string;
    value1: number;
    value2: number;
    format?: (v: number) => string;
    lowerIsBetter?: boolean;
  }> = ({ label, value1, value2, format = (v) => v.toString(), lowerIsBetter = false }) => {
    const total = value1 + value2;
    const percent1 = total > 0 ? (value1 / total) * 100 : 50;
    const better1 = lowerIsBetter ? value1 < value2 : value1 > value2;
    const better2 = lowerIsBetter ? value2 < value1 : value2 > value1;

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className={better1 ? 'font-bold text-primary' : 'text-muted-foreground'}>
            {format(value1)}
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className={better2 ? 'font-bold text-primary' : 'text-muted-foreground'}>
            {format(value2)}
          </span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden bg-muted">
          <div 
            className={`${better1 ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            style={{ width: `${percent1}%` }}
          />
          <div 
            className={`${better2 ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            style={{ width: `${100 - percent1}%` }}
          />
        </div>
      </div>
    );
  };

  if (team1Bowlers.length === 0 && team2Bowlers.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          Bowling Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team Headers */}
        <div className="flex justify-between text-sm font-semibold">
          <span>{team1Name}</span>
          <span>{team2Name}</span>
        </div>

        {/* Comparison Stats */}
        <div className="space-y-3">
          <ComparisonRow 
            label="Total Wickets" 
            value1={team1Wickets} 
            value2={team2Wickets} 
          />
          <ComparisonRow 
            label="Avg Economy" 
            value1={team1Economy} 
            value2={team2Economy}
            format={(v) => v.toFixed(2)}
            lowerIsBetter
          />
        </div>

        {/* Best Bowlers */}
        {(best1 || best2) && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t">
            {best1 && (
              <div className="p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-accent" />
                  <span className="text-xs text-muted-foreground">Best Bowler</span>
                </div>
                <p className="font-semibold text-sm">{best1.name}</p>
                <p className="text-lg font-bold text-primary">
                  {best1.wickets}/{best1.runs}
                </p>
                <p className="text-xs text-muted-foreground">
                  {best1.overs} ov • Econ: {best1.economy.toFixed(2)}
                </p>
              </div>
            )}
            {best2 && (
              <div className="p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-accent" />
                  <span className="text-xs text-muted-foreground">Best Bowler</span>
                </div>
                <p className="font-semibold text-sm">{best2.name}</p>
                <p className="text-lg font-bold text-primary">
                  {best2.wickets}/{best2.runs}
                </p>
                <p className="text-xs text-muted-foreground">
                  {best2.overs} ov • Econ: {best2.economy.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BowlerComparison;
