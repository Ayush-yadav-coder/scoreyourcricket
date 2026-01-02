import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Play, Eye, Trophy, Users, Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Tournament {
  id: string;
  name: string;
  tournament_type: string;
  match_type: string;
  start_date: string | null;
  end_date: string | null;
  created_by: string;
}

interface Team {
  id: string;
  name: string;
}

interface TournamentGroup {
  id: string;
  name: string;
  teams: Team[];
}

interface Match {
  id: string;
  status: string;
  match_type: string;
  team1: { id: string; name: string };
  team2: { id: string; name: string };
  created_by: string;
}

const Tournament: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<TournamentGroup[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    fetchTournamentData();
  }, [tournamentId]);

  const fetchTournamentData = async () => {
    setLoading(true);

    // Fetch tournament
    const { data: tournamentData } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (tournamentData) {
      setTournament(tournamentData);

      // Fetch teams
      const { data: tournamentTeams } = await supabase
        .from('tournament_teams')
        .select('team_id, teams(id, name)')
        .eq('tournament_id', tournamentId);

      if (tournamentTeams) {
        setTeams(tournamentTeams.map((tt: any) => tt.teams));
      }

      // Fetch groups if group stage
      if (tournamentData.tournament_type === 'group_stage') {
        const { data: groupsData } = await supabase
          .from('tournament_groups')
          .select('id, name')
          .eq('tournament_id', tournamentId);

        if (groupsData) {
          const groupsWithTeams = await Promise.all(
            groupsData.map(async (group: any) => {
              const { data: groupTeams } = await supabase
                .from('tournament_group_teams')
                .select('team_id, teams(id, name)')
                .eq('group_id', group.id);

              return {
                ...group,
                teams: groupTeams?.map((gt: any) => gt.teams) || [],
              };
            })
          );
          setGroups(groupsWithTeams);
        }
      }

      // Fetch matches
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
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: false });

      if (matchesData) {
        setMatches(matchesData as unknown as Match[]);
      }
    }

    setLoading(false);
  };

  const isCreator = user?.id === tournament?.created_by;

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!tournament) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold">Tournament not found</h2>
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
            <h1 className="font-display text-2xl font-bold">{tournament.name}</h1>
            <p className="text-muted-foreground capitalize">
              {tournament.match_type} • {tournament.tournament_type?.replace('_', ' ')}
            </p>
          </div>
        </div>

        {isCreator && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm">You're managing this tournament</p>
                <Link to={`/new-match?tournament=${tournamentId}`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Match
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="matches">
          <TabsList className="w-full">
            <TabsTrigger value="matches" className="flex-1">Matches</TabsTrigger>
            <TabsTrigger value="teams" className="flex-1">Teams</TabsTrigger>
            {groups.length > 0 && (
              <TabsTrigger value="groups" className="flex-1">Groups</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="matches" className="mt-4 space-y-4">
            {matches.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No matches scheduled yet</p>
                  {isCreator && (
                    <Link to={`/new-match?tournament=${tournamentId}`}>
                      <Button className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Schedule Match
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              matches.map((match) => (
                <MatchCard 
                  key={match.id} 
                  match={match} 
                  isCreator={match.created_by === user?.id} 
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="teams" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {teams.map((team) => (
                <Card key={team.id}>
                  <CardContent className="py-4 text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-medium">{team.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {groups.length > 0 && (
            <TabsContent value="groups" className="mt-4 space-y-4">
              {groups.map((group) => (
                <Card key={group.id}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {group.teams.map((team, index) => (
                        <div
                          key={team.id}
                          className="flex items-center gap-3 p-2 bg-secondary/50 rounded"
                        >
                          <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
                          <span className="font-medium">{team.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          )}
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

  const handleClick = () => {
    if (match.status === 'live' && isCreator) {
      // Show options dialog would be handled here
      navigate(`/scoring/${match.id}`);
    } else {
      navigate(`/match/${match.id}`);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleClick}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {match.status === 'live' && (
              <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            )}
            <div>
              <p className="font-semibold">
                {match.team1?.name} vs {match.team2?.name}
              </p>
              <p className="text-sm text-muted-foreground capitalize">
                {match.status}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {match.status === 'live' && isCreator && (
              <Button size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/scoring/${match.id}`); }}>
                <Play className="h-4 w-4 mr-1" />
                Score
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/match/${match.id}`); }}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Tournament;
