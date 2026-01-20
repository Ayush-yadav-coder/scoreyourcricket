import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  Wind, 
  Thermometer, 
  Droplets,
  TrendingUp,
  TrendingDown,
  Target,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface WeatherPitchTrackerProps {
  groundId: string;
  groundName?: string;
}

interface MatchHistory {
  id: string;
  match_type: string;
  status: string;
  innings: {
    total_runs: number;
    total_wickets: number;
    batting_team_id: string;
  }[];
}

const WeatherPitchTracker: React.FC<WeatherPitchTrackerProps> = ({ groundId, groundName }) => {
  const [loading, setLoading] = useState(true);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [pitchStats, setPitchStats] = useState({
    avgFirstInnings: 0,
    avgSecondInnings: 0,
    avgWicketsPerMatch: 0,
    chasesWon: 0,
    defendsWon: 0,
    highestScore: 0,
    lowestScore: 0,
    paceFriendly: 50,
    spinFriendly: 50,
  });

  useEffect(() => {
    fetchMatchData();
  }, [groundId]);

  const fetchMatchData = async () => {
    setLoading(true);
    
    const { data: matches } = await supabase
      .from('matches')
      .select(`
        id,
        match_type,
        status,
        team1_id,
        team2_id
      `)
      .eq('ground_id', groundId)
      .eq('status', 'completed');

    if (!matches || matches.length === 0) {
      setLoading(false);
      return;
    }

    // Fetch innings for each match
    const matchIds = matches.map(m => m.id);
    const { data: innings } = await supabase
      .from('innings')
      .select('*')
      .in('match_id', matchIds);

    // Calculate stats
    let totalFirstInningsRuns = 0;
    let totalSecondInningsRuns = 0;
    let totalWickets = 0;
    let firstInningsCount = 0;
    let secondInningsCount = 0;
    let chasesWon = 0;
    let defendsWon = 0;
    let allScores: number[] = [];

    matches.forEach(match => {
      const matchInnings = innings?.filter(i => i.match_id === match.id) || [];
      const firstInnings = matchInnings.find(i => i.innings_number === 1);
      const secondInnings = matchInnings.find(i => i.innings_number === 2);

      if (firstInnings) {
        totalFirstInningsRuns += firstInnings.total_runs || 0;
        totalWickets += firstInnings.total_wickets || 0;
        allScores.push(firstInnings.total_runs || 0);
        firstInningsCount++;
      }

      if (secondInnings) {
        totalSecondInningsRuns += secondInnings.total_runs || 0;
        totalWickets += secondInnings.total_wickets || 0;
        allScores.push(secondInnings.total_runs || 0);
        secondInningsCount++;

        // Determine chase or defend
        if (firstInnings && secondInnings.is_completed) {
          const target = (firstInnings.total_runs || 0) + 1;
          const chased = (secondInnings.total_runs || 0) >= target;
          if (chased) chasesWon++;
          else defendsWon++;
        }
      }
    });

    // Estimate pace/spin friendliness based on wickets per match
    const avgWickets = totalWickets / (firstInningsCount + secondInningsCount || 1);
    // Higher wickets generally indicate more movement (could be pace or spin)
    // Using average score to estimate - lower scores = more bowler-friendly
    const avgScore = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
    
    // Simplified estimation
    const paceFriendly = avgWickets > 5 ? 60 : avgWickets > 3 ? 50 : 40;
    const spinFriendly = avgScore < 150 ? 55 : avgScore < 180 ? 45 : 35;

    setPitchStats({
      avgFirstInnings: firstInningsCount > 0 ? Math.round(totalFirstInningsRuns / firstInningsCount) : 0,
      avgSecondInnings: secondInningsCount > 0 ? Math.round(totalSecondInningsRuns / secondInningsCount) : 0,
      avgWicketsPerMatch: matches.length > 0 ? Math.round((totalWickets / matches.length) * 10) / 10 : 0,
      chasesWon,
      defendsWon,
      highestScore: allScores.length > 0 ? Math.max(...allScores) : 0,
      lowestScore: allScores.length > 0 ? Math.min(...allScores) : 0,
      paceFriendly,
      spinFriendly,
    });

    setMatchHistory(matches.map(m => ({
      ...m,
      innings: innings?.filter(i => i.match_id === m.id) || [],
    })));

    setLoading(false);
  };

  const chaseDefendData = [
    { name: 'Chases Won', value: pitchStats.chasesWon, color: 'hsl(var(--primary))' },
    { name: 'Defends Won', value: pitchStats.defendsWon, color: 'hsl(var(--accent))' },
  ];

  const scoreDistribution = React.useMemo(() => {
    const ranges = [
      { range: '0-120', min: 0, max: 120, count: 0 },
      { range: '121-150', min: 121, max: 150, count: 0 },
      { range: '151-180', min: 151, max: 180, count: 0 },
      { range: '181-200', min: 181, max: 200, count: 0 },
      { range: '200+', min: 201, max: 999, count: 0 },
    ];

    matchHistory.forEach(match => {
      match.innings.forEach(inn => {
        const score = inn.total_runs || 0;
        const range = ranges.find(r => score >= r.min && score <= r.max);
        if (range) range.count++;
      });
    });

    return ranges;
  }, [matchHistory]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Pitch & Conditions Analysis
          {groundName && <Badge variant="outline">{groundName}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pitch" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pitch">Pitch Report</TabsTrigger>
            <TabsTrigger value="scores">Score Analysis</TabsTrigger>
            <TabsTrigger value="prediction">Prediction</TabsTrigger>
          </TabsList>

          <TabsContent value="pitch" className="space-y-4">
            {/* Pitch Characteristics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Pace Friendly</span>
                  <span className="font-medium">{pitchStats.paceFriendly}%</span>
                </div>
                <Progress value={pitchStats.paceFriendly} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Spin Friendly</span>
                  <span className="font-medium">{pitchStats.spinFriendly}%</span>
                </div>
                <Progress value={pitchStats.spinFriendly} className="h-2" />
              </div>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-secondary/30 rounded-lg text-center">
                <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="font-bold text-lg">{pitchStats.avgFirstInnings}</p>
                <p className="text-xs text-muted-foreground">Avg 1st Innings</p>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg text-center">
                <TrendingDown className="h-5 w-5 mx-auto mb-1 text-accent" />
                <p className="font-bold text-lg">{pitchStats.avgSecondInnings}</p>
                <p className="text-xs text-muted-foreground">Avg 2nd Innings</p>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg text-center">
                <Target className="h-5 w-5 mx-auto mb-1 text-destructive" />
                <p className="font-bold text-lg">{pitchStats.avgWicketsPerMatch}</p>
                <p className="text-xs text-muted-foreground">Wickets/Match</p>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg text-center">
                <Sun className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                <p className="font-bold text-lg">{pitchStats.highestScore}</p>
                <p className="text-xs text-muted-foreground">Highest Score</p>
              </div>
            </div>

            {/* Chase vs Defend */}
            {(pitchStats.chasesWon > 0 || pitchStats.defendsWon > 0) && (
              <div className="h-48">
                <p className="text-sm font-medium mb-2">Chase vs Defend Success</p>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chaseDefendData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {chaseDefendData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          <TabsContent value="scores" className="space-y-4">
            {/* Score Distribution */}
            <div className="h-48">
              <p className="text-sm font-medium mb-2">Score Distribution</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistribution}>
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Score Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Highest Score</p>
                <p className="text-2xl font-bold text-primary">{pitchStats.highestScore}</p>
              </div>
              <div className="p-4 bg-destructive/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Lowest Score</p>
                <p className="text-2xl font-bold text-destructive">{pitchStats.lowestScore}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="prediction" className="space-y-4">
            <div className="p-4 bg-secondary/30 rounded-lg space-y-3">
              <h4 className="font-semibold">Match Prediction Insights</h4>
              
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span>
                    <strong>Par Score:</strong> {Math.round((pitchStats.avgFirstInnings + pitchStats.avgSecondInnings) / 2) || 'N/A'}
                  </span>
                </p>
                
                <p className="flex items-center gap-2">
                  {pitchStats.chasesWon > pitchStats.defendsWon ? (
                    <TrendingUp className="h-4 w-4 text-primary" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-accent" />
                  )}
                  <span>
                    <strong>Toss Recommendation:</strong>{' '}
                    {pitchStats.chasesWon > pitchStats.defendsWon 
                      ? 'Bat Second (Chase favored)'
                      : pitchStats.defendsWon > pitchStats.chasesWon
                        ? 'Bat First (Defend favored)'
                        : 'Even contest'}
                  </span>
                </p>

                <p className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <span>
                    <strong>Conditions:</strong>{' '}
                    {pitchStats.paceFriendly > 55 
                      ? 'Pace bowlers will be key'
                      : pitchStats.spinFriendly > 55
                        ? 'Spinners could dominate'
                        : 'Balanced conditions'}
                  </span>
                </p>
              </div>

              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Based on {matchHistory.length} completed matches at this venue
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default WeatherPitchTracker;
