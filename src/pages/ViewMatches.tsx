import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Play, Eye, Calendar, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import MatchNotifications from '@/components/match/MatchNotifications';

interface Match {
  id: string;
  status: string;
  match_type: string;
  created_by: string;
  created_at: string;
  is_live_streaming: boolean;
  team1: { id: string; name: string };
  team2: { id: string; name: string };
}

const ViewMatches: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(filterParam || 'all');

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('matches')
      .select(`
        id,
        status,
        match_type,
        created_by,
        created_at,
        is_live_streaming,
        team1:teams!matches_team1_id_fkey(id, name),
        team2:teams!matches_team2_id_fkey(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setMatches(data as unknown as Match[]);
    }
    setLoading(false);
  };

  const filterMatches = (status: string) => {
    if (status === 'all') return matches;
    if (status === 'my') return matches.filter((m) => m.created_by === user?.id);
    return matches.filter((m) => m.status === status);
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

  return (
    <MainLayout>
      <MatchNotifications enabled={true} />
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-2xl font-bold">Matches</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            <TabsTrigger value="live" className="flex-1">Live</TabsTrigger>
            <TabsTrigger value="completed" className="flex-1">Completed</TabsTrigger>
            <TabsTrigger value="my" className="flex-1">My Matches</TabsTrigger>
          </TabsList>

          {['all', 'live', 'completed', 'my'].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4 space-y-4">
              {filterMatches(tab).length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No matches found</p>
                    <Link to="/new-match">
                      <Button className="mt-4">Start a Match</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                filterMatches(tab).map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    isCreator={match.created_by === user?.id}
                  />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </MainLayout>
  );
};

interface MatchCardProps {
  match: Match;
  isCreator: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, isCreator }) => {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {match.status === 'live' && (
              <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">
                  {match.team1?.name} vs {match.team2?.name}
                </p>
                {match.is_live_streaming && match.status === 'live' && (
                  <Badge variant="destructive" className="text-xs flex items-center gap-1">
                    <Radio className="h-3 w-3" />
                    LIVE
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground capitalize">
                {match.match_type.replace('_', ' ')} • {match.status}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {match.status === 'live' && isCreator && (
              <Button size="sm" onClick={() => navigate(`/scoring/${match.id}`)}>
                <Play className="h-4 w-4 mr-1" />
                Continue
              </Button>
            )}
            {match.is_live_streaming && match.status === 'live' && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => navigate(`/match/${match.id}?tab=live`)}
              >
                <Radio className="h-4 w-4 mr-1" />
                View Live
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/match/${match.id}`)}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ViewMatches;
