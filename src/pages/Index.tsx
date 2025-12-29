import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Eye, Trophy, Users, Star, TrendingUp, Calendar, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';

interface Match {
  id: string;
  status: string;
  match_type: string;
  team1: { name: string };
  team2: { name: string };
}

interface FamousPlayer {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
}

const Index: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [famousPlayers, setFamousPlayers] = useState<FamousPlayer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLiveMatches();
    fetchFamousPlayers();
  }, []);

  const fetchLiveMatches = async () => {
    const { data } = await supabase
      .from('matches')
      .select(`
        id,
        status,
        match_type,
        team1:teams!matches_team1_id_fkey(name),
        team2:teams!matches_team2_id_fkey(name)
      `)
      .eq('status', 'live')
      .limit(5);
    
    if (data) {
      setLiveMatches(data as unknown as Match[]);
    }
  };

  const fetchFamousPlayers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, bio')
      .eq('is_famous', true)
      .limit(6);
    
    if (data) {
      setFamousPlayers(data);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
        {/* Hero Section for Non-authenticated users */}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-3xl mx-auto animate-fade-in">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary mb-6">
              <span className="font-display text-3xl font-bold text-primary-foreground">CS</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Welcome to <span className="text-primary">CricScore</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Score matches, track your career, follow your favorite players, and connect with the cricket community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="xl" onClick={() => navigate('/auth')} className="animate-pulse-glow">
                <Play className="mr-2 h-5 w-5" />
                Get Started
              </Button>
              <Button size="xl" variant="outline" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
            <Card className="animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="font-display">Score Matches</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Score live matches with ball-by-ball tracking, shot placement, and real-time updates.
                </p>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-cricket-gold/20 flex items-center justify-center mb-2">
                  <TrendingUp className="h-6 w-6 text-cricket-gold" />
                </div>
                <CardTitle className="font-display">Track Career</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  View your complete career statistics, achievements, and performance analytics.
                </p>
              </CardContent>
            </Card>

            <Card className="animate-slide-in-right" style={{ animationDelay: '0.3s' }}>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-cricket-blue/10 flex items-center justify-center mb-2">
                  <Users className="h-6 w-6 text-cricket-blue" />
                </div>
                <CardTitle className="font-display">Connect</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Follow famous players, join tournaments, and build your cricket network.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Welcome back, {profile?.full_name || 'Player'}!
            </h1>
            <p className="text-muted-foreground mt-1">Ready to score some matches?</p>
          </div>
          <Button size="lg" onClick={() => navigate('/new-match')} className="shrink-0">
            <Play className="mr-2 h-5 w-5" />
            Start Scoring
          </Button>
        </div>

        {/* Search Bar (Mobile) */}
        <form onSubmit={handleSearch} className="md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search players, teams, tournaments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/new-match">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Play className="h-6 w-6 text-primary" />
                </div>
                <span className="font-semibold text-center">Score Match</span>
              </CardContent>
            </Card>
          </Link>

          <Link to="/view-matches">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <div className="h-12 w-12 rounded-full bg-cricket-blue/10 flex items-center justify-center mb-3">
                  <Eye className="h-6 w-6 text-cricket-blue" />
                </div>
                <span className="font-semibold text-center">View Matches</span>
              </CardContent>
            </Card>
          </Link>

          <Link to="/new-tournament">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <div className="h-12 w-12 rounded-full bg-cricket-gold/20 flex items-center justify-center mb-3">
                  <Trophy className="h-6 w-6 text-cricket-gold" />
                </div>
                <span className="font-semibold text-center">Tournament</span>
              </CardContent>
            </Card>
          </Link>

          <Link to="/new-series">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                  <Calendar className="h-6 w-6 text-secondary-foreground" />
                </div>
                <span className="font-semibold text-center">Series</span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Live Matches */}
        {liveMatches.length > 0 && (
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cricket-red animate-pulse" />
                Live Matches
              </h2>
              <Link to="/view-matches?filter=live" className="text-primary text-sm hover:underline">
                View All
              </Link>
            </div>
            <div className="grid gap-4">
              {liveMatches.map((match) => (
                <Link key={match.id} to={`/match/${match.id}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-2 w-2 rounded-full bg-cricket-red animate-pulse" />
                        <div>
                          <p className="font-semibold">
                            {match.team1?.name} vs {match.team2?.name}
                          </p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {match.match_type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Watch
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Famous Players */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <Star className="h-5 w-5 text-cricket-gold" />
              Famous Players
            </h2>
            <Link to="/players" className="text-primary text-sm hover:underline">
              View All
            </Link>
          </div>
          {famousPlayers.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {famousPlayers.map((player) => (
                <Link key={player.id} to={`/player/${player.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="flex flex-col items-center p-4">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-xl font-bold text-primary">
                        {player.full_name.charAt(0)}
                      </div>
                      <p className="font-semibold text-center text-sm line-clamp-1">
                        {player.full_name}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <Star className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No famous players to show yet</p>
                <p className="text-sm text-muted-foreground">Check back soon!</p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </MainLayout>
  );
};

export default Index;
