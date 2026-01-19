import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Star, 
  Target, 
  Zap, 
  Award,
  Medal,
  Crown,
  Flame,
  Shield,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

interface Achievement {
  id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_description: string | null;
  icon_name: string;
  achieved_at: string;
  value: number | null;
}

interface PlayerAchievementsProps {
  playerId: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  star: Star,
  target: Target,
  zap: Zap,
  award: Award,
  medal: Medal,
  crown: Crown,
  flame: Flame,
  shield: Shield,
  sparkles: Sparkles,
};

const typeColors: Record<string, string> = {
  century: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  half_century: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  five_wickets: 'bg-red-500/20 text-red-500 border-red-500/30',
  hat_trick: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
  milestone: 'bg-green-500/20 text-green-500 border-green-500/30',
  career: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  match_winner: 'bg-pink-500/20 text-pink-500 border-pink-500/30',
};

const PlayerAchievements: React.FC<PlayerAchievementsProps> = ({ playerId }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
  }, [playerId]);

  const fetchAchievements = async () => {
    const { data, error } = await supabase
      .from('player_achievements')
      .select('*')
      .eq('player_id', playerId)
      .order('achieved_at', { ascending: false });

    if (!error && data) {
      setAchievements(data);
    }
    setLoading(false);
  };

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || Trophy;
    return Icon;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-12 w-12 bg-muted rounded-full"></div>
            <div className="h-4 w-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (achievements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-6">
          <Medal className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No achievements yet. Keep playing!</p>
        </CardContent>
      </Card>
    );
  }

  // Group achievements by type
  const groupedAchievements = achievements.reduce((acc, achievement) => {
    const type = achievement.achievement_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Achievements ({achievements.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Achievement badges */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(groupedAchievements).map(([type, items]) => (
            <Badge
              key={type}
              variant="outline"
              className={`${typeColors[type] || 'bg-muted'} text-xs px-3 py-1`}
            >
              {items.length}x {type.replace('_', ' ').toUpperCase()}
            </Badge>
          ))}
        </div>

        {/* Achievement list */}
        <div className="space-y-3">
          {achievements.slice(0, 10).map((achievement) => {
            const Icon = getIcon(achievement.icon_name);
            return (
              <div
                key={achievement.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  typeColors[achievement.achievement_type] || 'bg-muted/50'
                }`}
              >
                <div className="p-2 rounded-full bg-background">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">
                      {achievement.achievement_name}
                    </p>
                    {achievement.value && (
                      <Badge variant="secondary" className="text-xs">
                        {achievement.value}
                      </Badge>
                    )}
                  </div>
                  {achievement.achievement_description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {achievement.achievement_description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(achievement.achieved_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {achievements.length > 10 && (
          <p className="text-center text-sm text-muted-foreground">
            +{achievements.length - 10} more achievements
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerAchievements;
