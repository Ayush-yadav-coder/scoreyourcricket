import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  MapPin, 
  UserPlus, 
  UserMinus, 
  Loader2,
  Trophy,
  Target,
  TrendingUp
} from 'lucide-react';

interface PlayerProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  playing_role: string | null;
  batting_style: string | null;
  bowling_style: string | null;
  location: string | null;
  is_famous: boolean;
}

interface BattingStats {
  matches: number;
  innings: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  highest: number;
  average: number;
  strikeRate: number;
  fifties: number;
  hundreds: number;
}

interface BowlingStats {
  matches: number;
  innings: number;
  overs: number;
  runs: number;
  wickets: number;
  best: string;
  average: number;
  economy: number;
  strikeRate: number;
  fiveWickets: number;
}

const PlayerProfile: React.FC = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [battingStats, setBattingStats] = useState<BattingStats | null>(null);
  const [bowlingStats, setBowlingStats] = useState<BowlingStats | null>(null);

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!playerId) return;

      setLoading(true);

      // Fetch player profile
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', playerId)
        .maybeSingle();

      if (error || !profileData) {
        toast.error('Player not found');
        navigate('/search');
        return;
      }

      setPlayer(profileData as PlayerProfile);

      // Fetch follow counts
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', playerId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', playerId),
      ]);

      setFollowerCount(followers || 0);
      setFollowingCount(following || 0);

      // Check if current user follows this player
      if (user) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', playerId)
          .maybeSingle();
        
        setIsFollowing(!!followData);
      }

      // Fetch batting stats
      const { data: battingData } = await supabase
        .from('batting_scores')
        .select('runs, balls_faced, fours, sixes, is_out')
        .eq('batsman_id', playerId);

      if (battingData && battingData.length > 0) {
        const totalRuns = battingData.reduce((sum, b) => sum + (b.runs || 0), 0);
        const totalBalls = battingData.reduce((sum, b) => sum + (b.balls_faced || 0), 0);
        const totalFours = battingData.reduce((sum, b) => sum + (b.fours || 0), 0);
        const totalSixes = battingData.reduce((sum, b) => sum + (b.sixes || 0), 0);
        const dismissals = battingData.filter(b => b.is_out).length;
        const scores = battingData.map(b => b.runs || 0);
        const highest = Math.max(...scores, 0);
        const fifties = scores.filter(s => s >= 50 && s < 100).length;
        const hundreds = scores.filter(s => s >= 100).length;

        setBattingStats({
          matches: battingData.length,
          innings: battingData.length,
          runs: totalRuns,
          balls: totalBalls,
          fours: totalFours,
          sixes: totalSixes,
          highest,
          average: dismissals > 0 ? totalRuns / dismissals : totalRuns,
          strikeRate: totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0,
          fifties,
          hundreds,
        });
      }

      // Fetch bowling stats
      const { data: bowlingData } = await supabase
        .from('bowling_scores')
        .select('overs, runs_conceded, wickets, maidens')
        .eq('bowler_id', playerId);

      if (bowlingData && bowlingData.length > 0) {
        const totalOvers = bowlingData.reduce((sum, b) => sum + Number(b.overs || 0), 0);
        const totalRuns = bowlingData.reduce((sum, b) => sum + (b.runs_conceded || 0), 0);
        const totalWickets = bowlingData.reduce((sum, b) => sum + (b.wickets || 0), 0);
        const wicketCounts = bowlingData.map(b => b.wickets || 0);
        const bestWickets = Math.max(...wicketCounts, 0);
        const bestInnings = bowlingData.find(b => b.wickets === bestWickets);
        const fiveWickets = wicketCounts.filter(w => w >= 5).length;

        setBowlingStats({
          matches: bowlingData.length,
          innings: bowlingData.length,
          overs: totalOvers,
          runs: totalRuns,
          wickets: totalWickets,
          best: bestInnings ? `${bestWickets}/${bestInnings.runs_conceded || 0}` : '0/0',
          average: totalWickets > 0 ? totalRuns / totalWickets : 0,
          economy: totalOvers > 0 ? totalRuns / totalOvers : 0,
          strikeRate: totalWickets > 0 ? (totalOvers * 6) / totalWickets : 0,
          fiveWickets,
        });
      }

      setLoading(false);
    };

    fetchPlayerData();
  }, [playerId, user, navigate]);

  const handleFollow = async () => {
    if (!user) {
      toast.error('Please sign in to follow players');
      navigate('/auth');
      return;
    }

    if (!playerId || playerId === user.id) return;

    setFollowLoading(true);

    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', playerId);

      if (!error) {
        setIsFollowing(false);
        setFollowerCount(prev => prev - 1);
        toast.success('Unfollowed');
      }
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: playerId });

      if (!error) {
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        toast.success('Following!');
      }
    }

    setFollowLoading(false);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!player) return null;

  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                <AvatarImage src={player.avatar_url || ''} alt={player.full_name} />
                <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                  {player.full_name?.charAt(0) || 'P'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <h1 className="font-display text-2xl font-bold">{player.full_name}</h1>
                  {player.is_famous && (
                    <Badge variant="secondary">Famous</Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-muted-foreground mb-3">
                  {player.playing_role && <span>{player.playing_role}</span>}
                  {player.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {player.location}
                    </span>
                  )}
                </div>

                {player.bio && (
                  <p className="text-sm text-muted-foreground mb-4">{player.bio}</p>
                )}

                <div className="flex items-center justify-center sm:justify-start gap-6 mb-4">
                  <div className="text-center">
                    <div className="font-bold text-lg">{followerCount}</div>
                    <div className="text-xs text-muted-foreground">Followers</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg">{followingCount}</div>
                    <div className="text-xs text-muted-foreground">Following</div>
                  </div>
                </div>

                {user && user.id !== playerId && (
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    onClick={handleFollow}
                    disabled={followLoading}
                  >
                    {followLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isFollowing ? (
                      <>
                        <UserMinus className="h-4 w-4 mr-2" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Follow
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Tabs defaultValue="batting" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="batting">Batting</TabsTrigger>
            <TabsTrigger value="bowling">Bowling</TabsTrigger>
          </TabsList>

          <TabsContent value="batting">
            {battingStats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Matches" value={battingStats.matches} icon={Trophy} />
                <StatCard label="Runs" value={battingStats.runs} icon={TrendingUp} />
                <StatCard label="Average" value={battingStats.average.toFixed(2)} icon={Target} />
                <StatCard label="Strike Rate" value={battingStats.strikeRate.toFixed(2)} />
                <StatCard label="Highest" value={battingStats.highest} />
                <StatCard label="50s" value={battingStats.fifties} />
                <StatCard label="100s" value={battingStats.hundreds} />
                <StatCard label="6s" value={battingStats.sixes} />
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No batting records yet
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bowling">
            {bowlingStats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Matches" value={bowlingStats.matches} icon={Trophy} />
                <StatCard label="Wickets" value={bowlingStats.wickets} icon={Target} />
                <StatCard label="Average" value={bowlingStats.average.toFixed(2)} />
                <StatCard label="Economy" value={bowlingStats.economy.toFixed(2)} icon={TrendingUp} />
                <StatCard label="Best" value={bowlingStats.best} />
                <StatCard label="Overs" value={bowlingStats.overs.toFixed(1)} />
                <StatCard label="5W" value={bowlingStats.fiveWickets} />
                <StatCard label="SR" value={bowlingStats.strikeRate.toFixed(1)} />
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No bowling records yet
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

const StatCard: React.FC<{ 
  label: string; 
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
}> = ({ label, value, icon: Icon }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        {Icon && <Icon className="h-5 w-5 text-primary/50" />}
      </div>
    </CardContent>
  </Card>
);

export default PlayerProfile;
