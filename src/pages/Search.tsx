import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search as SearchIcon, UserPlus, UserMinus, Loader2, MapPin, Users } from 'lucide-react';

interface PlayerProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  playing_role: string | null;
  location: string | null;
  is_famous: boolean;
}

const Search: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  // Fetch players based on search
  useEffect(() => {
    const searchPlayers = async () => {
      if (!query.trim()) {
        // Show some famous players by default
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, playing_role, location, is_famous')
          .eq('is_famous', true)
          .limit(20);
        
        setPlayers((data || []) as PlayerProfile[]);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, playing_role, location, is_famous')
        .ilike('full_name', `%${query}%`)
        .limit(50);

      if (error) {
        console.error('Search error:', error);
      } else {
        setPlayers((data || []) as PlayerProfile[]);
      }
      setLoading(false);
    };

    searchPlayers();
  }, [query]);

  // Fetch user's following list
  useEffect(() => {
    const fetchFollowing = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (data) {
        setFollowing(new Set(data.map(f => f.following_id)));
      }
    };

    fetchFollowing();
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(query ? { q: query } : {});
  };

  const handleFollow = async (playerId: string) => {
    if (!user) {
      toast.error('Please sign in to follow players');
      navigate('/auth');
      return;
    }

    if (playerId === user.id) {
      toast.error("You can't follow yourself");
      return;
    }

    setFollowLoading(playerId);

    if (following.has(playerId)) {
      // Unfollow
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', playerId);

      if (error) {
        toast.error('Failed to unfollow');
      } else {
        setFollowing(prev => {
          const newSet = new Set(prev);
          newSet.delete(playerId);
          return newSet;
        });
        toast.success('Unfollowed successfully');
      }
    } else {
      // Follow
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: playerId });

      if (error) {
        toast.error('Failed to follow');
      } else {
        setFollowing(prev => new Set([...prev, playerId]));
        toast.success('Following!');
      }
    }

    setFollowLoading(null);
  };

  const handleViewProfile = (playerId: string) => {
    navigate(`/player/${playerId}`);
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl">
        {/* Search Header */}
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold mb-4">Find Players</h1>
          <form onSubmit={handleSearch}>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search players by name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
          </form>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {query ? 'No players found' : 'Search for players to follow'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {!query && (
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Famous Players</h2>
            )}
            {players.map((player) => (
              <Card key={player.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar 
                      className="h-14 w-14 cursor-pointer" 
                      onClick={() => handleViewProfile(player.id)}
                    >
                      <AvatarImage src={player.avatar_url || ''} alt={player.full_name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {player.full_name?.charAt(0) || 'P'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 
                          className="font-semibold truncate cursor-pointer hover:text-primary"
                          onClick={() => handleViewProfile(player.id)}
                        >
                          {player.full_name}
                        </h3>
                        {player.is_famous && (
                          <Badge variant="secondary" className="text-xs">Famous</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        {player.playing_role && (
                          <span>{player.playing_role}</span>
                        )}
                        {player.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {player.location}
                          </span>
                        )}
                      </div>
                    </div>

                    {user && player.id !== user.id && (
                      <Button
                        variant={following.has(player.id) ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleFollow(player.id)}
                        disabled={followLoading === player.id}
                      >
                        {followLoading === player.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : following.has(player.id) ? (
                          <>
                            <UserMinus className="h-4 w-4 mr-1" />
                            Unfollow
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Follow
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Search;
