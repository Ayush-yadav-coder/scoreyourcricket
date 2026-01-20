import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Users, TrendingUp, Award, Target, Zap, BarChart2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface SeasonStatsProps {
  playerId: string;
  playerName: string;
}

interface SeasonData {
  season: string;
  matches: number;
  runs: number;
  wickets: number;
  average: number;
  strikeRate: number;
  bestScore: number;
  fifties: number;
  hundreds: number;
}

const SeasonStats: React.FC<SeasonStatsProps> = ({ playerId, playerName }) => {
  const [seasonData, setSeasonData] = useState<SeasonData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeasonData();
  }, [playerId]);

  const fetchSeasonData = async () => {
    try {
      // Fetch all batting scores with match dates
      const { data: battingData } = await supabase
        .from('batting_scores')
        .select(`
          runs,
          balls_faced,
          is_out,
          innings:innings_id (
            match_id,
            matches:match_id (
              created_at
            )
          )
        `)
        .eq('batsman_id', playerId);

      // Fetch all bowling scores with match dates
      const { data: bowlingData } = await supabase
        .from('bowling_scores')
        .select(`
          wickets,
          runs_conceded,
          overs,
          innings:innings_id (
            match_id,
            matches:match_id (
              created_at
            )
          )
        `)
        .eq('bowler_id', playerId);

      // Group by year/season
      const seasonStats: Record<string, {
        matches: Set<string>;
        runs: number;
        dismissals: number;
        balls: number;
        wickets: number;
        scores: number[];
      }> = {};

      battingData?.forEach((b: any) => {
        const date = b.innings?.matches?.created_at;
        if (!date) return;
        
        const year = new Date(date).getFullYear().toString();
        if (!seasonStats[year]) {
          seasonStats[year] = {
            matches: new Set(),
            runs: 0,
            dismissals: 0,
            balls: 0,
            wickets: 0,
            scores: [],
          };
        }
        
        seasonStats[year].matches.add(b.innings?.match_id);
        seasonStats[year].runs += b.runs || 0;
        seasonStats[year].balls += b.balls_faced || 0;
        if (b.is_out) seasonStats[year].dismissals++;
        seasonStats[year].scores.push(b.runs || 0);
      });

      bowlingData?.forEach((b: any) => {
        const date = b.innings?.matches?.created_at;
        if (!date) return;
        
        const year = new Date(date).getFullYear().toString();
        if (!seasonStats[year]) {
          seasonStats[year] = {
            matches: new Set(),
            runs: 0,
            dismissals: 0,
            balls: 0,
            wickets: 0,
            scores: [],
          };
        }
        
        seasonStats[year].wickets += b.wickets || 0;
      });

      // Convert to array format
      const data: SeasonData[] = Object.entries(seasonStats)
        .map(([season, stats]) => ({
          season,
          matches: stats.matches.size,
          runs: stats.runs,
          wickets: stats.wickets,
          average: stats.dismissals > 0 ? stats.runs / stats.dismissals : stats.runs,
          strikeRate: stats.balls > 0 ? (stats.runs / stats.balls) * 100 : 0,
          bestScore: Math.max(...stats.scores, 0),
          fifties: stats.scores.filter(s => s >= 50 && s < 100).length,
          hundreds: stats.scores.filter(s => s >= 100).length,
        }))
        .sort((a, b) => a.season.localeCompare(b.season));

      setSeasonData(data);
    } catch (error) {
      console.error('Error fetching season data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalStats = () => {
    return seasonData.reduce((acc, season) => ({
      matches: acc.matches + season.matches,
      runs: acc.runs + season.runs,
      wickets: acc.wickets + season.wickets,
      fifties: acc.fifties + season.fifties,
      hundreds: acc.hundreds + season.hundreds,
    }), { matches: 0, runs: 0, wickets: 0, fifties: 0, hundreds: 0 });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-48 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (seasonData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Season-wise Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No season data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const totals = getTotalStats();
  const colors = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" />
          {playerName}'s Season-wise Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Career Totals */}
        <div className="grid grid-cols-5 gap-2 text-center">
          <div className="p-2 rounded bg-muted/50">
            <p className="text-lg font-bold">{totals.matches}</p>
            <p className="text-xs text-muted-foreground">Matches</p>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <p className="text-lg font-bold">{totals.runs}</p>
            <p className="text-xs text-muted-foreground">Runs</p>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <p className="text-lg font-bold">{totals.wickets}</p>
            <p className="text-xs text-muted-foreground">Wickets</p>
          </div>
          <div className="p-2 rounded bg-yellow-500/10">
            <p className="text-lg font-bold">{totals.fifties}</p>
            <p className="text-xs text-muted-foreground">50s</p>
          </div>
          <div className="p-2 rounded bg-green-500/10">
            <p className="text-lg font-bold">{totals.hundreds}</p>
            <p className="text-xs text-muted-foreground">100s</p>
          </div>
        </div>

        <Tabs defaultValue="runs">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="runs">Runs by Season</TabsTrigger>
            <TabsTrigger value="wickets">Wickets by Season</TabsTrigger>
          </TabsList>

          <TabsContent value="runs" className="mt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seasonData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="season" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [value, 'Runs']}
                  />
                  <Bar dataKey="runs" radius={[4, 4, 0, 0]}>
                    {seasonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="wickets" className="mt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seasonData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="season" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [value, 'Wickets']}
                  />
                  <Bar dataKey="wickets" radius={[4, 4, 0, 0]}>
                    {seasonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>

        {/* Season Details */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Season Breakdown</h4>
          {seasonData.map((season) => (
            <div
              key={season.season}
              className="flex items-center justify-between p-3 rounded bg-muted/30"
            >
              <div>
                <Badge variant="outline">{season.season}</Badge>
                <span className="ml-2 text-sm text-muted-foreground">
                  {season.matches} matches
                </span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  {season.runs} runs
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3 text-red-500" />
                  {season.wickets} wkts
                </span>
                <span className="text-muted-foreground">
                  Avg: {season.average.toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SeasonStats;
