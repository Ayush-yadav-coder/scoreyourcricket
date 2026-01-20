import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Users, 
  Trophy,
  TrendingUp,
  Crown,
  Shield,
  Target,
  Calendar,
  Edit,
  UserPlus
} from 'lucide-react';
import TeamPerformanceTracker from '@/components/team/TeamPerformanceTracker';

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  created_by: string | null;
  created_at: string;
}

interface TeamMember {
  id: string;
  player_id: string;
  is_captain: boolean;
  is_wicketkeeper: boolean;
  jersey_number: number | null;
  player: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    playing_role: string | null;
    batting_style: string | null;
    bowling_style: string | null;
  };
}

interface MatchHistory {
  id: string;
  match_type: string;
  status: string;
  team1_id: string;
  team2_id: string;
  team1_name: string;
  team2_name: string;
  team1_score: number;
  team2_score: number;
  result: 'won' | 'lost' | 'draw';
  created_at: string;
}

const TeamProfile: React.FC = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    if (teamId) {
      fetchTeamData();
    }
  }, [teamId, user]);

  const fetchTeamData = async () => {
    if (!teamId) return;
    
    setLoading(true);
    
    try {
      // Fetch team details
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .maybeSingle();

      if (teamError || !teamData) {
        toast.error('Team not found');
        navigate('/search');
        return;
      }

      setTeam(teamData);
      setIsCreator(user?.id === teamData.created_by);

      // Fetch team members with player details
      const { data: membersData } = await supabase
        .from('team_members')
        .select(`
          id,
          player_id,
          is_captain,
          is_wicketkeeper,
          jersey_number,
          profiles:player_id (
            id,
            full_name,
            avatar_url,
            playing_role,
            batting_style,
            bowling_style
          )
        `)
        .eq('team_id', teamId);

      if (membersData) {
        const formattedMembers = membersData.map((m: any) => ({
          id: m.id,
          player_id: m.player_id,
          is_captain: m.is_captain,
          is_wicketkeeper: m.is_wicketkeeper,
          jersey_number: m.jersey_number,
          player: m.profiles || {
            id: m.player_id,
            full_name: 'Unknown',
            avatar_url: null,
            playing_role: null,
            batting_style: null,
            bowling_style: null,
          }
        }));
        setMembers(formattedMembers);
      }

      // Fetch match history
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          id,
          match_type,
          status,
          team1_id,
          team2_id,
          created_at,
          innings (
            batting_team_id,
            total_runs
          )
        `)
        .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (matchesData) {
        // Get team names
        const teamIds = new Set<string>();
        matchesData.forEach(m => {
          teamIds.add(m.team1_id);
          teamIds.add(m.team2_id);
        });

        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name')
          .in('id', Array.from(teamIds));

        const teamNamesMap: Record<string, string> = {};
        teamsData?.forEach(t => {
          teamNamesMap[t.id] = t.name;
        });

        const history: MatchHistory[] = matchesData.map((match: any) => {
          const innings = match.innings || [];
          const teamScore = innings
            .filter((i: any) => i.batting_team_id === teamId)
            .reduce((sum: number, i: any) => sum + (i.total_runs || 0), 0);
          const oppScore = innings
            .filter((i: any) => i.batting_team_id !== teamId)
            .reduce((sum: number, i: any) => sum + (i.total_runs || 0), 0);

          return {
            id: match.id,
            match_type: match.match_type,
            status: match.status,
            team1_id: match.team1_id,
            team2_id: match.team2_id,
            team1_name: teamNamesMap[match.team1_id] || 'Team 1',
            team2_name: teamNamesMap[match.team2_id] || 'Team 2',
            team1_score: match.team1_id === teamId ? teamScore : oppScore,
            team2_score: match.team2_id === teamId ? teamScore : oppScore,
            result: teamScore > oppScore ? 'won' : teamScore < oppScore ? 'lost' : 'draw',
            created_at: match.created_at,
          };
        });

        setMatchHistory(history);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-32 mb-6" />
          <Skeleton className="h-48 w-full mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!team) return null;

  const captain = members.find(m => m.is_captain);
  const wicketkeeper = members.find(m => m.is_wicketkeeper);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Team Header */}
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 border-4 border-background">
                <AvatarImage src={team.logo_url || ''} alt={team.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                  {team.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-display text-3xl font-bold">{team.name}</h1>
                  {isCreator && (
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {members.length} Players
                  </span>
                  {captain && (
                    <span className="flex items-center gap-1">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      Captain: {captain.player.full_name}
                    </span>
                  )}
                  {wicketkeeper && (
                    <span className="flex items-center gap-1">
                      <Shield className="h-4 w-4 text-blue-500" />
                      WK: {wicketkeeper.player.full_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="performance">
              <TrendingUp className="h-4 w-4 mr-1" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="squad">
              <Users className="h-4 w-4 mr-1" />
              Squad
            </TabsTrigger>
            <TabsTrigger value="matches">
              <Calendar className="h-4 w-4 mr-1" />
              Matches
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance">
            <TeamPerformanceTracker teamId={team.id} teamName={team.name} />
          </TabsContent>

          <TabsContent value="squad" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Team Squad
                  </CardTitle>
                  {isCreator && (
                    <Button size="sm" variant="outline">
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add Player
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {members.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {members
                      .sort((a, b) => {
                        if (a.is_captain) return -1;
                        if (b.is_captain) return 1;
                        if (a.is_wicketkeeper) return -1;
                        if (b.is_wicketkeeper) return 1;
                        return 0;
                      })
                      .map((member) => (
                        <Link
                          key={member.id}
                          to={`/player/${member.player_id}`}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={member.player.avatar_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {member.player.full_name?.charAt(0) || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{member.player.full_name}</p>
                              {member.jersey_number && (
                                <Badge variant="outline" className="text-xs">
                                  #{member.jersey_number}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {member.player.playing_role || 'Player'}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {member.is_captain && (
                              <Badge variant="secondary" className="text-xs">
                                <Crown className="h-3 w-3 mr-1" />
                                C
                              </Badge>
                            )}
                            {member.is_wicketkeeper && (
                              <Badge variant="secondary" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                WK
                              </Badge>
                            )}
                          </div>
                        </Link>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No players in squad yet</p>
                    {isCreator && (
                      <Button variant="outline" className="mt-3">
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add Players
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Role Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Role Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'].map((role) => {
                    const count = members.filter(m => 
                      m.player.playing_role?.toLowerCase().includes(role.toLowerCase().split('-')[0])
                    ).length;
                    return (
                      <div key={role} className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold text-primary">{count}</p>
                        <p className="text-xs text-muted-foreground">{role}s</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Recent Matches
                </CardTitle>
              </CardHeader>
              <CardContent>
                {matchHistory.length > 0 ? (
                  <div className="space-y-3">
                    {matchHistory.map((match) => (
                      <Link
                        key={match.id}
                        to={`/match/${match.id}`}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{match.team1_name}</span>
                            <span className="text-muted-foreground">vs</span>
                            <span className="font-medium">{match.team2_name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {match.team1_score} - {match.team2_score} • {match.match_type.toUpperCase()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            match.result === 'won' ? 'default' :
                            match.result === 'lost' ? 'destructive' : 'secondary'
                          }
                        >
                          {match.result === 'won' ? 'Won' : match.result === 'lost' ? 'Lost' : 'Draw'}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No matches played yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default TeamProfile;
