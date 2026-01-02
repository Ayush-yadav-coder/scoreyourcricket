import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Calendar, Plus, Play, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';

interface Tournament {
  id: string;
  name: string;
  tournament_type: string;
  match_type: string;
  start_date: string | null;
  end_date: string | null;
  created_by: string;
  created_at: string;
}

const ViewTournaments: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setTournaments(data);
    }
    setLoading(false);
  };

  const filterTournaments = (filter: string) => {
    if (filter === 'all') return tournaments;
    if (filter === 'my') return tournaments.filter((t) => t.created_by === user?.id);
    return tournaments;
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-2xl font-bold">Tournaments</h1>
          </div>
          <Link to="/new-tournament">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </Link>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="my">My Tournaments</TabsTrigger>
          </TabsList>

          {['all', 'my'].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4 space-y-4">
              {filterTournaments(tab).length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No tournaments found</p>
                    <Link to="/new-tournament">
                      <Button className="mt-4">Create Tournament</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                filterTournaments(tab).map((tournament) => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    isCreator={tournament.created_by === user?.id}
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

interface TournamentCardProps {
  tournament: Tournament;
  isCreator: boolean;
}

const TournamentCard: React.FC<TournamentCardProps> = ({ tournament, isCreator }) => {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-cricket-gold/20 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-cricket-gold" />
            </div>
            <div>
              <p className="font-semibold">{tournament.name}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {tournament.match_type} • {tournament.tournament_type?.replace('_', ' ')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isCreator && (
              <Button size="sm" onClick={() => navigate(`/tournament/${tournament.id}`)}>
                <Play className="h-4 w-4 mr-1" />
                Manage
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/tournament/${tournament.id}`)}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </div>
        </div>
        {tournament.start_date && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {tournament.start_date}
              {tournament.end_date && ` - ${tournament.end_date}`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ViewTournaments;
