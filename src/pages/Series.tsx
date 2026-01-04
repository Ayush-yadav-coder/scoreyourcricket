import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Play, Eye, Code, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SeriesBracket from '@/components/series/SeriesBracket';

interface SeriesData {
  id: string;
  name: string;
  series_type: string;
  total_matches: number;
  start_date: string | null;
  end_date: string | null;
  created_by: string;
  team1_id: string;
  team2_id: string;
}

interface Team {
  id: string;
  name: string;
}

interface Match {
  id: string;
  status: string;
  match_type: string;
  team1: { id: string; name: string };
  team2: { id: string; name: string };
  created_by: string;
}

const Series: React.FC = () => {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [series, setSeries] = useState<SeriesData | null>(null);
  const [teams, setTeams] = useState<{ team1: Team | null; team2: Team | null }>({ team1: null, team2: null });
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (seriesId) {
      fetchSeriesData();
    }
  }, [seriesId]);

  const fetchSeriesData = async () => {
    setLoading(true);

    const { data: seriesData } = await supabase
      .from('series')
      .select('*')
      .eq('id', seriesId)
      .single();

    if (seriesData) {
      setSeries(seriesData);

      // Fetch teams
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .in('id', [seriesData.team1_id, seriesData.team2_id]);

      if (teamsData) {
        setTeams({
          team1: teamsData.find(t => t.id === seriesData.team1_id) || null,
          team2: teamsData.find(t => t.id === seriesData.team2_id) || null,
        });
      }

      // Fetch matches between these teams
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          id,
          status,
          match_type,
          created_by,
          team1:teams!matches_team1_id_fkey(id, name),
          team2:teams!matches_team2_id_fkey(id, name)
        `)
        .or(`and(team1_id.eq.${seriesData.team1_id},team2_id.eq.${seriesData.team2_id}),and(team1_id.eq.${seriesData.team2_id},team2_id.eq.${seriesData.team1_id})`)
        .order('created_at', { ascending: true })
        .limit(seriesData.total_matches);

      if (matchesData) {
        setMatches(matchesData as unknown as Match[]);
      }
    }

    setLoading(false);
  };

  const isCreator = user?.id === series?.created_by;
  const embedUrl = `${window.location.origin}/embed/ticker?match=`;

  const copyEmbedCode = (matchId: string) => {
    const code = `<iframe src="${embedUrl}${matchId}" width="400" height="200" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Embed code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!series) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold">Series not found</h2>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go Home
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">{series.name}</h1>
            <p className="text-muted-foreground">
              {teams.team1?.name} vs {teams.team2?.name} • {series.total_matches} matches
            </p>
          </div>
        </div>

        {isCreator && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm">You're managing this series</p>
                <Link to={`/new-match?team1=${series.team1_id}&team2=${series.team2_id}`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Match
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="bracket">
          <TabsList className="w-full">
            <TabsTrigger value="bracket" className="flex-1">Series Bracket</TabsTrigger>
            <TabsTrigger value="matches" className="flex-1">Matches</TabsTrigger>
            <TabsTrigger value="embed" className="flex-1">Embed Widget</TabsTrigger>
          </TabsList>

          <TabsContent value="bracket" className="mt-4">
            {teams.team1 && teams.team2 && (
              <SeriesBracket
                seriesId={seriesId!}
                seriesName={series.name}
                team1Id={teams.team1.id}
                team2Id={teams.team2.id}
                team1Name={teams.team1.name}
                team2Name={teams.team2.name}
                totalMatches={series.total_matches}
              />
            )}
          </TabsContent>

          <TabsContent value="matches" className="mt-4 space-y-4">
            {matches.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No matches scheduled yet</p>
                  {isCreator && (
                    <Link to={`/new-match?team1=${series.team1_id}&team2=${series.team2_id}`}>
                      <Button className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Schedule Match
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              matches.map((match, index) => (
                <Card key={match.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {index + 1}
                        </div>
                        {match.status === 'live' && (
                          <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                        )}
                        <div>
                          <p className="font-semibold">
                            {match.team1?.name} vs {match.team2?.name}
                          </p>
                          <p className="text-sm text-muted-foreground capitalize">
                            Match {index + 1} • {match.status}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {match.status === 'live' && match.created_by === user?.id && (
                          <Button size="sm" onClick={() => navigate(`/scoring/${match.id}`)}>
                            <Play className="h-4 w-4 mr-1" />
                            Score
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => navigate(`/match/${match.id}`)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="embed" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Embed Live Ticker Widget
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Embed a live score ticker on your website. Select a match below to get the embed code.
                </p>

                {matches.length === 0 ? (
                  <p className="text-muted-foreground">No matches available to embed.</p>
                ) : (
                  <div className="space-y-3">
                    {matches.map((match, index) => (
                      <div key={match.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">Match {index + 1}</p>
                          <p className="text-sm text-muted-foreground">
                            {match.team1?.name} vs {match.team2?.name}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyEmbedCode(match.id)}
                        >
                          {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                          Copy Code
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Preview URL:</p>
                  <Input
                    value={`${window.location.origin}/embed/ticker?match=[MATCH_ID]&theme=dark`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Options: theme=dark or theme=light
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Series;
