import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Swords, TrendingUp, Target, Zap } from 'lucide-react';

interface BatsmanVsBowlerStatsProps {
  batsmanId: string;
  bowlerId: string;
  batsmanName: string;
  bowlerName: string;
}

interface MatchupStats {
  ballsFaced: number;
  runs: number;
  dismissals: number;
  fours: number;
  sixes: number;
  dots: number;
  strikeRate: number;
  averageAgainst: number;
}

const BatsmanVsBowlerStats: React.FC<BatsmanVsBowlerStatsProps> = ({
  batsmanId,
  bowlerId,
  batsmanName,
  bowlerName,
}) => {
  const [stats, setStats] = useState<MatchupStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatchupStats();
  }, [batsmanId, bowlerId]);

  const fetchMatchupStats = async () => {
    try {
      // Fetch all deliveries between this batsman and bowler
      const { data: deliveries } = await supabase
        .from('deliveries')
        .select('*')
        .eq('batsman_id', batsmanId)
        .eq('bowler_id', bowlerId);

      if (!deliveries || deliveries.length === 0) {
        setStats(null);
        setLoading(false);
        return;
      }

      const ballsFaced = deliveries.filter(d => !d.is_wide).length;
      const runs = deliveries.reduce((sum, d) => sum + (d.runs || 0), 0);
      const dismissals = deliveries.filter(d => d.is_wicket).length;
      const fours = deliveries.filter(d => d.is_boundary && !d.is_six).length;
      const sixes = deliveries.filter(d => d.is_six).length;
      const dots = deliveries.filter(d => (d.runs || 0) === 0 && !d.is_wicket && !d.is_wide && !d.is_no_ball).length;

      setStats({
        ballsFaced,
        runs,
        dismissals,
        fours,
        sixes,
        dots,
        strikeRate: ballsFaced > 0 ? (runs / ballsFaced) * 100 : 0,
        averageAgainst: dismissals > 0 ? runs / dismissals : runs,
      });
    } catch (error) {
      console.error('Error fetching matchup stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse flex items-center justify-center">
            <div className="h-16 w-full bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Swords className="h-4 w-4" />
            {batsmanName} vs {bowlerName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center">
            First time facing each other
          </p>
        </CardContent>
      </Card>
    );
  }

  const dotBallPercent = stats.ballsFaced > 0 ? (stats.dots / stats.ballsFaced) * 100 : 0;
  const boundaryPercent = stats.ballsFaced > 0 ? ((stats.fours + stats.sixes) / stats.ballsFaced) * 100 : 0;

  const getDominance = () => {
    if (stats.dismissals >= 3) return { text: 'Bowler Dominates', color: 'text-red-500' };
    if (stats.strikeRate >= 150 && stats.dismissals === 0) return { text: 'Batsman Dominates', color: 'text-green-500' };
    if (stats.strikeRate >= 120) return { text: 'Slight Edge: Batsman', color: 'text-blue-500' };
    if (stats.strikeRate < 80) return { text: 'Slight Edge: Bowler', color: 'text-orange-500' };
    return { text: 'Even Contest', color: 'text-yellow-500' };
  };

  const dominance = getDominance();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Swords className="h-4 w-4 text-primary" />
            Matchup: {batsmanName} vs {bowlerName}
          </CardTitle>
          <Badge variant="outline" className={dominance.color}>
            {dominance.text}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded bg-muted/50">
            <p className="text-lg font-bold">{stats.runs}</p>
            <p className="text-xs text-muted-foreground">Runs</p>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <p className="text-lg font-bold">{stats.ballsFaced}</p>
            <p className="text-xs text-muted-foreground">Balls</p>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <p className="text-lg font-bold">{stats.dismissals}</p>
            <p className="text-xs text-muted-foreground">Dismissals</p>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <p className="text-lg font-bold">{stats.strikeRate.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">SR</p>
          </div>
        </div>

        {/* Breakdown Bars */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Dot Ball %</span>
              <span className="font-medium">{dotBallPercent.toFixed(1)}%</span>
            </div>
            <Progress value={dotBallPercent} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Boundary %</span>
              <span className="font-medium">{boundaryPercent.toFixed(1)}%</span>
            </div>
            <Progress value={boundaryPercent} className="h-2" />
          </div>
        </div>

        {/* Boundary Breakdown */}
        <div className="flex justify-center gap-6">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-green-500" />
            <span className="text-sm">{stats.fours} Fours</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-orange-500" />
            <span className="text-sm">{stats.sixes} Sixes</span>
          </div>
        </div>

        {/* Average */}
        <div className="text-center p-2 rounded bg-primary/10">
          <p className="text-sm text-muted-foreground">
            Average against this bowler
          </p>
          <p className="text-xl font-bold">
            {stats.averageAgainst.toFixed(1)}
            {stats.dismissals === 0 && <span className="text-sm text-green-500">*</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BatsmanVsBowlerStats;
