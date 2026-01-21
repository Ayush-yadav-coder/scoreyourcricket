import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, TrendingUp, TrendingDown, Zap } from 'lucide-react';
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

interface RealTimeWinProbabilityProps {
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
    id?: string;
    over_number: number;
    ball_number: number;
    runs: number | null;
    is_wicket: boolean | null;
    is_boundary?: boolean;
    is_six?: boolean;
  }[];
  isLive?: boolean;
}

interface ProbabilityPoint {
  over: number;
  ball: number;
  team1: number;
  team2: number;
  event?: 'wicket' | 'boundary' | 'six' | 'milestone';
}

const RealTimeWinProbability: React.FC<RealTimeWinProbabilityProps> = ({
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
  isLive = true,
}) => {
  const [probabilityHistory, setProbabilityHistory] = useState<ProbabilityPoint[]>([]);
  const [currentProbability, setCurrentProbability] = useState({ team1: 50, team2: 50 });
  const [animatedProb, setAnimatedProb] = useState({ team1: 50, team2: 50 });
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [momentum, setMomentum] = useState<'up' | 'down' | 'stable'>('stable');
  const prevDeliveriesLengthRef = useRef(0);

  // Smooth animation for probability changes
  useEffect(() => {
    const animationDuration = 800;
    const steps = 30;
    const stepDuration = animationDuration / steps;
    
    const team1Diff = currentProbability.team1 - animatedProb.team1;
    const team2Diff = currentProbability.team2 - animatedProb.team2;
    const team1Step = team1Diff / steps;
    const team2Step = team2Diff / steps;
    
    let step = 0;
    const animate = setInterval(() => {
      step++;
      if (step >= steps) {
        setAnimatedProb(currentProbability);
        clearInterval(animate);
      } else {
        setAnimatedProb(prev => ({
          team1: prev.team1 + team1Step,
          team2: prev.team2 + team2Step,
        }));
      }
    }, stepDuration);
    
    return () => clearInterval(animate);
  }, [currentProbability]);

  // Calculate probabilities on delivery changes
  useEffect(() => {
    calculateProbabilities();
    
    // Detect new delivery events
    if (deliveries.length > prevDeliveriesLengthRef.current) {
      const latestDelivery = deliveries[deliveries.length - 1];
      if (latestDelivery) {
        if (latestDelivery.is_wicket) {
          setLastEvent('WICKET! 🏏');
          setMomentum(currentBattingTeamId === team1Id ? 'down' : 'up');
        } else if (latestDelivery.is_six) {
          setLastEvent('SIX! 💥');
          setMomentum(currentBattingTeamId === team1Id ? 'up' : 'down');
        } else if (latestDelivery.is_boundary) {
          setLastEvent('FOUR! 🏏');
          setMomentum(currentBattingTeamId === team1Id ? 'up' : 'down');
        } else {
          setLastEvent(null);
          setMomentum('stable');
        }
        
        // Clear event after 3 seconds
        setTimeout(() => setLastEvent(null), 3000);
      }
    }
    prevDeliveriesLengthRef.current = deliveries.length;
  }, [deliveries, currentScore, currentWickets, currentOvers]);

  const calculateProbabilities = () => {
    const history: ProbabilityPoint[] = [{ over: 0, ball: 0, team1: 50, team2: 50 }];
    let cumulativeRuns = 0;
    let cumulativeWickets = 0;

    // Calculate probability for each ball
    const sortedDeliveries = [...deliveries].sort((a, b) => {
      if (a.over_number !== b.over_number) return a.over_number - b.over_number;
      return a.ball_number - b.ball_number;
    });

    sortedDeliveries.forEach((delivery, index) => {
      cumulativeRuns += delivery.runs || 0;
      if (delivery.is_wicket) cumulativeWickets++;

      const ballsPlayed = index + 1;
      const currentOver = delivery.over_number + (delivery.ball_number / 10);
      
      let chasingTeamProb = 50;

      if (targetScore) {
        // Second innings calculations
        const runsNeeded = targetScore - cumulativeRuns;
        const ballsRemaining = (totalOvers * 6) - ballsPlayed;
        const requiredRunRate = ballsRemaining > 0 ? (runsNeeded / ballsRemaining) * 6 : 99;
        const currentRunRate = ballsPlayed > 0 ? (cumulativeRuns / ballsPlayed) * 6 : 0;
        const wicketsRemaining = 10 - cumulativeWickets;

        // Base probability from run rate
        if (requiredRunRate <= 5) chasingTeamProb = 75;
        else if (requiredRunRate <= 7) chasingTeamProb = 65;
        else if (requiredRunRate <= 9) chasingTeamProb = 55;
        else if (requiredRunRate <= 11) chasingTeamProb = 45;
        else if (requiredRunRate <= 13) chasingTeamProb = 35;
        else chasingTeamProb = 20;

        // Adjust for wickets
        chasingTeamProb += (wicketsRemaining - 5) * 3;

        // Adjust for death overs pressure
        if (currentOver > totalOvers - 5 && requiredRunRate > 10) {
          chasingTeamProb -= 10;
        }

        // Momentum adjustment
        if (delivery.is_six || delivery.is_boundary) {
          chasingTeamProb += 3;
        }
        if (delivery.is_wicket) {
          chasingTeamProb -= 8;
        }

      } else {
        // First innings calculations
        const projectedScore = ballsPlayed > 0 
          ? (cumulativeRuns / ballsPlayed) * (totalOvers * 6)
          : 0;
        
        if (projectedScore > 200) chasingTeamProb = 75;
        else if (projectedScore > 170) chasingTeamProb = 65;
        else if (projectedScore > 140) chasingTeamProb = 55;
        else if (projectedScore > 110) chasingTeamProb = 45;
        else chasingTeamProb = 35;

        chasingTeamProb -= cumulativeWickets * 3;
      }

      chasingTeamProb = Math.max(5, Math.min(95, chasingTeamProb));

      let event: 'wicket' | 'boundary' | 'six' | 'milestone' | undefined;
      if (delivery.is_wicket) event = 'wicket';
      else if (delivery.is_six) event = 'six';
      else if (delivery.is_boundary) event = 'boundary';

      const team1Prob = currentBattingTeamId === team1Id ? chasingTeamProb : 100 - chasingTeamProb;
      const team2Prob = 100 - team1Prob;

      history.push({
        over: delivery.over_number + 1,
        ball: delivery.ball_number,
        team1: team1Prob,
        team2: team2Prob,
        event,
      });
    });

    // Set current probability
    if (history.length > 0) {
      const latest = history[history.length - 1];
      setCurrentProbability({ team1: latest.team1, team2: latest.team2 });
    }

    setProbabilityHistory(history);
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload.event) return null;

    let color = 'hsl(var(--primary))';
    let size = 6;
    
    if (payload.event === 'wicket') {
      color = 'hsl(var(--destructive))';
      size = 8;
    } else if (payload.event === 'six') {
      color = 'hsl(142 76% 36%)';
      size = 8;
    } else if (payload.event === 'boundary') {
      color = 'hsl(48 96% 53%)';
      size = 6;
    }

    return (
      <circle
        cx={cx}
        cy={cy}
        r={size}
        fill={color}
        stroke="white"
        strokeWidth={2}
        className="animate-pulse"
      />
    );
  };

  const getWinner = () => {
    if (animatedProb.team1 > animatedProb.team2) {
      return { name: team1Name, prob: animatedProb.team1 };
    }
    return { name: team2Name, prob: animatedProb.team2 };
  };

  const winner = getWinner();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Live Win Probability
          </CardTitle>
          <div className="flex items-center gap-2">
            {momentum === 'up' && <TrendingUp className="h-4 w-4 text-green-500 animate-bounce" />}
            {momentum === 'down' && <TrendingDown className="h-4 w-4 text-red-500 animate-bounce" />}
            {isLive && (
              <Badge variant="destructive" className="animate-pulse">
                <span className="mr-1">●</span> LIVE
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event Alert */}
        {lastEvent && (
          <div className="text-center py-2 px-4 bg-primary/20 rounded-lg animate-pulse">
            <p className="font-bold text-lg">{lastEvent}</p>
          </div>
        )}

        {/* Animated Probability Bars */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{team1Name}</span>
              <span className="font-bold text-primary transition-all duration-300">
                {animatedProb.team1.toFixed(1)}%
              </span>
            </div>
            <div className="h-4 rounded-full overflow-hidden bg-muted relative">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700 ease-out"
                style={{ width: `${animatedProb.team1}%` }}
              />
              {animatedProb.team1 > animatedProb.team2 && (
                <Zap className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-yellow-500 animate-pulse" />
              )}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{team2Name}</span>
              <span className="font-bold text-secondary-foreground transition-all duration-300">
                {animatedProb.team2.toFixed(1)}%
              </span>
            </div>
            <div className="h-4 rounded-full overflow-hidden bg-muted relative">
              <div 
                className="h-full bg-gradient-to-r from-secondary to-secondary/70 transition-all duration-700 ease-out"
                style={{ width: `${animatedProb.team2}%` }}
              />
              {animatedProb.team2 > animatedProb.team1 && (
                <Zap className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-yellow-500 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Current Prediction */}
        <div className="text-center p-3 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border">
          <p className="text-xs text-muted-foreground">Predicted Winner</p>
          <p className="text-xl font-bold flex items-center justify-center gap-2">
            {winner.name}
            <Badge variant="outline">{winner.prob.toFixed(0)}%</Badge>
          </p>
        </div>

        {/* Ball-by-Ball Timeline Chart */}
        {probabilityHistory.length > 2 && (
          <div className="h-48 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={probabilityHistory}>
                <defs>
                  <linearGradient id="team1Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="team2Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="over" 
                  className="text-xs"
                  tickFormatter={(v) => `${v}`}
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
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)}%`,
                    name === 'team1' ? team1Name : team2Name
                  ]}
                  labelFormatter={(label) => `Over ${label}`}
                />
                <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                <Area 
                  type="monotone" 
                  dataKey="team1" 
                  name="team1"
                  stroke="hsl(var(--primary))" 
                  fill="url(#team1Gradient)"
                  strokeWidth={2}
                  dot={<CustomDot />}
                  isAnimationActive={true}
                  animationDuration={500}
                />
                <Area 
                  type="monotone" 
                  dataKey="team2" 
                  name="team2"
                  stroke="hsl(var(--secondary))" 
                  fill="url(#team2Gradient)"
                  strokeWidth={2}
                  isAnimationActive={true}
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Context Stats */}
        {targetScore && (
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            <div className="p-2 rounded bg-muted/50">
              <p className="font-bold text-lg">{targetScore - currentScore}</p>
              <p className="text-xs text-muted-foreground">Runs Needed</p>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <p className="font-bold text-lg">{Math.round((totalOvers - currentOvers) * 6)}</p>
              <p className="text-xs text-muted-foreground">Balls Left</p>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <p className="font-bold text-lg">{10 - currentWickets}</p>
              <p className="text-xs text-muted-foreground">Wickets</p>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <p className="font-bold text-lg">
                {((totalOvers - currentOvers) * 6 > 0 
                  ? ((targetScore - currentScore) / ((totalOvers - currentOvers) * 6) * 6).toFixed(2) 
                  : '0.00')}
              </p>
              <p className="text-xs text-muted-foreground">Req. RR</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimeWinProbability;
