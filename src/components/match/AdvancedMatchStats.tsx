import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  Activity,
  BarChart3,
  Timer,
  Percent
} from 'lucide-react';

interface Delivery {
  runs: number;
  is_wicket: boolean;
  is_boundary: boolean;
  is_six: boolean;
  is_wide: boolean;
  is_no_ball: boolean;
  over_number: number;
  ball_number: number;
}

interface Innings {
  total_runs: number;
  total_wickets: number;
  total_overs: number;
  is_completed: boolean;
}

interface AdvancedMatchStatsProps {
  currentInnings: Innings;
  targetScore?: number;
  deliveries: Delivery[];
  matchOvers?: number;
}

const AdvancedMatchStats: React.FC<AdvancedMatchStatsProps> = ({
  currentInnings,
  targetScore,
  deliveries,
  matchOvers = 20,
}) => {
  const stats = useMemo(() => {
    const totalBalls = currentInnings.total_overs * 6 + (deliveries.length % 6);
    const remainingBalls = (matchOvers * 6) - totalBalls;
    const remainingOvers = remainingBalls / 6;

    // Current Run Rate
    const currentRR = currentInnings.total_overs > 0 
      ? currentInnings.total_runs / currentInnings.total_overs 
      : 0;

    // Required Run Rate (if chasing)
    const requiredRR = targetScore && remainingOvers > 0
      ? (targetScore - currentInnings.total_runs) / remainingOvers
      : 0;

    // Projected Score
    const projectedScore = currentRR * matchOvers;

    // Boundary percentage
    const boundaries = deliveries.filter(d => d.is_boundary || d.is_six).length;
    const boundaryPercentage = deliveries.length > 0 
      ? (boundaries / deliveries.length) * 100 
      : 0;

    // Dot ball percentage
    const dotBalls = deliveries.filter(d => d.runs === 0 && !d.is_wide && !d.is_no_ball && !d.is_wicket).length;
    const dotBallPercentage = deliveries.length > 0 
      ? (dotBalls / deliveries.length) * 100 
      : 0;

    // Momentum (runs in last 3 overs vs overall RR)
    const last18Balls = deliveries.slice(-18);
    const recentRuns = last18Balls.reduce((sum, d) => sum + (d.runs || 0), 0);
    const recentRR = last18Balls.length > 0 ? (recentRuns / (last18Balls.length / 6)) : 0;
    const momentum = currentRR > 0 ? ((recentRR - currentRR) / currentRR) * 100 : 0;

    // Win probability (simplified calculation based on RRR vs CRR)
    let winProbability = 50;
    if (targetScore) {
      if (currentInnings.total_runs >= targetScore) {
        winProbability = 100;
      } else if (currentInnings.total_wickets >= 10 || remainingBalls <= 0) {
        winProbability = 0;
      } else {
        const rrrRatio = requiredRR / Math.max(currentRR, 0.1);
        const wicketsRemaining = 10 - currentInnings.total_wickets;
        winProbability = Math.min(100, Math.max(0, 
          (100 - (rrrRatio - 1) * 30) * (wicketsRemaining / 10)
        ));
      }
    }

    // Scoring phases
    const powerplayRuns = deliveries.filter(d => d.over_number < 6).reduce((sum, d) => sum + (d.runs || 0), 0);
    const middleRuns = deliveries.filter(d => d.over_number >= 6 && d.over_number < 15).reduce((sum, d) => sum + (d.runs || 0), 0);
    const deathRuns = deliveries.filter(d => d.over_number >= 15).reduce((sum, d) => sum + (d.runs || 0), 0);

    return {
      currentRR,
      requiredRR,
      projectedScore,
      boundaryPercentage,
      dotBallPercentage,
      momentum,
      winProbability,
      remainingBalls,
      remainingOvers,
      powerplayRuns,
      middleRuns,
      deathRuns,
    };
  }, [currentInnings, targetScore, deliveries, matchOvers]);

  return (
    <div className="space-y-4">
      {/* Run Rate Card */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Run Rate Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary">{stats.currentRR.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Current RR</p>
            </div>
            {targetScore && (
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className={`text-2xl font-bold ${stats.requiredRR > stats.currentRR ? 'text-red-500' : 'text-green-500'}`}>
                  {stats.requiredRR.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Required RR</p>
              </div>
            )}
            {!targetScore && (
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{Math.round(stats.projectedScore)}</p>
                <p className="text-xs text-muted-foreground">Projected</p>
              </div>
            )}
          </div>

          {/* Momentum Indicator */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">Momentum</span>
            <div className="flex items-center gap-2">
              {stats.momentum > 5 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : stats.momentum < -5 ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <Activity className="h-4 w-4 text-yellow-500" />
              )}
              <Badge variant={stats.momentum > 5 ? 'default' : stats.momentum < -5 ? 'destructive' : 'secondary'}>
                {stats.momentum > 0 ? '+' : ''}{stats.momentum.toFixed(1)}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Win Probability */}
      {targetScore && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Win Probability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Batting Team</span>
                <span className="font-bold">{Math.round(stats.winProbability)}%</span>
              </div>
              <Progress value={stats.winProbability} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(stats.remainingOvers)} overs left</span>
                <span>Need {targetScore - currentInnings.total_runs} runs</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ball Analysis */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Ball Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Boundaries</span>
                <span className="text-green-500">{stats.boundaryPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={stats.boundaryPercentage} className="h-2 bg-muted" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Dot Balls</span>
                <span className="text-red-500">{stats.dotBallPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={stats.dotBallPercentage} className="h-2 bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase-wise Scoring */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Phase-wise Scoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-3 bg-blue-500/10 rounded-lg">
              <p className="text-lg font-bold">{stats.powerplayRuns}</p>
              <p className="text-xs text-muted-foreground">Powerplay</p>
              <p className="text-xs text-muted-foreground">(1-6)</p>
            </div>
            <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
              <p className="text-lg font-bold">{stats.middleRuns}</p>
              <p className="text-xs text-muted-foreground">Middle</p>
              <p className="text-xs text-muted-foreground">(7-15)</p>
            </div>
            <div className="text-center p-3 bg-red-500/10 rounded-lg">
              <p className="text-lg font-bold">{stats.deathRuns}</p>
              <p className="text-xs text-muted-foreground">Death</p>
              <p className="text-xs text-muted-foreground">(16-20)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedMatchStats;
