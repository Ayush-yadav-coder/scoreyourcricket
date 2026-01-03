import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Target, Zap } from 'lucide-react';

interface PlayerPerformance {
  player_id: string;
  player_name: string;
  avatar_url?: string | null;
  performance_type: 'batting' | 'bowling' | 'fielding';
  runs?: number;
  balls_faced?: number;
  fours?: number;
  sixes?: number;
  wickets?: number;
  overs?: number;
  runs_conceded?: number;
  catches?: number;
  strike_rate?: number;
  economy?: number;
}

interface MatchAwardsProps {
  playerOfMatch?: PlayerPerformance;
  bestBatsman?: PlayerPerformance;
  bestBowler?: PlayerPerformance;
  starPerformances: PlayerPerformance[];
  matchStatus: string;
}

const MatchAwards: React.FC<MatchAwardsProps> = ({
  playerOfMatch,
  bestBatsman,
  bestBowler,
  starPerformances,
  matchStatus,
}) => {
  if (matchStatus !== 'completed') {
    return null;
  }

  const getPerformanceStats = (performance: PlayerPerformance) => {
    if (performance.performance_type === 'batting') {
      return `${performance.runs} (${performance.balls_faced}) • ${performance.fours || 0}×4 ${performance.sixes || 0}×6 • SR: ${performance.strike_rate?.toFixed(1) || 0}`;
    } else if (performance.performance_type === 'bowling') {
      return `${performance.wickets}/${performance.runs_conceded} (${performance.overs}) • Econ: ${performance.economy?.toFixed(1) || 0}`;
    }
    return `${performance.catches} catches`;
  };

  return (
    <div className="space-y-6">
      {/* Player of the Match */}
      {playerOfMatch && (
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              Player of the Match
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                {playerOfMatch.avatar_url ? (
                  <img 
                    src={playerOfMatch.avatar_url} 
                    alt={playerOfMatch.player_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Trophy className="w-8 h-8 text-primary" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">{playerOfMatch.player_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {getPerformanceStats(playerOfMatch)}
                </p>
                <Badge variant="secondary" className="mt-2">
                  {playerOfMatch.performance_type === 'batting' ? 'Batting' : 'Bowling'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best Batsman & Best Bowler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bestBatsman && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-5 h-5 text-green-500" />
                Best Batsman
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center overflow-hidden">
                  {bestBatsman.avatar_url ? (
                    <img 
                      src={bestBatsman.avatar_url} 
                      alt={bestBatsman.player_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Target className="w-6 h-6 text-green-500" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{bestBatsman.player_name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {bestBatsman.runs} ({bestBatsman.balls_faced}) • SR: {bestBatsman.strike_rate?.toFixed(1)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {bestBowler && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-5 h-5 text-red-500" />
                Best Bowler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center overflow-hidden">
                  {bestBowler.avatar_url ? (
                    <img 
                      src={bestBowler.avatar_url} 
                      alt={bestBowler.player_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Zap className="w-6 h-6 text-red-500" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{bestBowler.player_name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {bestBowler.wickets}/{bestBowler.runs_conceded} ({bestBowler.overs}) • Econ: {bestBowler.economy?.toFixed(1)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Star Performances */}
      {starPerformances.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Star Performances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {starPerformances.slice(0, 4).map((performance, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center overflow-hidden">
                    {performance.avatar_url ? (
                      <img 
                        src={performance.avatar_url} 
                        alt={performance.player_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Star className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground text-sm truncate">
                      {performance.player_name}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {getPerformanceStats(performance)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {performance.performance_type === 'batting' ? 'Bat' : 'Bowl'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MatchAwards;
