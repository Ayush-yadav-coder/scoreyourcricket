import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  MapPin, 
  Trophy, 
  Target, 
  TrendingUp,
  BarChart3,
  Users,
  Calendar,
  Loader2,
  CloudSun
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import WeatherPitchTracker from '@/components/ground/WeatherPitchTracker';

interface Ground {
  id: string;
  name: string;
  location: string | null;
  city: string | null;
  country: string | null;
  capacity: number | null;
}

interface MatchStats {
  totalMatches: number;
  avgFirstInningsScore: number;
  avgSecondInningsScore: number;
  highestScore: number;
  lowestScore: number;
  avgTarget: number;
  chasesWon: number;
  defendsWon: number;
  scoreRanges: { range: string; count: number }[];
  recentMatches: {
    id: string;
    team1_name: string;
    team2_name: string;
    team1_score: number;
    team2_score: number;
    date: string;
    winner: string;
  }[];
}

const GroundDetails: React.FC = () => {
  const { groundId } = useParams();
  const navigate = useNavigate();
  const [ground, setGround] = useState<Ground | null>(null);
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (groundId) {
      fetchGroundDetails();
    }
  }, [groundId]);

  const fetchGroundDetails = async () => {
    setLoading(true);

    // Fetch ground info
    const { data: groundData, error } = await supabase
      .from('grounds')
      .select('*')
      .eq('id', groundId)
      .single();

    if (error || !groundData) {
      navigate('/');
      return;
    }

    setGround(groundData);

    // Fetch all matches at this ground
    const { data: matchesData } = await supabase
      .from('matches')
      .select(`
        id,
        status,
        created_at,
        team1:teams!matches_team1_id_fkey(id, name),
        team2:teams!matches_team2_id_fkey(id, name)
      `)
      .eq('ground_id', groundId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (!matchesData || matchesData.length === 0) {
      setStats({
        totalMatches: 0,
        avgFirstInningsScore: 0,
        avgSecondInningsScore: 0,
        highestScore: 0,
        lowestScore: 0,
        avgTarget: 0,
        chasesWon: 0,
        defendsWon: 0,
        scoreRanges: [],
        recentMatches: [],
      });
      setLoading(false);
      return;
    }

    // Fetch innings data for all matches
    const matchIds = matchesData.map(m => m.id);
    const { data: inningsData } = await supabase
      .from('innings')
      .select('*')
      .in('match_id', matchIds)
      .order('innings_number', { ascending: true });

    // Calculate statistics
    let totalFirstInningsScore = 0;
    let totalSecondInningsScore = 0;
    let firstInningsCount = 0;
    let secondInningsCount = 0;
    let highestScore = 0;
    let lowestScore = Infinity;
    let chasesWon = 0;
    let defendsWon = 0;
    const allScores: number[] = [];

    const matchScores: Record<string, { first: number; second: number }> = {};

    inningsData?.forEach(innings => {
      const score = innings.total_runs || 0;
      allScores.push(score);
      
      if (score > highestScore) highestScore = score;
      if (score < lowestScore && score > 0) lowestScore = score;

      if (innings.innings_number === 1) {
        totalFirstInningsScore += score;
        firstInningsCount++;
        if (!matchScores[innings.match_id]) matchScores[innings.match_id] = { first: 0, second: 0 };
        matchScores[innings.match_id].first = score;
      } else if (innings.innings_number === 2) {
        totalSecondInningsScore += score;
        secondInningsCount++;
        if (!matchScores[innings.match_id]) matchScores[innings.match_id] = { first: 0, second: 0 };
        matchScores[innings.match_id].second = score;
      }
    });

    // Calculate chase/defend stats
    Object.values(matchScores).forEach(scores => {
      if (scores.second > scores.first) {
        chasesWon++;
      } else if (scores.first > scores.second) {
        defendsWon++;
      }
    });

    // Calculate score ranges
    const ranges = [
      { range: '0-100', min: 0, max: 100, count: 0 },
      { range: '101-150', min: 101, max: 150, count: 0 },
      { range: '151-180', min: 151, max: 180, count: 0 },
      { range: '181-200', min: 181, max: 200, count: 0 },
      { range: '200+', min: 201, max: Infinity, count: 0 },
    ];

    allScores.forEach(score => {
      for (const range of ranges) {
        if (score >= range.min && score <= range.max) {
          range.count++;
          break;
        }
      }
    });

    // Build recent matches
    const recentMatches = matchesData.slice(0, 10).map(match => {
      const matchInnings = inningsData?.filter(i => i.match_id === match.id) || [];
      const team1Id = (match as any).team1?.id;
      const team1Innings = matchInnings.find(i => i.batting_team_id === team1Id);
      const team2Innings = matchInnings.find(i => i.batting_team_id !== team1Id);
      
      const team1Score = team1Innings?.total_runs || 0;
      const team2Score = team2Innings?.total_runs || 0;
      
      return {
        id: match.id,
        team1_name: (match as any).team1?.name || 'Team 1',
        team2_name: (match as any).team2?.name || 'Team 2',
        team1_score: team1Score,
        team2_score: team2Score,
        date: match.created_at,
        winner: team1Score > team2Score 
          ? (match as any).team1?.name 
          : team2Score > team1Score 
            ? (match as any).team2?.name 
            : 'Tie',
      };
    });

    setStats({
      totalMatches: matchesData.length,
      avgFirstInningsScore: firstInningsCount > 0 ? Math.round(totalFirstInningsScore / firstInningsCount) : 0,
      avgSecondInningsScore: secondInningsCount > 0 ? Math.round(totalSecondInningsScore / secondInningsCount) : 0,
      highestScore,
      lowestScore: lowestScore === Infinity ? 0 : lowestScore,
      avgTarget: firstInningsCount > 0 ? Math.round(totalFirstInningsScore / firstInningsCount) + 1 : 0,
      chasesWon,
      defendsWon,
      scoreRanges: ranges,
      recentMatches,
    });

    setLoading(false);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!ground) return null;

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10b981', '#f59e0b'];

  const chaseDefendData = stats ? [
    { name: 'Chases Won', value: stats.chasesWon },
    { name: 'Defends Won', value: stats.defendsWon },
  ] : [];

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Ground Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-10 w-10 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="font-display text-2xl font-bold">{ground.name}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-muted-foreground">
                  {ground.city && <span>{ground.city}</span>}
                  {ground.country && <Badge variant="outline">{ground.country}</Badge>}
                  {ground.capacity && (
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {ground.capacity.toLocaleString()} capacity
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{stats?.totalMatches || 0}</div>
                    <div className="text-xs text-muted-foreground">Matches</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats?.avgFirstInningsScore || 0}</div>
                    <div className="text-xs text-muted-foreground">Avg 1st Inn</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats?.highestScore || 0}</div>
                    <div className="text-xs text-muted-foreground">Highest</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {stats && stats.totalMatches > 0 ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="scores">Score Analysis</TabsTrigger>
              <TabsTrigger value="conditions" className="flex items-center gap-1">
                <CloudSun className="h-3 w-3" />
                Conditions
              </TabsTrigger>
              <TabsTrigger value="matches">Recent Matches</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Key Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <TrendingUp className="h-6 w-6 mx-auto text-primary mb-2" />
                    <div className="text-2xl font-bold">{stats.avgFirstInningsScore}</div>
                    <div className="text-xs text-muted-foreground">Avg 1st Innings</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Target className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                    <div className="text-2xl font-bold">{stats.avgTarget}</div>
                    <div className="text-xs text-muted-foreground">Avg Target</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Trophy className="h-6 w-6 mx-auto text-green-500 mb-2" />
                    <div className="text-2xl font-bold">{stats.highestScore}</div>
                    <div className="text-xs text-muted-foreground">Highest Score</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <BarChart3 className="h-6 w-6 mx-auto text-orange-500 mb-2" />
                    <div className="text-2xl font-bold">{stats.lowestScore}</div>
                    <div className="text-xs text-muted-foreground">Lowest Score</div>
                  </CardContent>
                </Card>
              </div>

              {/* Chase vs Defend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Batting First vs Chasing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-8">
                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Batting First Wins</span>
                        <span className="font-bold">{stats.defendsWon}</span>
                      </div>
                      <Progress 
                        value={(stats.defendsWon / (stats.defendsWon + stats.chasesWon)) * 100} 
                        className="h-3"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Chasing Wins</span>
                        <span className="font-bold">{stats.chasesWon}</span>
                      </div>
                      <Progress 
                        value={(stats.chasesWon / (stats.defendsWon + stats.chasesWon)) * 100} 
                        className="h-3"
                      />
                    </div>
                  </div>
                  <div className="h-48 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chaseDefendData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {chaseDefendData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scores" className="space-y-4 mt-4">
              {/* Score Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.scoreRanges}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="range" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="hsl(var(--primary))" 
                          radius={[4, 4, 0, 0]}
                          name="Innings"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Par Score Guide */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Par Score Guide</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg">
                      <span>Good Score (Batting First)</span>
                      <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                        {stats.avgFirstInningsScore + 20}+
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-yellow-500/10 rounded-lg">
                      <span>Par Score</span>
                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
                        {stats.avgFirstInningsScore - 10} - {stats.avgFirstInningsScore + 10}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg">
                      <span>Below Par</span>
                      <Badge variant="secondary" className="bg-red-500/20 text-red-600">
                        {'<'} {stats.avgFirstInningsScore - 20}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Conditions Tab - Weather and Pitch Tracker */}
            <TabsContent value="conditions" className="space-y-4 mt-4">
              {groundId && (
                <WeatherPitchTracker 
                  groundId={groundId} 
                  groundName={ground.name}
                />
              )}
            </TabsContent>

            <TabsContent value="matches" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Matches at {ground.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.recentMatches.length > 0 ? (
                    <div className="space-y-3">
                      {stats.recentMatches.map(match => (
                        <div 
                          key={match.id}
                          className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/match/${match.id}`)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(match.date), 'MMM d, yyyy')}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {match.winner} won
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{match.team1_name}</p>
                              <p className="text-sm text-muted-foreground">{match.team2_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{match.team1_score}</p>
                              <p className="text-muted-foreground">{match.team2_score}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No matches found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No matches played at this ground yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default GroundDetails;
