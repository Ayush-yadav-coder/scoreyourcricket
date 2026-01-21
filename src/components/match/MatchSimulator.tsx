import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  RefreshCw, 
  Target, 
  Zap, 
  TrendingUp,
  Loader2,
  BarChart2,
  Dice5
} from 'lucide-react';

interface MatchSimulatorProps {
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  team1Wickets: number;
  team2Wickets: number;
  team1Overs: number;
  team2Overs: number;
  totalOvers: number;
  isSecondInnings: boolean;
  target?: number;
  groundStats?: {
    avgFirstInningsScore: number;
    avgSecondInningsScore: number;
    chaseSuccessRate: number;
  };
}

interface SimulationResult {
  team1Wins: number;
  team2Wins: number;
  draws: number;
  avgTeam1Score: number;
  avgTeam2Score: number;
  scenarios: {
    type: string;
    probability: number;
    description: string;
  }[];
}

const MatchSimulator: React.FC<MatchSimulatorProps> = ({
  team1Name,
  team2Name,
  team1Score,
  team2Score,
  team1Wickets,
  team2Wickets,
  team1Overs,
  team2Overs,
  totalOvers,
  isSecondInnings,
  target,
  groundStats,
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationCount, setSimulationCount] = useState([1000]);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [simulationProgress, setSimulationProgress] = useState(0);

  const runSimulation = async () => {
    setIsSimulating(true);
    setSimulationProgress(0);
    
    const numSims = simulationCount[0];
    let team1Wins = 0;
    let team2Wins = 0;
    let draws = 0;
    let totalTeam1Score = 0;
    let totalTeam2Score = 0;

    // Simulate in batches for UI updates
    const batchSize = 100;
    const batches = Math.ceil(numSims / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const simsInBatch = Math.min(batchSize, numSims - batch * batchSize);
      
      for (let i = 0; i < simsInBatch; i++) {
        const simResult = simulateMatch();
        if (simResult.winner === 'team1') team1Wins++;
        else if (simResult.winner === 'team2') team2Wins++;
        else draws++;
        
        totalTeam1Score += simResult.team1FinalScore;
        totalTeam2Score += simResult.team2FinalScore;
      }

      setSimulationProgress(((batch + 1) / batches) * 100);
      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const scenarios = generateScenarios(team1Wins, team2Wins, draws, numSims);

    setResult({
      team1Wins,
      team2Wins,
      draws,
      avgTeam1Score: Math.round(totalTeam1Score / numSims),
      avgTeam2Score: Math.round(totalTeam2Score / numSims),
      scenarios,
    });

    setIsSimulating(false);
  };

  const simulateMatch = () => {
    // Current state
    let t1Score = team1Score;
    let t1Wickets = team1Wickets;
    let t1Overs = team1Overs;
    let t2Score = team2Score;
    let t2Wickets = team2Wickets;
    let t2Overs = team2Overs;

    // Base run rate per ball (varies by phase)
    const getRunRateForPhase = (overs: number) => {
      if (overs < 6) return 1.3; // Powerplay
      if (overs < 15) return 1.1; // Middle overs
      return 1.5; // Death overs
    };

    // Wicket probability per ball (varies by phase and wickets lost)
    const getWicketProb = (overs: number, wickets: number) => {
      const baseProb = 0.03;
      const wicketFactor = 1 + (wickets * 0.02);
      const phaseFactor = overs > 15 ? 1.3 : 1;
      return baseProb * wicketFactor * phaseFactor;
    };

    // Simulate remaining first innings
    if (!isSecondInnings) {
      while (t1Overs < totalOvers && t1Wickets < 10) {
        const runsPerBall = getRunRateForPhase(t1Overs);
        const wicketProb = getWicketProb(t1Overs, t1Wickets);
        
        // Simulate 6 balls
        for (let ball = 0; ball < 6 && t1Wickets < 10; ball++) {
          if (Math.random() < wicketProb) {
            t1Wickets++;
          } else {
            // Random runs with weighted distribution
            const rand = Math.random();
            if (rand < 0.35) t1Score += 0; // Dot
            else if (rand < 0.65) t1Score += 1;
            else if (rand < 0.80) t1Score += 2;
            else if (rand < 0.90) t1Score += 4;
            else t1Score += 6;
          }
        }
        t1Overs++;
      }
    }

    const targetForTeam2 = isSecondInnings && target ? target : t1Score + 1;

    // Simulate second innings
    while (t2Overs < totalOvers && t2Wickets < 10 && t2Score < targetForTeam2) {
      const runsPerBall = getRunRateForPhase(t2Overs);
      const wicketProb = getWicketProb(t2Overs, t2Wickets);
      
      // Adjust aggression based on required rate
      const runsNeeded = targetForTeam2 - t2Score;
      const ballsRemaining = (totalOvers - t2Overs) * 6;
      const reqRate = ballsRemaining > 0 ? (runsNeeded / ballsRemaining) * 6 : 10;
      const aggressionFactor = Math.min(2, Math.max(1, reqRate / 7));
      
      for (let ball = 0; ball < 6 && t2Wickets < 10 && t2Score < targetForTeam2; ball++) {
        const adjustedWicketProb = wicketProb * (aggressionFactor > 1.3 ? 1.5 : 1);
        
        if (Math.random() < adjustedWicketProb) {
          t2Wickets++;
        } else {
          const rand = Math.random();
          const boundaryBoost = aggressionFactor > 1.3 ? 0.1 : 0;
          
          if (rand < 0.30 - boundaryBoost) t2Score += 0;
          else if (rand < 0.55) t2Score += 1;
          else if (rand < 0.75) t2Score += 2;
          else if (rand < 0.88 + boundaryBoost) t2Score += 4;
          else t2Score += 6;
        }
      }
      t2Overs++;
    }

    let winner: 'team1' | 'team2' | 'draw' = 'draw';
    if (t2Score >= targetForTeam2) {
      winner = 'team2';
    } else if (t2Score < t1Score || t2Wickets >= 10 || t2Overs >= totalOvers) {
      winner = 'team1';
    }

    return {
      winner,
      team1FinalScore: t1Score,
      team2FinalScore: t2Score,
    };
  };

  const generateScenarios = (
    team1Wins: number, 
    team2Wins: number, 
    draws: number, 
    total: number
  ) => {
    const scenarios = [];
    const t1WinPct = (team1Wins / total) * 100;
    const t2WinPct = (team2Wins / total) * 100;

    if (t1WinPct > 70) {
      scenarios.push({
        type: 'dominant',
        probability: t1WinPct,
        description: `${team1Name} is heavily favored to win this match`,
      });
    } else if (t1WinPct > 55) {
      scenarios.push({
        type: 'likely',
        probability: t1WinPct,
        description: `${team1Name} has the edge but ${team2Name} can still win`,
      });
    }

    if (t2WinPct > 70) {
      scenarios.push({
        type: 'dominant',
        probability: t2WinPct,
        description: `${team2Name} is heavily favored to win this match`,
      });
    } else if (t2WinPct > 55) {
      scenarios.push({
        type: 'likely',
        probability: t2WinPct,
        description: `${team2Name} has the edge but ${team1Name} can still win`,
      });
    }

    if (Math.abs(t1WinPct - t2WinPct) < 15) {
      scenarios.push({
        type: 'close',
        probability: Math.min(t1WinPct, t2WinPct),
        description: 'This is shaping up to be a nail-biter!',
      });
    }

    if (isSecondInnings && target) {
      const reqRate = (target - team2Score) / ((totalOvers - team2Overs) * 6) * 6;
      if (reqRate > 12) {
        scenarios.push({
          type: 'high_rr',
          probability: t2WinPct,
          description: `${team2Name} needs ${reqRate.toFixed(2)} RPO - a tough ask!`,
        });
      }
    }

    return scenarios;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Dice5 className="h-5 w-5 text-primary" />
            Match Simulator
          </CardTitle>
          <Badge variant="outline">Monte Carlo</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Simulation Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Simulations: {simulationCount[0].toLocaleString()}</span>
          </div>
          <Slider
            value={simulationCount}
            onValueChange={setSimulationCount}
            min={100}
            max={10000}
            step={100}
            disabled={isSimulating}
          />
          
          <Button 
            onClick={runSimulation} 
            disabled={isSimulating}
            className="w-full"
          >
            {isSimulating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Simulating... {simulationProgress.toFixed(0)}%
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Simulation
              </>
            )}
          </Button>
        </div>

        {/* Progress during simulation */}
        {isSimulating && (
          <Progress value={simulationProgress} className="h-2" />
        )}

        {/* Results */}
        {result && !isSimulating && (
          <div className="space-y-4 pt-4 border-t">
            {/* Win Probability */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                Win Probability
              </h4>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{team1Name}</span>
                    <span className="font-bold">
                      {((result.team1Wins / simulationCount[0]) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={(result.team1Wins / simulationCount[0]) * 100} 
                    className="h-3" 
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{team2Name}</span>
                    <span className="font-bold">
                      {((result.team2Wins / simulationCount[0]) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={(result.team2Wins / simulationCount[0]) * 100} 
                    className="h-3" 
                  />
                </div>
              </div>
            </div>

            {/* Projected Scores */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{result.avgTeam1Score}</p>
                <p className="text-xs text-muted-foreground">{team1Name} Avg Score</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{result.avgTeam2Score}</p>
                <p className="text-xs text-muted-foreground">{team2Name} Avg Score</p>
              </div>
            </div>

            {/* Scenario Analysis */}
            {result.scenarios.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Match Insights
                </h4>
                <div className="space-y-2">
                  {result.scenarios.map((scenario, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-lg bg-primary/5 border text-sm"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={scenario.type === 'dominant' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {scenario.probability.toFixed(0)}%
                        </Badge>
                        <Zap className="h-3 w-3 text-yellow-500" />
                      </div>
                      <p className="text-muted-foreground">{scenario.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Simulation Stats */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Based on {simulationCount[0].toLocaleString()} Monte Carlo simulations
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchSimulator;
