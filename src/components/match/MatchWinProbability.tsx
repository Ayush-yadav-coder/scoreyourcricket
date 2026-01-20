import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Activity } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface MatchWinProbabilityProps {
  team1Name: string;
  team2Name: string;
  team1Id: string;
  team2Id: string;
  currentBattingTeamId: string;
  targetScore: number | null;
  currentScore: number;
  currentWickets: number;
  currentOvers: number;
  totalOvers: number;
  deliveries: {
    over_number: number;
    runs: number | null;
    is_wicket: boolean | null;
  }[];
}

interface ProbabilityPoint {
  over: number;
  team1: number;
  team2: number;
}

const MatchWinProbability: React.FC<MatchWinProbabilityProps> = ({
  team1Name,
  team2Name,
  team1Id,
  team2Id,
  currentBattingTeamId,
  targetScore,
  currentScore,
  currentWickets,
  currentOvers,
  totalOvers,
  deliveries,
}) => {
  const [probabilityHistory, setProbabilityHistory] = useState<ProbabilityPoint[]>([]);
  const [currentProbability, setCurrentProbability] = useState({ team1: 50, team2: 50 });

  useEffect(() => {
    calculateProbabilities();
  }, [deliveries, currentScore, currentWickets, currentOvers]);

  const calculateProbabilities = () => {
    const history: ProbabilityPoint[] = [];
    let cumulativeRuns = 0;
    let cumulativeWickets = 0;
    let lastOver = 0;

    // If chasing (2nd innings)
    if (targetScore) {
      const requiredRuns = targetScore - currentScore;
      const remainingBalls = (totalOvers - currentOvers) * 6;
      const remainingWickets = 10 - currentWickets;
      const requiredRunRate = remainingBalls > 0 ? (requiredRuns / remainingBalls) * 6 : 99;
      const currentRunRate = currentOvers > 0 ? currentScore / currentOvers : 0;

      // Calculate win probability based on multiple factors
      let chasingTeamProb = 50;

      // Run rate factor
      if (requiredRunRate <= 6) chasingTeamProb += 15;
      else if (requiredRunRate <= 8) chasingTeamProb += 10;
      else if (requiredRunRate <= 10) chasingTeamProb += 5;
      else if (requiredRunRate <= 12) chasingTeamProb -= 5;
      else if (requiredRunRate <= 15) chasingTeamProb -= 15;
      else chasingTeamProb -= 25;

      // Wickets factor
      if (remainingWickets >= 8) chasingTeamProb += 10;
      else if (remainingWickets >= 6) chasingTeamProb += 5;
      else if (remainingWickets <= 3) chasingTeamProb -= 15;
      else if (remainingWickets <= 5) chasingTeamProb -= 5;

      // Overs remaining factor
      const oversRatio = (totalOvers - currentOvers) / totalOvers;
      if (oversRatio > 0.5 && requiredRunRate < 8) chasingTeamProb += 10;
      if (oversRatio < 0.2 && requiredRunRate > 10) chasingTeamProb -= 15;

      chasingTeamProb = Math.max(5, Math.min(95, chasingTeamProb));

      if (currentBattingTeamId === team1Id) {
        setCurrentProbability({ team1: chasingTeamProb, team2: 100 - chasingTeamProb });
      } else {
        setCurrentProbability({ team1: 100 - chasingTeamProb, team2: chasingTeamProb });
      }

      // Build history
      deliveries.forEach((delivery) => {
        if (delivery.over_number !== lastOver && delivery.over_number > 0) {
          const oversPlayed = delivery.over_number;
          const runsNeeded = targetScore - cumulativeRuns;
          const ballsRemaining = (totalOvers - oversPlayed) * 6;
          const rrr = ballsRemaining > 0 ? (runsNeeded / ballsRemaining) * 6 : 99;

          let prob = 50;
          if (rrr <= 6) prob = 65;
          else if (rrr <= 8) prob = 55;
          else if (rrr <= 10) prob = 45;
          else if (rrr <= 12) prob = 35;
          else prob = 25;

          prob = Math.max(10, Math.min(90, prob - cumulativeWickets * 5));

          history.push({
            over: oversPlayed,
            team1: currentBattingTeamId === team1Id ? prob : 100 - prob,
            team2: currentBattingTeamId === team2Id ? prob : 100 - prob,
          });
          lastOver = delivery.over_number;
        }
        cumulativeRuns += delivery.runs || 0;
        if (delivery.is_wicket) cumulativeWickets++;
      });
    } else {
      // First innings - estimate based on projected score
      const projectedScore = currentOvers > 0 
        ? Math.round((currentScore / currentOvers) * totalOvers)
        : 0;
      
      let battingTeamProb = 50;
      if (projectedScore > 180) battingTeamProb = 65;
      else if (projectedScore > 150) battingTeamProb = 55;
      else if (projectedScore < 120) battingTeamProb = 40;
      else if (projectedScore < 100) battingTeamProb = 30;

      battingTeamProb = Math.max(30, battingTeamProb - currentWickets * 3);

      if (currentBattingTeamId === team1Id) {
        setCurrentProbability({ team1: battingTeamProb, team2: 100 - battingTeamProb });
      } else {
        setCurrentProbability({ team1: 100 - battingTeamProb, team2: battingTeamProb });
      }

      // Build history for first innings
      deliveries.forEach((delivery) => {
        if (delivery.over_number !== lastOver && delivery.over_number > 0) {
          const oversPlayed = delivery.over_number;
          const currentRR = cumulativeRuns / oversPlayed;
          const projected = currentRR * totalOvers;

          let prob = 50;
          if (projected > 180) prob = 60;
          else if (projected > 150) prob = 55;
          else if (projected < 120) prob = 45;
          else if (projected < 100) prob = 40;

          prob = Math.max(25, prob - cumulativeWickets * 3);

          history.push({
            over: oversPlayed,
            team1: currentBattingTeamId === team1Id ? prob : 100 - prob,
            team2: currentBattingTeamId === team2Id ? prob : 100 - prob,
          });
          lastOver = delivery.over_number;
        }
        cumulativeRuns += delivery.runs || 0;
        if (delivery.is_wicket) cumulativeWickets++;
      });
    }

    // Add current point
    history.push({
      over: Math.ceil(currentOvers),
      team1: currentProbability.team1,
      team2: currentProbability.team2,
    });

    setProbabilityHistory(history);
  };

  const getWinnerPrediction = () => {
    if (currentProbability.team1 > currentProbability.team2) {
      return { name: team1Name, prob: currentProbability.team1 };
    }
    return { name: team2Name, prob: currentProbability.team2 };
  };

  const winner = getWinnerPrediction();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Win Probability
          </CardTitle>
          <Badge variant="outline">
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Probability Display */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{team1Name}</span>
              <span className="font-bold text-primary">{currentProbability.team1.toFixed(0)}%</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden bg-muted">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${currentProbability.team1}%` }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{team2Name}</span>
              <span className="font-bold text-secondary-foreground">{currentProbability.team2.toFixed(0)}%</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden bg-muted">
              <div 
                className="h-full bg-secondary transition-all duration-500"
                style={{ width: `${currentProbability.team2}%` }}
              />
            </div>
          </div>
        </div>

        {/* Prediction */}
        <div className="text-center p-3 rounded-lg bg-primary/10">
          <p className="text-sm text-muted-foreground">Current Prediction</p>
          <p className="text-lg font-bold">
            {winner.name} ({winner.prob.toFixed(0)}%)
          </p>
        </div>

        {/* Probability Timeline */}
        {probabilityHistory.length > 1 && (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={probabilityHistory}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="over" 
                  className="text-xs"
                  label={{ value: 'Over', position: 'bottom', offset: -5 }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  className="text-xs"
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`${value.toFixed(0)}%`]}
                />
                <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                <Area 
                  type="monotone" 
                  dataKey="team1" 
                  name={team1Name}
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
                <Area 
                  type="monotone" 
                  dataKey="team2" 
                  name={team2Name}
                  stroke="hsl(var(--secondary))" 
                  fill="hsl(var(--secondary))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Context Info */}
        {targetScore && (
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="p-2 rounded bg-muted/50">
              <p className="font-bold">{targetScore - currentScore}</p>
              <p className="text-xs text-muted-foreground">Runs Needed</p>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <p className="font-bold">{Math.round((totalOvers - currentOvers) * 6)}</p>
              <p className="text-xs text-muted-foreground">Balls Left</p>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <p className="font-bold">{10 - currentWickets}</p>
              <p className="text-xs text-muted-foreground">Wickets Left</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchWinProbability;
