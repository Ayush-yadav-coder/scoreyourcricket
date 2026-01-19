import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Target, Zap } from 'lucide-react';

interface MatchPredictionProps {
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team1Wickets: number;
  team1Overs: number;
  team2Score: number;
  team2Wickets: number;
  team2Overs: number;
  totalOvers: number;
  isFirstInnings: boolean;
  target?: number;
}

const MatchPrediction: React.FC<MatchPredictionProps> = ({
  team1Name,
  team2Name,
  team1Score,
  team1Wickets,
  team1Overs,
  team2Score,
  team2Wickets,
  team2Overs,
  totalOvers,
  isFirstInnings,
  target,
}) => {
  // Calculate win probability based on multiple factors
  const calculateWinProbability = () => {
    if (isFirstInnings) {
      // During first innings, probability is based on run rate and wickets
      const runRate = team1Overs > 0 ? team1Score / team1Overs : 0;
      const projectedScore = runRate * totalOvers;
      const wicketFactor = 1 - (team1Wickets * 0.08); // Each wicket reduces probability
      
      // Base probability for batting team
      let team1Prob = 50;
      
      // Adjust based on run rate
      if (runRate > 8) team1Prob += 15;
      else if (runRate > 6) team1Prob += 8;
      else if (runRate < 4) team1Prob -= 10;
      
      // Adjust based on wickets
      team1Prob = team1Prob * wicketFactor;
      
      return {
        team1: Math.min(Math.max(team1Prob, 5), 95),
        team2: Math.min(Math.max(100 - team1Prob, 5), 95),
      };
    } else {
      // During chase
      if (!target) return { team1: 50, team2: 50 };
      
      const requiredRuns = target - team2Score;
      const remainingOvers = totalOvers - team2Overs;
      const remainingWickets = 10 - team2Wickets;
      
      if (requiredRuns <= 0) return { team1: 0, team2: 100 };
      if (remainingWickets <= 0) return { team1: 100, team2: 0 };
      if (remainingOvers <= 0) return { team1: 100, team2: 0 };
      
      const requiredRunRate = requiredRuns / remainingOvers;
      const currentRunRate = team2Overs > 0 ? team2Score / team2Overs : 0;
      
      // Base probability
      let team2Prob = 50;
      
      // Adjust based on required vs current run rate
      const rateRatio = currentRunRate / requiredRunRate;
      if (rateRatio > 1.2) team2Prob += 25;
      else if (rateRatio > 1) team2Prob += 15;
      else if (rateRatio > 0.8) team2Prob += 5;
      else if (rateRatio < 0.6) team2Prob -= 25;
      else if (rateRatio < 0.8) team2Prob -= 10;
      
      // Wicket factor
      const wicketFactor = remainingWickets / 10;
      team2Prob = team2Prob * (0.5 + wicketFactor * 0.5);
      
      // Overs remaining factor
      if (remainingOvers < 3 && requiredRuns > 30) team2Prob -= 20;
      if (remainingOvers > 10 && requiredRuns < 50) team2Prob += 15;
      
      return {
        team1: Math.min(Math.max(100 - team2Prob, 5), 95),
        team2: Math.min(Math.max(team2Prob, 5), 95),
      };
    }
  };

  const probability = calculateWinProbability();
  
  // Calculate projected score for first innings
  const getProjectedScore = () => {
    if (!isFirstInnings) return null;
    const runRate = team1Overs > 0 ? team1Score / team1Overs : 0;
    return Math.round(runRate * totalOvers);
  };

  // Calculate required run rate for chase
  const getRequiredRunRate = () => {
    if (isFirstInnings || !target) return null;
    const remaining = target - team2Score;
    const remainingOvers = totalOvers - team2Overs;
    return remainingOvers > 0 ? (remaining / remainingOvers).toFixed(2) : '∞';
  };

  const projectedScore = getProjectedScore();
  const requiredRunRate = getRequiredRunRate();
  const currentRunRate = isFirstInnings 
    ? (team1Overs > 0 ? (team1Score / team1Overs).toFixed(2) : '0.00')
    : (team2Overs > 0 ? (team2Score / team2Overs).toFixed(2) : '0.00');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Win Probability
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Win Probability Bars */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{team1Name}</span>
              <span className="text-primary font-bold">{probability.team1.toFixed(1)}%</span>
            </div>
            <Progress value={probability.team1} className="h-3" />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{team2Name}</span>
              <span className="text-primary font-bold">{probability.team2.toFixed(1)}%</span>
            </div>
            <Progress value={probability.team2} className="h-3" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <div>
              <p className="text-xs text-muted-foreground">Current RR</p>
              <p className="font-bold">{currentRunRate}</p>
            </div>
          </div>
          
          {isFirstInnings && projectedScore !== null && (
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Projected</p>
                <p className="font-bold">{projectedScore}</p>
              </div>
            </div>
          )}
          
          {!isFirstInnings && requiredRunRate && (
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Required RR</p>
                <p className="font-bold">{requiredRunRate}</p>
              </div>
            </div>
          )}
        </div>

        {/* Match Situation */}
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            {isFirstInnings ? (
              <>
                {team1Name} are batting. Projected score: <strong>{projectedScore}</strong> at current rate.
              </>
            ) : target ? (
              <>
                {team2Name} need <strong>{Math.max(0, target - team2Score)}</strong> runs from{' '}
                <strong>{Math.max(0, (totalOvers - team2Overs) * 6).toFixed(0)}</strong> balls.
              </>
            ) : (
              'Chase in progress'
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchPrediction;
