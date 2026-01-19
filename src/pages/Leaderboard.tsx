import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Target, TrendingUp, Medal, Award, Star, Flame, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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

interface AchievementLeader {
  player_id: string;
  full_name: string;
  avatar_url: string | null;
  centuries: number;
  half_centuries: number;
  five_wickets: number;
  total_achievements: number;
}

const Leaderboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [topBatsmen, setTopBatsmen] = useState<BatsmanStats[]>([]);
  const [topBowlers, setTopBowlers] = useState<BowlerStats[]>([]);
  const [achievementLeaders, setAchievementLeaders] = useState<AchievementLeader[]>([]);
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

      const batsmen = Array.from(batsmenMap.values()).map((b) => ({
        ...b,
        average: b.total_innings > 0 ? b.total_runs / b.total_innings : 0,
      }));

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

      const bowlers = Array.from(bowlersMap.values()).map((b) => ({
        ...b,
        economy: b.total_overs > 0 ? b.total_runs_conceded / b.total_overs : 0,
        average: b.total_wickets > 0 ? b.total_runs_conceded / b.total_wickets : 0,
      }));

      bowlers.sort((a, b) => b.total_wickets - a.total_wickets);
      setTopBowlers(bowlers.slice(0, 20));
    }

    // Fetch achievement leaders
    const { data: achievementsData } = await supabase
      .from('player_achievements')
      .select(`
        player_id,
        achievement_type,
        profiles!player_achievements_player_id_fkey(full_name, avatar_url)
      `);

    if (achievementsData) {
      const achievementMap = new Map<string, AchievementLeader>();

      achievementsData.forEach((a: any) => {
        const existing = achievementMap.get(a.player_id);
        
        if (existing) {
          existing.total_achievements++;
          if (a.achievement_type === 'century') existing.centuries++;
          if (a.achievement_type === 'half_century') existing.half_centuries++;
          if (a.achievement_type === 'five_wickets') existing.five_wickets++;
        } else {
          achievementMap.set(a.player_id, {
            player_id: a.player_id,
            full_name: a.profiles?.full_name || 'Unknown',
            avatar_url: a.profiles?.avatar_url,
            centuries: a.achievement_type === 'century' ? 1 : 0,
            half_centuries: a.achievement_type === 'half_century' ? 1 : 0,
            five_wickets: a.achievement_type === 'five_wickets' ? 1 : 0,
            total_achievements: 1,
          });
        }
      });

      const leaders = Array.from(achievementMap.values());
      leaders.sort((a, b) => b.total_achievements - a.total_achievements);
      setAchievementLeaders(leaders.slice(0, 20));
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="batting" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Batsmen
            </TabsTrigger>
            <TabsTrigger value="bowling" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Bowlers
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Achievements
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

          <TabsContent value="achievements" className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : achievementLeaders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Award className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No achievements yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {achievementLeaders.map((player, index) => (
                  <Card
                    key={player.player_id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/player/${player.player_id}`)}
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
                          {player.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold">{player.full_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {player.centuries > 0 && (
                              <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                                <Crown className="h-3 w-3 mr-1" />
                                {player.centuries} 100s
                              </Badge>
                            )}
                            {player.half_centuries > 0 && (
                              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                                <Star className="h-3 w-3 mr-1" />
                                {player.half_centuries} 50s
                              </Badge>
                            )}
                            {player.five_wickets > 0 && (
                              <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30">
                                <Flame className="h-3 w-3 mr-1" />
                                {player.five_wickets} 5W
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{player.total_achievements}</p>
                        <p className="text-sm text-muted-foreground">achievements</p>
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
