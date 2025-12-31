import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Target, TrendingUp, Medal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';

interface BatsmanStats {
  player_id: string;
  full_name: string;
  total_runs: number;
  total_innings: number;
  average: number;
  highest_score: number;
}

interface BowlerStats {
  player_id: string;
  full_name: string;
  total_wickets: number;
  total_overs: number;
  total_runs_conceded: number;
  economy: number;
  average: number;
}

const Leaderboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [topBatsmen, setTopBatsmen] = useState<BatsmanStats[]>([]);
  const [topBowlers, setTopBowlers] = useState<BowlerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchLeaderboardData();
    }
  }, [user]);

  const fetchLeaderboardData = async () => {
    setLoading(true);

    // Fetch top batsmen by total runs
    const { data: battingData } = await supabase
      .from('batting_scores')
      .select(`
        batsman_id,
        runs,
        is_out,
        profiles!batting_scores_batsman_id_fkey(full_name)
      `);

    if (battingData) {
      const batsmenMap = new Map<string, BatsmanStats>();

      battingData.forEach((score: any) => {
        const existing = batsmenMap.get(score.batsman_id);
        const runs = score.runs || 0;

        if (existing) {
          existing.total_runs += runs;
          existing.total_innings += 1;
          existing.highest_score = Math.max(existing.highest_score, runs);
        } else {
          batsmenMap.set(score.batsman_id, {
            player_id: score.batsman_id,
            full_name: score.profiles?.full_name || 'Unknown',
            total_runs: runs,
            total_innings: 1,
            average: 0,
            highest_score: runs,
          });
        }
      });

      // Calculate averages
      const batsmen = Array.from(batsmenMap.values()).map((b) => ({
        ...b,
        average: b.total_innings > 0 ? b.total_runs / b.total_innings : 0,
      }));

      // Sort by total runs
      batsmen.sort((a, b) => b.total_runs - a.total_runs);
      setTopBatsmen(batsmen.slice(0, 20));
    }

    // Fetch top bowlers by wickets
    const { data: bowlingData } = await supabase
      .from('bowling_scores')
      .select(`
        bowler_id,
        overs,
        wickets,
        runs_conceded,
        profiles!bowling_scores_bowler_id_fkey(full_name)
      `);

    if (bowlingData) {
      const bowlersMap = new Map<string, BowlerStats>();

      bowlingData.forEach((score: any) => {
        const existing = bowlersMap.get(score.bowler_id);
        const wickets = score.wickets || 0;
        const overs = Number(score.overs) || 0;
        const runs = score.runs_conceded || 0;

        if (existing) {
          existing.total_wickets += wickets;
          existing.total_overs += overs;
          existing.total_runs_conceded += runs;
        } else {
          bowlersMap.set(score.bowler_id, {
            player_id: score.bowler_id,
            full_name: score.profiles?.full_name || 'Unknown',
            total_wickets: wickets,
            total_overs: overs,
            total_runs_conceded: runs,
            economy: 0,
            average: 0,
          });
        }
      });

      // Calculate economy and average
      const bowlers = Array.from(bowlersMap.values()).map((b) => ({
        ...b,
        economy: b.total_overs > 0 ? b.total_runs_conceded / b.total_overs : 0,
        average: b.total_wickets > 0 ? b.total_runs_conceded / b.total_wickets : 0,
      }));

      // Sort by total wickets
      bowlers.sort((a, b) => b.total_wickets - a.total_wickets);
      setTopBowlers(bowlers.slice(0, 20));
    }

    setLoading(false);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return 'text-yellow-500';
      case 1:
        return 'text-gray-400';
      case 2:
        return 'text-amber-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Leaderboard
            </h1>
            <p className="text-muted-foreground">Top performers across all matches</p>
          </div>
        </div>

        <Tabs defaultValue="batting" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="batting" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Top Batsmen
            </TabsTrigger>
            <TabsTrigger value="bowling" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top Bowlers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="batting" className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : topBatsmen.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No batting records yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {topBatsmen.map((batsman, index) => (
                  <Card
                    key={batsman.player_id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/player/${batsman.player_id}`)}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8">
                          {index < 3 ? (
                            <Medal className={`h-6 w-6 ${getMedalColor(index)}`} />
                          ) : (
                            <span className="text-lg font-bold text-muted-foreground">
                              {index + 1}
                            </span>
                          )}
                        </div>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {batsman.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold">{batsman.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {batsman.total_innings} innings • HS: {batsman.highest_score}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{batsman.total_runs}</p>
                        <p className="text-sm text-muted-foreground">
                          Avg: {batsman.average.toFixed(2)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bowling" className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : topBowlers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No bowling records yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {topBowlers.map((bowler, index) => (
                  <Card
                    key={bowler.player_id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/player/${bowler.player_id}`)}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8">
                          {index < 3 ? (
                            <Medal className={`h-6 w-6 ${getMedalColor(index)}`} />
                          ) : (
                            <span className="text-lg font-bold text-muted-foreground">
                              {index + 1}
                            </span>
                          )}
                        </div>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {bowler.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold">{bowler.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {bowler.total_overs.toFixed(1)} overs • Econ: {bowler.economy.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{bowler.total_wickets}</p>
                        <p className="text-sm text-muted-foreground">
                          Avg: {bowler.average.toFixed(2)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Leaderboard;
