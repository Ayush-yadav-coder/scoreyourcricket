import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Loader2, 
  Trophy, 
  Target, 
  TrendingUp,
  Calendar,
  Users
} from 'lucide-react';

interface BattingStats {
  matches: number;
  innings: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  highest: number;
  average: number;
  strikeRate: number;
  fifties: number;
  hundreds: number;
  notOuts: number;
}

interface BowlingStats {
  matches: number;
  innings: number;
  overs: number;
  runs: number;
  wickets: number;
  best: string;
  average: number;
  economy: number;
  strikeRate: number;
  fiveWickets: number;
  maidens: number;
}

interface MatchHistory {
  id: string;
  date: string;
  team1: string;
  team2: string;
  result: string;
  battingRuns?: number;
  battingBalls?: number;
  bowlingWickets?: number;
  bowlingRuns?: number;
  bowlingOvers?: number;
}

const Career: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [battingStats, setBattingStats] = useState<BattingStats | null>(null);
  const [bowlingStats, setBowlingStats] = useState<BowlingStats | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchCareerStats = async () => {
      setLoading(true);

      // Fetch batting stats
      const { data: battingData } = await supabase
        .from('batting_scores')
        .select('runs, balls_faced, fours, sixes, is_out, innings_id')
        .eq('batsman_id', user.id);

      if (battingData && battingData.length > 0) {
        const totalRuns = battingData.reduce((sum, b) => sum + (b.runs || 0), 0);
        const totalBalls = battingData.reduce((sum, b) => sum + (b.balls_faced || 0), 0);
        const totalFours = battingData.reduce((sum, b) => sum + (b.fours || 0), 0);
        const totalSixes = battingData.reduce((sum, b) => sum + (b.sixes || 0), 0);
        const dismissals = battingData.filter(b => b.is_out).length;
        const notOuts = battingData.length - dismissals;
        const scores = battingData.map(b => b.runs || 0);
        const highest = Math.max(...scores, 0);
        const fifties = scores.filter(s => s >= 50 && s < 100).length;
        const hundreds = scores.filter(s => s >= 100).length;

        setBattingStats({
          matches: new Set(battingData.map(b => b.innings_id)).size,
          innings: battingData.length,
          runs: totalRuns,
          balls: totalBalls,
          fours: totalFours,
          sixes: totalSixes,
          highest,
          average: dismissals > 0 ? totalRuns / dismissals : totalRuns,
          strikeRate: totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0,
          fifties,
          hundreds,
          notOuts,
        });
      }

      // Fetch bowling stats
      const { data: bowlingData } = await supabase
        .from('bowling_scores')
        .select('overs, runs_conceded, wickets, maidens, innings_id')
        .eq('bowler_id', user.id);

      if (bowlingData && bowlingData.length > 0) {
        const totalOvers = bowlingData.reduce((sum, b) => sum + Number(b.overs || 0), 0);
        const totalRuns = bowlingData.reduce((sum, b) => sum + (b.runs_conceded || 0), 0);
        const totalWickets = bowlingData.reduce((sum, b) => sum + (b.wickets || 0), 0);
        const totalMaidens = bowlingData.reduce((sum, b) => sum + (b.maidens || 0), 0);
        
        // Find best bowling
        let bestWickets = 0;
        let bestRuns = 999;
        bowlingData.forEach(b => {
          if ((b.wickets || 0) > bestWickets || 
              ((b.wickets || 0) === bestWickets && (b.runs_conceded || 0) < bestRuns)) {
            bestWickets = b.wickets || 0;
            bestRuns = b.runs_conceded || 0;
          }
        });
        
        const fiveWickets = bowlingData.filter(b => (b.wickets || 0) >= 5).length;

        setBowlingStats({
          matches: new Set(bowlingData.map(b => b.innings_id)).size,
          innings: bowlingData.length,
          overs: totalOvers,
          runs: totalRuns,
          wickets: totalWickets,
          best: `${bestWickets}/${bestRuns}`,
          average: totalWickets > 0 ? totalRuns / totalWickets : 0,
          economy: totalOvers > 0 ? totalRuns / totalOvers : 0,
          strikeRate: totalWickets > 0 ? (totalOvers * 6) / totalWickets : 0,
          fiveWickets,
          maidens: totalMaidens,
        });
      }

      // Fetch match history (last 10 matches)
      const { data: recentBatting } = await supabase
        .from('batting_scores')
        .select(`
          runs, balls_faced, innings_id,
          innings:innings_id (
            match_id,
            matches:match_id (
              id, started_at, status,
              team1:team1_id (name),
              team2:team2_id (name)
            )
          )
        `)
        .eq('batsman_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const matches: MatchHistory[] = [];
      const seenMatches = new Set<string>();

      if (recentBatting) {
        for (const batting of recentBatting) {
          const innings = batting.innings as any;
          const match = innings?.matches as any;
          
          if (match && !seenMatches.has(match.id)) {
            seenMatches.add(match.id);
            matches.push({
              id: match.id,
              date: match.started_at ? new Date(match.started_at).toLocaleDateString() : 'N/A',
              team1: match.team1?.name || 'Team 1',
              team2: match.team2?.name || 'Team 2',
              result: match.status === 'completed' ? 'Completed' : match.status,
              battingRuns: batting.runs,
              battingBalls: batting.balls_faced,
            });
          }
        }
      }

      setMatchHistory(matches);
      setLoading(false);
    };

    fetchCareerStats();
  }, [user, navigate]);

  if (!user) return null;

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold mb-1">My Career</h1>
          <p className="text-muted-foreground">
            {profile?.full_name || 'Your'} cricket statistics
          </p>
        </div>

        {/* Stats Tabs */}
        <Tabs defaultValue="batting" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="batting">Batting</TabsTrigger>
            <TabsTrigger value="bowling">Bowling</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
          </TabsList>

          <TabsContent value="batting">
            {battingStats ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Matches" value={battingStats.matches} icon={Trophy} highlight />
                  <StatCard label="Total Runs" value={battingStats.runs} icon={TrendingUp} highlight />
                  <StatCard label="Average" value={battingStats.average.toFixed(2)} icon={Target} highlight />
                  <StatCard label="Strike Rate" value={battingStats.strikeRate.toFixed(2)} highlight />
                </div>

                {/* Detailed Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Batting Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-2xl font-bold">{battingStats.innings}</p>
                        <p className="text-xs text-muted-foreground">Innings</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-2xl font-bold">{battingStats.notOuts}</p>
                        <p className="text-xs text-muted-foreground">Not Outs</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-2xl font-bold">{battingStats.highest}</p>
                        <p className="text-xs text-muted-foreground">Highest Score</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-2xl font-bold">{battingStats.balls}</p>
                        <p className="text-xs text-muted-foreground">Balls Faced</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-2xl font-bold">{battingStats.fours}</p>
                        <p className="text-xs text-muted-foreground">Fours</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-2xl font-bold">{battingStats.sixes}</p>
                        <p className="text-xs text-muted-foreground">Sixes</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-2xl font-bold">{battingStats.fifties}</p>
                        <p className="text-xs text-muted-foreground">50s</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-2xl font-bold">{battingStats.hundreds}</p>
                        <p className="text-xs text-muted-foreground">100s</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No batting records yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Play some matches to see your stats!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bowling">
            {bowlingStats ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Matches" value={bowlingStats.matches} icon={Trophy} highlight />
                  <StatCard label="Wickets" value={bowlingStats.wickets} icon={Target} highlight />
                  <StatCard label="Average" value={bowlingStats.average.toFixed(2)} highlight />
                  <StatCard label="Economy" value={bowlingStats.economy.toFixed(2)} icon={TrendingUp} highlight />
                </div>

                {/* Detailed Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Bowling Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-2xl font-bold">{bowlingStats.innings}</p>
                        <p className="text-xs text-muted-foreground">Innings</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-2xl font-bold">{bowlingStats.overs.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">Overs</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-2xl font-bold">{bowlingStats.runs}</p>
                        <p className="text-xs text-muted-foreground">Runs Conceded</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-2xl font-bold">{bowlingStats.best}</p>
                        <p className="text-xs text-muted-foreground">Best Bowling</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-2xl font-bold">{bowlingStats.strikeRate.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">Strike Rate</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-2xl font-bold">{bowlingStats.maidens}</p>
                        <p className="text-xs text-muted-foreground">Maidens</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-2xl font-bold">{bowlingStats.fiveWickets}</p>
                        <p className="text-xs text-muted-foreground">5 Wicket Hauls</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-2xl font-bold">
                          {bowlingStats.wickets > 0 ? Math.floor((bowlingStats.overs * 6) / bowlingStats.wickets) : '-'}
                        </p>
                        <p className="text-xs text-muted-foreground">Balls/Wicket</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No bowling records yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Start bowling to track your stats!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="matches">
            {matchHistory.length > 0 ? (
              <div className="space-y-3">
                {matchHistory.map((match) => (
                  <Card key={match.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="h-4 w-4 text-primary" />
                            <span className="font-medium">{match.team1} vs {match.team2}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{match.date}</span>
                            <Badge variant="outline" className="ml-2">{match.result}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          {match.battingRuns !== undefined && (
                            <div className="text-sm">
                              <span className="font-bold">{match.battingRuns}</span>
                              <span className="text-muted-foreground">({match.battingBalls})</span>
                            </div>
                          )}
                          {match.bowlingWickets !== undefined && (
                            <div className="text-sm">
                              <span className="font-bold">{match.bowlingWickets}/{match.bowlingRuns}</span>
                              <span className="text-muted-foreground"> ({match.bowlingOvers})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No match history yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Your recent matches will appear here</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

const StatCard: React.FC<{ 
  label: string; 
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}> = ({ label, value, icon: Icon, highlight }) => (
  <Card className={highlight ? 'border-primary/30 bg-primary/5' : ''}>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        {Icon && <Icon className="h-5 w-5 text-primary/50" />}
      </div>
    </CardContent>
  </Card>
);

export default Career;
