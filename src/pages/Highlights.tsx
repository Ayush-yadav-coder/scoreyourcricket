import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Trophy, Flame, Target, Zap, Search, Calendar, 
  ChevronRight, Star, Award, Filter
} from 'lucide-react';
import { format } from 'date-fns';

interface MatchHighlight {
  matchId: string;
  team1Name: string;
  team2Name: string;
  date: string;
  status: string;
  highlights: {
    sixes: number;
    wickets: number;
    fifties: number;
    centuries: number;
    fiveWickets: number;
  };
  topPerformers: {
    topBatsman: { name: string; runs: number } | null;
    topBowler: { name: string; wickets: number } | null;
  };
}

const Highlights: React.FC = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'centuries' | 'fiveWickets' | 'highScoring'>('all');

  useEffect(() => {
    fetchMatchHighlights();
  }, []);

  const fetchMatchHighlights = async () => {
    try {
      // Fetch completed matches with team details
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          id,
          status,
          created_at,
          team1:team1_id (id, name),
          team2:team2_id (id, name)
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!matchesData) {
        setLoading(false);
        return;
      }

      const highlightPromises = matchesData.map(async (match: any) => {
        // Fetch innings for this match
        const { data: inningsData } = await supabase
          .from('innings')
          .select('id')
          .eq('match_id', match.id);

        if (!inningsData || inningsData.length === 0) {
          return null;
        }

        const inningsIds = inningsData.map(i => i.id);

        // Fetch deliveries for highlights
        const { data: deliveries } = await supabase
          .from('deliveries')
          .select('is_six, is_wicket')
          .in('innings_id', inningsIds);

        // Fetch batting scores
        const { data: battingScores } = await supabase
          .from('batting_scores')
          .select(`
            runs,
            batsman_id,
            profiles:batsman_id (full_name)
          `)
          .in('innings_id', inningsIds);

        // Fetch bowling scores
        const { data: bowlingScores } = await supabase
          .from('bowling_scores')
          .select(`
            wickets,
            bowler_id,
            profiles:bowler_id (full_name)
          `)
          .in('innings_id', inningsIds);

        const sixes = deliveries?.filter(d => d.is_six).length || 0;
        const wickets = deliveries?.filter(d => d.is_wicket).length || 0;
        const fifties = battingScores?.filter(b => (b.runs || 0) >= 50 && (b.runs || 0) < 100).length || 0;
        const centuries = battingScores?.filter(b => (b.runs || 0) >= 100).length || 0;
        const fiveWickets = bowlingScores?.filter(b => (b.wickets || 0) >= 5).length || 0;

        // Find top performers
        let topBatsman = null;
        if (battingScores && battingScores.length > 0) {
          const best = battingScores.reduce((prev, curr) => 
            (curr.runs || 0) > (prev.runs || 0) ? curr : prev
          );
          if (best.runs && best.runs > 0) {
            topBatsman = { 
              name: (best.profiles as any)?.full_name || 'Unknown', 
              runs: best.runs 
            };
          }
        }

        let topBowler = null;
        if (bowlingScores && bowlingScores.length > 0) {
          const best = bowlingScores.reduce((prev, curr) => 
            (curr.wickets || 0) > (prev.wickets || 0) ? curr : prev
          );
          if (best.wickets && best.wickets > 0) {
            topBowler = { 
              name: (best.profiles as any)?.full_name || 'Unknown', 
              wickets: best.wickets 
            };
          }
        }

        return {
          matchId: match.id,
          team1Name: match.team1?.name || 'Team 1',
          team2Name: match.team2?.name || 'Team 2',
          date: match.created_at,
          status: match.status,
          highlights: { sixes, wickets, fifties, centuries, fiveWickets },
          topPerformers: { topBatsman, topBowler },
        };
      });

      const results = await Promise.all(highlightPromises);
      setMatches(results.filter(Boolean) as MatchHighlight[]);
    } catch (error) {
      console.error('Error fetching highlights:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = matches.filter(match => {
    const matchesSearch = 
      match.team1Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.team2Name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    switch (filter) {
      case 'centuries':
        return match.highlights.centuries > 0;
      case 'fiveWickets':
        return match.highlights.fiveWickets > 0;
      case 'highScoring':
        return match.highlights.sixes >= 5;
      default:
        return true;
    }
  });

  const getTotalStats = () => {
    return matches.reduce((acc, match) => ({
      sixes: acc.sixes + match.highlights.sixes,
      wickets: acc.wickets + match.highlights.wickets,
      centuries: acc.centuries + match.highlights.centuries,
      fiveWickets: acc.fiveWickets + match.highlights.fiveWickets,
    }), { sixes: 0, wickets: 0, centuries: 0, fiveWickets: 0 });
  };

  const totalStats = getTotalStats();

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="h-8 w-8 text-primary" />
              Match Highlights
            </h1>
            <p className="text-muted-foreground mt-1">
              Browse key moments from all completed matches
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search matches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-orange-500/10 border-orange-500/30">
            <CardContent className="p-4 text-center">
              <Flame className="h-6 w-6 mx-auto text-orange-500 mb-2" />
              <p className="text-2xl font-bold">{totalStats.sixes}</p>
              <p className="text-sm text-muted-foreground">Total Sixes</p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 mx-auto text-red-500 mb-2" />
              <p className="text-2xl font-bold">{totalStats.wickets}</p>
              <p className="text-sm text-muted-foreground">Total Wickets</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="p-4 text-center">
              <Star className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
              <p className="text-2xl font-bold">{totalStats.centuries}</p>
              <p className="text-sm text-muted-foreground">Centuries</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/30">
            <CardContent className="p-4 text-center">
              <Award className="h-6 w-6 mx-auto text-purple-500 mb-2" />
              <p className="text-2xl font-bold">{totalStats.fiveWickets}</p>
              <p className="text-sm text-muted-foreground">5-Wicket Hauls</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All Matches
          </Button>
          <Button
            variant={filter === 'centuries' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('centuries')}
          >
            <Star className="h-4 w-4 mr-1" />
            Centuries
          </Button>
          <Button
            variant={filter === 'fiveWickets' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('fiveWickets')}
          >
            <Award className="h-4 w-4 mr-1" />
            5-Wicket Hauls
          </Button>
          <Button
            variant={filter === 'highScoring' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('highScoring')}
          >
            <Flame className="h-4 w-4 mr-1" />
            High Scoring (5+ Sixes)
          </Button>
        </div>

        {/* Match List */}
        {filteredMatches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No matches found</h3>
              <p className="text-muted-foreground">
                {searchQuery || filter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Completed matches will appear here with their highlights'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-4 pr-4">
              {filteredMatches.map((match) => (
                <Card 
                  key={match.matchId}
                  className="hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/match/${match.matchId}/analytics`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold">
                            {match.team1Name} vs {match.team2Name}
                          </h3>
                          <Badge variant="secondary">Completed</Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(match.date), 'PPP')}
                        </div>

                        {/* Highlights */}
                        <div className="flex flex-wrap gap-2">
                          {match.highlights.sixes > 0 && (
                            <Badge variant="outline" className="bg-orange-500/10">
                              <Flame className="h-3 w-3 mr-1 text-orange-500" />
                              {match.highlights.sixes} Sixes
                            </Badge>
                          )}
                          {match.highlights.wickets > 0 && (
                            <Badge variant="outline" className="bg-red-500/10">
                              <Target className="h-3 w-3 mr-1 text-red-500" />
                              {match.highlights.wickets} Wickets
                            </Badge>
                          )}
                          {match.highlights.centuries > 0 && (
                            <Badge variant="outline" className="bg-yellow-500/10">
                              <Star className="h-3 w-3 mr-1 text-yellow-500" />
                              {match.highlights.centuries} Century
                            </Badge>
                          )}
                          {match.highlights.fifties > 0 && (
                            <Badge variant="outline" className="bg-green-500/10">
                              <Zap className="h-3 w-3 mr-1 text-green-500" />
                              {match.highlights.fifties} Fifties
                            </Badge>
                          )}
                          {match.highlights.fiveWickets > 0 && (
                            <Badge variant="outline" className="bg-purple-500/10">
                              <Award className="h-3 w-3 mr-1 text-purple-500" />
                              5-Wicket Haul
                            </Badge>
                          )}
                        </div>

                        {/* Top Performers */}
                        {(match.topPerformers.topBatsman || match.topPerformers.topBowler) && (
                          <div className="flex gap-4 mt-3 text-sm">
                            {match.topPerformers.topBatsman && (
                              <span className="text-muted-foreground">
                                🏏 {match.topPerformers.topBatsman.name}: {match.topPerformers.topBatsman.runs} runs
                              </span>
                            )}
                            {match.topPerformers.topBowler && (
                              <span className="text-muted-foreground">
                                🎯 {match.topPerformers.topBowler.name}: {match.topPerformers.topBowler.wickets} wickets
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </MainLayout>
  );
};

export default Highlights;
