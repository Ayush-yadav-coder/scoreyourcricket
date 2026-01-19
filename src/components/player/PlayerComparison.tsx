import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X, Trophy, Target, Zap, TrendingUp } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  playing_role: string | null;
  batting_style: string | null;
  bowling_style: string | null;
}

interface PlayerStats {
  matches: number;
  runs: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  wickets: number;
  overs: number;
  runs_conceded: number;
  average: number;
  strikeRate: number;
  economy: number;
  bowlingAverage: number;
  highScore: number;
  bestBowling: string;
  fifties: number;
  hundreds: number;
  threeWickets: number;
  fiveWickets: number;
}

interface PlayerComparisonProps {
  initialPlayer1Id?: string;
  initialPlayer2Id?: string;
}

const PlayerComparison: React.FC<PlayerComparisonProps> = ({
  initialPlayer1Id,
  initialPlayer2Id,
}) => {
  const [player1, setPlayer1] = useState<Profile | null>(null);
  const [player2, setPlayer2] = useState<Profile | null>(null);
  const [stats1, setStats1] = useState<PlayerStats | null>(null);
  const [stats2, setStats2] = useState<PlayerStats | null>(null);
  const [search1, setSearch1] = useState('');
  const [search2, setSearch2] = useState('');
  const [results1, setResults1] = useState<Profile[]>([]);
  const [results2, setResults2] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialPlayer1Id) loadPlayer(initialPlayer1Id, 1);
    if (initialPlayer2Id) loadPlayer(initialPlayer2Id, 2);
  }, [initialPlayer1Id, initialPlayer2Id]);

  const loadPlayer = async (playerId: string, slot: 1 | 2) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, playing_role, batting_style, bowling_style')
      .eq('id', playerId)
      .single();

    if (profile) {
      if (slot === 1) {
        setPlayer1(profile);
        await fetchStats(playerId, 1);
      } else {
        setPlayer2(profile);
        await fetchStats(playerId, 2);
      }
    }
  };

  const searchPlayers = async (query: string, slot: 1 | 2) => {
    if (!query.trim()) {
      slot === 1 ? setResults1([]) : setResults2([]);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, playing_role, batting_style, bowling_style')
      .ilike('full_name', `%${query}%`)
      .limit(5);

    slot === 1 ? setResults1(data || []) : setResults2(data || []);
  };

  const fetchStats = async (playerId: string, slot: 1 | 2) => {
    setLoading(true);

    // Fetch batting stats
    const { data: battingData } = await supabase
      .from('batting_scores')
      .select('runs, balls_faced, fours, sixes, is_out, innings_id')
      .eq('batsman_id', playerId);

    // Fetch bowling stats
    const { data: bowlingData } = await supabase
      .from('bowling_scores')
      .select('overs, runs_conceded, wickets, innings_id')
      .eq('bowler_id', playerId);

    // Calculate match count
    const inningsIds = new Set([
      ...(battingData?.map(b => b.innings_id) || []),
      ...(bowlingData?.map(b => b.innings_id) || []),
    ]);

    const { data: matchData } = await supabase
      .from('innings')
      .select('match_id')
      .in('id', Array.from(inningsIds));

    const matchCount = new Set(matchData?.map(m => m.match_id) || []).size;

    // Calculate batting stats
    const totalRuns = battingData?.reduce((sum, b) => sum + (b.runs || 0), 0) || 0;
    const totalBalls = battingData?.reduce((sum, b) => sum + (b.balls_faced || 0), 0) || 0;
    const totalFours = battingData?.reduce((sum, b) => sum + (b.fours || 0), 0) || 0;
    const totalSixes = battingData?.reduce((sum, b) => sum + (b.sixes || 0), 0) || 0;
    const outs = battingData?.filter(b => b.is_out).length || 0;
    const highScore = Math.max(...(battingData?.map(b => b.runs || 0) || [0]));
    const fifties = battingData?.filter(b => (b.runs || 0) >= 50 && (b.runs || 0) < 100).length || 0;
    const hundreds = battingData?.filter(b => (b.runs || 0) >= 100).length || 0;

    // Calculate bowling stats
    const totalOvers = bowlingData?.reduce((sum, b) => sum + (b.overs || 0), 0) || 0;
    const totalRunsConceded = bowlingData?.reduce((sum, b) => sum + (b.runs_conceded || 0), 0) || 0;
    const totalWickets = bowlingData?.reduce((sum, b) => sum + (b.wickets || 0), 0) || 0;
    const threeWickets = bowlingData?.filter(b => (b.wickets || 0) >= 3 && (b.wickets || 0) < 5).length || 0;
    const fiveWickets = bowlingData?.filter(b => (b.wickets || 0) >= 5).length || 0;
    
    // Best bowling
    const bestBowlingInnings = bowlingData?.reduce((best, current) => {
      if ((current.wickets || 0) > (best?.wickets || 0)) return current;
      if ((current.wickets || 0) === (best?.wickets || 0) && (current.runs_conceded || 0) < (best?.runs_conceded || 0)) return current;
      return best;
    }, bowlingData?.[0]);
    const bestBowling = bestBowlingInnings ? `${bestBowlingInnings.wickets}/${bestBowlingInnings.runs_conceded}` : '-';

    const stats: PlayerStats = {
      matches: matchCount,
      runs: totalRuns,
      balls_faced: totalBalls,
      fours: totalFours,
      sixes: totalSixes,
      wickets: totalWickets,
      overs: totalOvers,
      runs_conceded: totalRunsConceded,
      average: outs > 0 ? totalRuns / outs : totalRuns,
      strikeRate: totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0,
      economy: totalOvers > 0 ? totalRunsConceded / totalOvers : 0,
      bowlingAverage: totalWickets > 0 ? totalRunsConceded / totalWickets : 0,
      highScore,
      bestBowling,
      fifties,
      hundreds,
      threeWickets,
      fiveWickets,
    };

    slot === 1 ? setStats1(stats) : setStats2(stats);
    setLoading(false);
  };

  const selectPlayer = async (profile: Profile, slot: 1 | 2) => {
    if (slot === 1) {
      setPlayer1(profile);
      setSearch1('');
      setResults1([]);
      await fetchStats(profile.id, 1);
    } else {
      setPlayer2(profile);
      setSearch2('');
      setResults2([]);
      await fetchStats(profile.id, 2);
    }
  };

  const clearPlayer = (slot: 1 | 2) => {
    if (slot === 1) {
      setPlayer1(null);
      setStats1(null);
    } else {
      setPlayer2(null);
      setStats2(null);
    }
  };

  const ComparisonBar = ({ 
    label, 
    value1, 
    value2, 
    unit = '',
    higherIsBetter = true,
    format = (v: number) => v.toFixed(1)
  }: { 
    label: string; 
    value1: number; 
    value2: number;
    unit?: string;
    higherIsBetter?: boolean;
    format?: (v: number) => string;
  }) => {
    const max = Math.max(value1, value2) || 1;
    const p1Better = higherIsBetter ? value1 > value2 : value1 < value2;
    const p2Better = higherIsBetter ? value2 > value1 : value2 < value1;
    
    return (
      <div className="py-2 border-b border-border last:border-0">
        <div className="flex justify-between items-center mb-1">
          <span className={`text-sm font-medium ${p1Better ? 'text-green-500' : ''}`}>
            {format(value1)}{unit}
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className={`text-sm font-medium ${p2Better ? 'text-green-500' : ''}`}>
            {format(value2)}{unit}
          </span>
        </div>
        <div className="flex gap-1">
          <div className="flex-1 flex justify-end">
            <div 
              className={`h-2 rounded-l-full ${p1Better ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
              style={{ width: `${(value1 / max) * 100}%` }}
            />
          </div>
          <div className="flex-1">
            <div 
              className={`h-2 rounded-r-full ${p2Better ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
              style={{ width: `${(value2 / max) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  const PlayerSelector = ({ 
    slot, 
    player, 
    search, 
    setSearch, 
    results 
  }: { 
    slot: 1 | 2; 
    player: Profile | null;
    search: string;
    setSearch: (s: string) => void;
    results: Profile[];
  }) => (
    <div className="flex-1">
      {player ? (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <Avatar className="h-12 w-12">
            <AvatarImage src={player.avatar_url || undefined} />
            <AvatarFallback>{player.full_name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{player.full_name}</p>
            {player.playing_role && (
              <Badge variant="outline" className="text-xs">{player.playing_role}</Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => clearPlayer(slot)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search Player ${slot}...`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              searchPlayers(e.target.value, slot);
            }}
            className="pl-10"
          />
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-popover border rounded-lg shadow-lg">
              {results.map(profile => (
                <div
                  key={profile.id}
                  className="flex items-center gap-3 p-2 hover:bg-muted cursor-pointer"
                  onClick={() => selectPlayer(profile, slot)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback>{profile.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{profile.full_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Player Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Player Selectors */}
        <div className="flex gap-4 items-start">
          <PlayerSelector 
            slot={1} 
            player={player1} 
            search={search1} 
            setSearch={setSearch1}
            results={results1}
          />
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
            <span className="text-sm font-bold">VS</span>
          </div>
          <PlayerSelector 
            slot={2} 
            player={player2} 
            search={search2} 
            setSearch={setSearch2}
            results={results2}
          />
        </div>

        {/* Comparison Stats */}
        {player1 && player2 && stats1 && stats2 && (
          <div className="space-y-4">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Trophy className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                <p className="text-2xl font-bold">{stats1.matches}</p>
                <p className="text-xs text-muted-foreground">Matches</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Trophy className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                <p className="text-2xl font-bold">{stats2.matches}</p>
                <p className="text-xs text-muted-foreground">Matches</p>
              </div>
            </div>

            {/* Batting Comparison */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Batting
              </h4>
              <div className="bg-muted/30 rounded-lg p-3">
                <ComparisonBar label="Runs" value1={stats1.runs} value2={stats2.runs} format={v => Math.round(v).toString()} />
                <ComparisonBar label="Average" value1={stats1.average} value2={stats2.average} />
                <ComparisonBar label="Strike Rate" value1={stats1.strikeRate} value2={stats2.strikeRate} />
                <ComparisonBar label="High Score" value1={stats1.highScore} value2={stats2.highScore} format={v => Math.round(v).toString()} />
                <ComparisonBar label="Fours" value1={stats1.fours} value2={stats2.fours} format={v => Math.round(v).toString()} />
                <ComparisonBar label="Sixes" value1={stats1.sixes} value2={stats2.sixes} format={v => Math.round(v).toString()} />
                <ComparisonBar label="50s" value1={stats1.fifties} value2={stats2.fifties} format={v => Math.round(v).toString()} />
                <ComparisonBar label="100s" value1={stats1.hundreds} value2={stats2.hundreds} format={v => Math.round(v).toString()} />
              </div>
            </div>

            {/* Bowling Comparison */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Bowling
              </h4>
              <div className="bg-muted/30 rounded-lg p-3">
                <ComparisonBar label="Wickets" value1={stats1.wickets} value2={stats2.wickets} format={v => Math.round(v).toString()} />
                <ComparisonBar label="Economy" value1={stats1.economy} value2={stats2.economy} higherIsBetter={false} />
                <ComparisonBar label="Bowling Avg" value1={stats1.bowlingAverage} value2={stats2.bowlingAverage} higherIsBetter={false} />
                <ComparisonBar label="Overs" value1={stats1.overs} value2={stats2.overs} />
                <ComparisonBar label="3W+" value1={stats1.threeWickets} value2={stats2.threeWickets} format={v => Math.round(v).toString()} />
                <ComparisonBar label="5W+" value1={stats1.fiveWickets} value2={stats2.fiveWickets} format={v => Math.round(v).toString()} />
              </div>
            </div>
          </div>
        )}

        {(!player1 || !player2) && (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Select two players to compare their stats</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerComparison;
