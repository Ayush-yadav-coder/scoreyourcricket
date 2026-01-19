import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, GitCompare, MapPin, Target, Zap } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface Ground {
  id: string;
  name: string;
  city: string | null;
}

interface GroundStats {
  totalMatches: number;
  avgFirstInningsScore: number;
  highestScore: number;
  chasesWonPercent: number;
  avgRunRate: number;
}

const GroundComparison: React.FC = () => {
  const [grounds, setGrounds] = useState<Ground[]>([]);
  const [ground1Id, setGround1Id] = useState('');
  const [ground2Id, setGround2Id] = useState('');
  const [ground1Stats, setGround1Stats] = useState<GroundStats | null>(null);
  const [ground2Stats, setGround2Stats] = useState<GroundStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('grounds').select('id, name, city').order('name').then(({ data }) => setGrounds(data || []));
  }, []);

  useEffect(() => {
    if (ground1Id && ground2Id) fetchComparison();
  }, [ground1Id, ground2Id]);

  const fetchStats = async (groundId: string): Promise<GroundStats> => {
    const { data: matches } = await supabase.from('matches').select('id').eq('ground_id', groundId).eq('status', 'completed');
    if (!matches?.length) return { totalMatches: 0, avgFirstInningsScore: 0, highestScore: 0, chasesWonPercent: 0, avgRunRate: 0 };
    
    const { data: innings } = await supabase.from('innings').select('*').in('match_id', matches.map(m => m.id));
    let totalFirst = 0, firstCount = 0, highest = 0, chasesWon = 0, totalGames = 0, totalRuns = 0, totalOvers = 0;
    const matchScores: Record<string, { first: number; second: number }> = {};

    innings?.forEach(inn => {
      const score = inn.total_runs || 0;
      totalRuns += score;
      totalOvers += inn.total_overs || 0;
      if (score > highest) highest = score;
      if (inn.innings_number === 1) { totalFirst += score; firstCount++; matchScores[inn.match_id] = { ...matchScores[inn.match_id], first: score }; }
      else if (inn.innings_number === 2) { matchScores[inn.match_id] = { ...matchScores[inn.match_id], second: score }; }
    });

    Object.values(matchScores).forEach(s => { if (s.first || s.second) { totalGames++; if (s.second > s.first) chasesWon++; }});

    return {
      totalMatches: matches.length,
      avgFirstInningsScore: firstCount > 0 ? Math.round(totalFirst / firstCount) : 0,
      highestScore: highest,
      chasesWonPercent: totalGames > 0 ? Math.round((chasesWon / totalGames) * 100) : 0,
      avgRunRate: totalOvers > 0 ? parseFloat((totalRuns / totalOvers).toFixed(2)) : 0,
    };
  };

  const fetchComparison = async () => {
    setLoading(true);
    const [s1, s2] = await Promise.all([fetchStats(ground1Id), fetchStats(ground2Id)]);
    setGround1Stats(s1);
    setGround2Stats(s2);
    setLoading(false);
  };

  const getGround = (id: string) => grounds.find(g => g.id === id);

  const chartData = ground1Stats && ground2Stats ? [
    { stat: 'Avg Score', [getGround(ground1Id)?.name || 'G1']: ground1Stats.avgFirstInningsScore, [getGround(ground2Id)?.name || 'G2']: ground2Stats.avgFirstInningsScore },
    { stat: 'Highest', [getGround(ground1Id)?.name || 'G1']: ground1Stats.highestScore, [getGround(ground2Id)?.name || 'G2']: ground2Stats.highestScore },
    { stat: 'Matches', [getGround(ground1Id)?.name || 'G1']: ground1Stats.totalMatches, [getGround(ground2Id)?.name || 'G2']: ground2Stats.totalMatches },
  ] : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-primary" />
          Ground Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Select value={ground1Id} onValueChange={setGround1Id}>
            <SelectTrigger><SelectValue placeholder="Select first ground" /></SelectTrigger>
            <SelectContent>{grounds.filter(g => g.id !== ground2Id).map(g => <SelectItem key={g.id} value={g.id}><MapPin className="h-3 w-3 inline mr-2" />{g.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={ground2Id} onValueChange={setGround2Id}>
            <SelectTrigger><SelectValue placeholder="Select second ground" /></SelectTrigger>
            <SelectContent>{grounds.filter(g => g.id !== ground1Id).map(g => <SelectItem key={g.id} value={g.id}><MapPin className="h-3 w-3 inline mr-2" />{g.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

        {!loading && ground1Stats && ground2Stats && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <p className="font-semibold text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{getGround(ground1Id)?.name}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-xs text-muted-foreground">Matches</p><p className="font-bold text-lg">{ground1Stats.totalMatches}</p></div>
                  <div><p className="text-xs text-muted-foreground">Avg Score</p><p className="font-bold text-lg">{ground1Stats.avgFirstInningsScore}</p></div>
                  <div><p className="text-xs text-muted-foreground">Chase %</p><p className="font-bold">{ground1Stats.chasesWonPercent}%</p></div>
                  <div><p className="text-xs text-muted-foreground">Run Rate</p><p className="font-bold">{ground1Stats.avgRunRate}</p></div>
                </div>
                <Badge variant={ground1Stats.avgFirstInningsScore > 160 ? 'default' : 'secondary'}>{ground1Stats.avgFirstInningsScore > 160 ? 'High Scoring' : 'Moderate'}</Badge>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 border space-y-2">
                <p className="font-semibold text-sm flex items-center gap-2"><MapPin className="h-4 w-4" />{getGround(ground2Id)?.name}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-xs text-muted-foreground">Matches</p><p className="font-bold text-lg">{ground2Stats.totalMatches}</p></div>
                  <div><p className="text-xs text-muted-foreground">Avg Score</p><p className="font-bold text-lg">{ground2Stats.avgFirstInningsScore}</p></div>
                  <div><p className="text-xs text-muted-foreground">Chase %</p><p className="font-bold">{ground2Stats.chasesWonPercent}%</p></div>
                  <div><p className="text-xs text-muted-foreground">Run Rate</p><p className="font-bold">{ground2Stats.avgRunRate}</p></div>
                </div>
                <Badge variant={ground2Stats.avgFirstInningsScore > 160 ? 'default' : 'secondary'}>{ground2Stats.avgFirstInningsScore > 160 ? 'High Scoring' : 'Moderate'}</Badge>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="stat" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey={getGround(ground1Id)?.name || 'G1'} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={getGround(ground2Id)?.name || 'G2'} fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {(!ground1Id || !ground2Id) && !loading && <p className="text-center py-8 text-muted-foreground">Select two grounds to compare</p>}
      </CardContent>
    </Card>
  );
};

export default GroundComparison;
