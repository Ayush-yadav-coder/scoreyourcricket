import React, { useMemo, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Gauge, TrendingUp, TrendingDown, AlertTriangle, Zap, Flame } from 'lucide-react';

interface Delivery {
  over_number: number;
  ball_number: number;
  runs: number;
  is_wicket: boolean;
  is_boundary?: boolean;
  is_six?: boolean;
  is_wide?: boolean;
  is_no_ball?: boolean;
}

interface PressureIndexProps {
  deliveries: Delivery[];
  currentScore: number;
  currentWickets: number;
  currentOvers: number;
  totalOvers: number;
  targetScore?: number;
  battingTeamName: string;
  bowlingTeamName: string;
  isLive?: boolean;
}

const PressureIndex: React.FC<PressureIndexProps> = ({
  deliveries,
  currentScore,
  currentWickets,
  currentOvers,
  totalOvers,
  targetScore,
  battingTeamName,
  bowlingTeamName,
  isLive = false,
}) => {
  const [animatedPressure, setAnimatedPressure] = useState(50);

  const pressureData = useMemo(() => {
    // Get last 12 balls (2 overs)
    const recentDeliveries = deliveries.slice(-12);
    
    let pressureScore = 50; // Base pressure
    
    // 1. Wickets factor (each wicket adds significant pressure)
    const recentWickets = recentDeliveries.filter(d => d.is_wicket).length;
    pressureScore += recentWickets * 12;

    // 2. Dot balls factor
    const recentDots = recentDeliveries.filter(d => 
      d.runs === 0 && !d.is_wide && !d.is_no_ball && !d.is_wicket
    ).length;
    pressureScore += (recentDots / Math.max(recentDeliveries.length, 1)) * 20;

    // 3. Scoring rate factor
    const recentRuns = recentDeliveries.reduce((sum, d) => sum + d.runs, 0);
    const recentRR = recentDeliveries.length > 0 
      ? (recentRuns / recentDeliveries.length) * 6 
      : 0;
    
    if (targetScore) {
      // Chasing scenario
      const runsNeeded = targetScore - currentScore;
      const ballsRemaining = (totalOvers - currentOvers) * 6;
      const requiredRR = ballsRemaining > 0 ? (runsNeeded / ballsRemaining) * 6 : 0;
      
      // High RRR increases pressure
      if (requiredRR > 12) pressureScore += 25;
      else if (requiredRR > 10) pressureScore += 15;
      else if (requiredRR > 8) pressureScore += 5;
      else if (requiredRR < 6) pressureScore -= 10;

      // Low wickets in hand with high RRR
      if (currentWickets >= 6 && requiredRR > 8) pressureScore += 20;
      if (currentWickets >= 8) pressureScore += 30;
    } else {
      // First innings - pressure from low scoring
      const projectedScore = currentOvers > 0 
        ? (currentScore / currentOvers) * totalOvers 
        : 0;
      
      if (projectedScore < 120) pressureScore += 15;
      if (currentWickets >= 5 && currentOvers < totalOvers * 0.6) pressureScore += 20;
    }

    // 4. Phase pressure
    const oversRemaining = totalOvers - currentOvers;
    if (oversRemaining < 5) pressureScore += 10; // Death overs pressure
    if (oversRemaining < 3) pressureScore += 10; // Final overs
    if (oversRemaining < 1) pressureScore += 15; // Last over

    // 5. Boundaries release pressure
    const recentBoundaries = recentDeliveries.filter(d => d.is_boundary || d.is_six).length;
    pressureScore -= recentBoundaries * 4;

    // Clamp between 0 and 100
    pressureScore = Math.max(0, Math.min(100, pressureScore));

    // Determine who's under pressure
    let pressureOn: 'batting' | 'bowling' | 'balanced' = 'balanced';
    if (pressureScore >= 65) {
      pressureOn = 'batting';
    } else if (pressureScore <= 35) {
      pressureOn = 'bowling';
    }

    // Trend
    const firstHalfPressure = calculateHalfPressure(recentDeliveries.slice(0, 6));
    const secondHalfPressure = calculateHalfPressure(recentDeliveries.slice(6));
    const trend = secondHalfPressure - firstHalfPressure;

    return {
      pressure: pressureScore,
      pressureOn,
      trend,
      recentWickets,
      recentDots,
      recentBoundaries,
      recentRR,
    };
  }, [deliveries, currentScore, currentWickets, currentOvers, totalOvers, targetScore]);

  const calculateHalfPressure = (balls: Delivery[]) => {
    let p = 50;
    const wickets = balls.filter(d => d.is_wicket).length;
    const dots = balls.filter(d => d.runs === 0 && !d.is_wide && !d.is_no_ball).length;
    const boundaries = balls.filter(d => d.is_boundary || d.is_six).length;
    p += wickets * 12 + dots * 2 - boundaries * 4;
    return Math.max(0, Math.min(100, p));
  };

  // Animate pressure changes
  useEffect(() => {
    const diff = pressureData.pressure - animatedPressure;
    if (Math.abs(diff) < 1) {
      setAnimatedPressure(pressureData.pressure);
      return;
    }
    
    const step = diff * 0.1;
    const timer = setInterval(() => {
      setAnimatedPressure(prev => {
        const newVal = prev + step;
        if (Math.abs(pressureData.pressure - newVal) < 1) {
          clearInterval(timer);
          return pressureData.pressure;
        }
        return newVal;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [pressureData.pressure]);

  const getPressureLabel = (pressure: number) => {
    if (pressure >= 80) return { text: 'EXTREME', color: 'text-red-500', bg: 'bg-red-500' };
    if (pressure >= 65) return { text: 'HIGH', color: 'text-orange-500', bg: 'bg-orange-500' };
    if (pressure >= 45) return { text: 'MODERATE', color: 'text-yellow-500', bg: 'bg-yellow-500' };
    if (pressure >= 25) return { text: 'LOW', color: 'text-green-500', bg: 'bg-green-500' };
    return { text: 'MINIMAL', color: 'text-blue-500', bg: 'bg-blue-500' };
  };

  const pressureLabel = getPressureLabel(animatedPressure);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Pressure Index
          </CardTitle>
          {isLive && (
            <Badge variant="destructive" className="animate-pulse">
              <Flame className="h-3 w-3 mr-1" />
              LIVE
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Pressure Gauge */}
        <div className="relative">
          <div className="flex items-center justify-center gap-4">
            <div 
              className="text-6xl font-bold transition-all duration-500"
              style={{
                color: animatedPressure >= 65 
                  ? 'hsl(var(--destructive))' 
                  : animatedPressure <= 35 
                    ? 'hsl(142, 76%, 36%)' 
                    : 'hsl(var(--primary))'
              }}
            >
              {Math.round(animatedPressure)}
            </div>
            <div className="text-left">
              <Badge 
                variant="outline" 
                className={`${pressureLabel.color} transition-all duration-300`}
              >
                {pressureLabel.text}
              </Badge>
              <div className="flex items-center gap-1 mt-1 text-sm">
                {pressureData.trend > 5 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-red-500" />
                    <span className="text-red-500">Rising</span>
                  </>
                ) : pressureData.trend < -5 ? (
                  <>
                    <TrendingDown className="h-4 w-4 text-green-500" />
                    <span className="text-green-500">Easing</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Stable</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Pressure Bar */}
          <div className="mt-4 space-y-1">
            <div className="h-4 rounded-full overflow-hidden bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 relative">
              <div 
                className="absolute top-0 h-full w-2 bg-white border-2 border-black rounded-full transition-all duration-500 -translate-x-1/2"
                style={{ left: `${animatedPressure}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        </div>

        {/* Pressure on */}
        <div className={`p-3 rounded-lg text-center ${
          pressureData.pressureOn === 'batting' 
            ? 'bg-red-500/10 border border-red-500/30' 
            : pressureData.pressureOn === 'bowling'
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-muted/50'
        }`}>
          <p className="text-sm text-muted-foreground">Pressure on</p>
          <p className="font-bold text-lg">
            {pressureData.pressureOn === 'batting' 
              ? battingTeamName 
              : pressureData.pressureOn === 'bowling'
                ? bowlingTeamName
                : 'Evenly Balanced'}
          </p>
        </div>

        {/* Contributing Factors */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Last 2 Overs</h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded bg-muted/50">
              <div className={`text-lg font-bold ${pressureData.recentWickets > 0 ? 'text-red-500' : ''}`}>
                {pressureData.recentWickets}
              </div>
              <div className="text-xs text-muted-foreground">Wickets</div>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <div className={`text-lg font-bold ${pressureData.recentDots > 6 ? 'text-orange-500' : ''}`}>
                {pressureData.recentDots}
              </div>
              <div className="text-xs text-muted-foreground">Dots</div>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <div className={`text-lg font-bold ${pressureData.recentBoundaries > 2 ? 'text-green-500' : ''}`}>
                {pressureData.recentBoundaries}
              </div>
              <div className="text-xs text-muted-foreground">Bndrys</div>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <div className="text-lg font-bold">
                {pressureData.recentRR.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">Run Rate</div>
            </div>
          </div>
        </div>

        {/* Alert for high pressure */}
        {animatedPressure >= 75 && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
            <span className="text-sm font-medium">
              {battingTeamName} under significant pressure!
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PressureIndex;
