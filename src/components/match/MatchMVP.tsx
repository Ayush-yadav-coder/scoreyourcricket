import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Users, Crown, Star, TrendingUp, Target } from 'lucide-react';

interface MatchMVPProps {
  matchId: string;
  battingScores: {
    batsman_id: string;
    runs: number | null;
    balls_faced: number | null;
    fours: number | null;
    sixes: number | null;
  }[];
  bowlingScores: {
    bowler_id: string;
    wickets: number | null;
    runs_conceded: number | null;
    overs: number | null;
  }[];
  playerNames: Record<string, string>;
}

interface MVPCandidate {
  playerId: string;
  name: string;
  avatarUrl?: string;
  mvpScore: number;
  battingContribution: {
    runs: number;
    strikeRate: number;
    boundaries: number;
  } | null;
  bowlingContribution: {
    wickets: number;
    economy: number;
  } | null;
  highlights: string[];
}

const MatchMVP: React.FC<MatchMVPProps> = ({
  matchId,
  battingScores,
  bowlingScores,
  playerNames,
}) => {
  const [mvpCandidates, setMvpCandidates] = useState<MVPCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerProfiles, setPlayerProfiles] = useState<Record<string, { avatar_url: string | null }>>({});

  useEffect(() => {
    calculateMVP();
    fetchPlayerProfiles();
  }, [battingScores, bowlingScores]);

  const fetchPlayerProfiles = async () => {
    const allPlayerIds = [
      ...new Set([
        ...battingScores.map(b => b.batsman_id),
        ...bowlingScores.map(b => b.bowler_id),
      ])
    ];

    if (allPlayerIds.length === 0) return;

    const { data } = await supabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', allPlayerIds);

    if (data) {
      const profiles: Record<string, { avatar_url: string | null }> = {};
      data.forEach(p => {
        profiles[p.id] = { avatar_url: p.avatar_url };
      });
      setPlayerProfiles(profiles);
    }
  };

  const calculateMVP = () => {
    const candidates: Record<string, MVPCandidate> = {};

    // Process batting scores
    battingScores.forEach(bs => {
      const runs = bs.runs || 0;
      const balls = bs.balls_faced || 1;
      const fours = bs.fours || 0;
      const sixes = bs.sixes || 0;
      const strikeRate = (runs / balls) * 100;

      if (!candidates[bs.batsman_id]) {
        candidates[bs.batsman_id] = {
          playerId: bs.batsman_id,
          name: playerNames[bs.batsman_id] || 'Unknown',
          mvpScore: 0,
          battingContribution: null,
          bowlingContribution: null,
          highlights: [],
        };
      }

      candidates[bs.batsman_id].battingContribution = {
        runs,
        strikeRate,
        boundaries: fours + sixes,
      };

      // MVP Score calculation for batting
      let battingScore = runs * 1; // 1 point per run
      if (runs >= 100) battingScore += 50; // Century bonus
      else if (runs >= 50) battingScore += 25; // Fifty bonus
      if (strikeRate > 150) battingScore += 20; // High SR bonus
      else if (strikeRate > 120) battingScore += 10;
      battingScore += sixes * 3; // Extra points for sixes
      battingScore += fours * 1; // Extra points for fours

      candidates[bs.batsman_id].mvpScore += battingScore;

      // Add highlights
      if (runs >= 100) candidates[bs.batsman_id].highlights.push('💯 Century');
      else if (runs >= 50) candidates[bs.batsman_id].highlights.push('⭐ Half-Century');
      if (strikeRate > 150) candidates[bs.batsman_id].highlights.push('🚀 High Strike Rate');
      if (sixes >= 3) candidates[bs.batsman_id].highlights.push(`💥 ${sixes} Sixes`);
    });

    // Process bowling scores
    bowlingScores.forEach(bs => {
      const wickets = bs.wickets || 0;
      const runs = bs.runs_conceded || 0;
      const overs = Number(bs.overs) || 1;
      const economy = runs / overs;

      if (!candidates[bs.bowler_id]) {
        candidates[bs.bowler_id] = {
          playerId: bs.bowler_id,
          name: playerNames[bs.bowler_id] || 'Unknown',
          mvpScore: 0,
          battingContribution: null,
          bowlingContribution: null,
          highlights: [],
        };
      }

      candidates[bs.bowler_id].bowlingContribution = {
        wickets,
        economy,
      };

      // MVP Score calculation for bowling
      let bowlingScore = wickets * 25; // 25 points per wicket
      if (wickets >= 5) bowlingScore += 50; // 5-wicket haul bonus
      else if (wickets >= 3) bowlingScore += 20; // 3-wicket bonus
      if (economy < 6) bowlingScore += 20; // Economy bonus
      else if (economy < 8) bowlingScore += 10;

      candidates[bs.bowler_id].mvpScore += bowlingScore;

      // Add highlights
      if (wickets >= 5) candidates[bs.bowler_id].highlights.push('🎯 5-Wicket Haul');
      else if (wickets >= 3) candidates[bs.bowler_id].highlights.push('🎯 3+ Wickets');
      if (economy < 6) candidates[bs.bowler_id].highlights.push('💪 Excellent Economy');
    });

    // Sort by MVP score and take top 5
    const sortedCandidates = Object.values(candidates)
      .filter(c => c.mvpScore > 0)
      .sort((a, b) => b.mvpScore - a.mvpScore)
      .slice(0, 5);

    setMvpCandidates(sortedCandidates);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mvpCandidates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Match MVP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No performance data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const mvp = mvpCandidates[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          Match MVP
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* MVP Display */}
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-4 border border-yellow-500/30">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-yellow-500">
                <AvatarImage src={playerProfiles[mvp.playerId]?.avatar_url || ''} />
                <AvatarFallback className="bg-yellow-500/20 text-yellow-600 text-xl">
                  {mvp.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Crown className="absolute -top-2 -right-2 h-6 w-6 text-yellow-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{mvp.name}</h3>
              <div className="flex flex-wrap gap-1 mt-1">
                {mvp.highlights.map((highlight, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {highlight}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-yellow-500">{mvp.mvpScore}</p>
              <p className="text-xs text-muted-foreground">MVP Points</p>
            </div>
          </div>

          {/* MVP Stats */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            {mvp.battingContribution && (
              <div className="bg-background/50 rounded p-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="h-3 w-3" />
                  Batting
                </div>
                <p className="font-bold">{mvp.battingContribution.runs} runs</p>
                <p className="text-xs text-muted-foreground">
                  SR: {mvp.battingContribution.strikeRate.toFixed(1)}
                </p>
              </div>
            )}
            {mvp.bowlingContribution && (
              <div className="bg-background/50 rounded p-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Target className="h-3 w-3" />
                  Bowling
                </div>
                <p className="font-bold">{mvp.bowlingContribution.wickets} wickets</p>
                <p className="text-xs text-muted-foreground">
                  Econ: {mvp.bowlingContribution.economy.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Other Contenders */}
        {mvpCandidates.length > 1 && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Other Top Performers</h4>
            <div className="space-y-2">
              {mvpCandidates.slice(1).map((candidate, index) => (
                <div
                  key={candidate.playerId}
                  className="flex items-center gap-3 p-2 rounded bg-muted/50"
                >
                  <span className="text-sm font-bold text-muted-foreground w-6">
                    #{index + 2}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={playerProfiles[candidate.playerId]?.avatar_url || ''} />
                    <AvatarFallback className="text-xs">
                      {candidate.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{candidate.name}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {candidate.battingContribution && (
                        <span>{candidate.battingContribution.runs} runs</span>
                      )}
                      {candidate.bowlingContribution && (
                        <span>{candidate.bowlingContribution.wickets} wickets</span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline">{candidate.mvpScore} pts</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchMVP;
