import { supabase } from '@/integrations/supabase/client';

interface AchievementData {
  player_id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_description?: string;
  icon_name?: string;
  match_id?: string;
  value?: number;
}

export const checkAndAwardAchievements = async (
  playerId: string,
  matchId: string,
  battingScore?: { runs: number; balls_faced: number; fours: number; sixes: number },
  bowlingScore?: { wickets: number; overs: number; runs_conceded: number }
) => {
  const achievements: AchievementData[] = [];

  // Batting achievements
  if (battingScore) {
    // Century
    if (battingScore.runs >= 100) {
      const centuryExists = await checkExistingAchievement(playerId, 'century', matchId);
      if (!centuryExists) {
        achievements.push({
          player_id: playerId,
          achievement_type: 'century',
          achievement_name: `Century - ${battingScore.runs} runs`,
          achievement_description: `Scored ${battingScore.runs} runs off ${battingScore.balls_faced} balls with ${battingScore.fours} fours and ${battingScore.sixes} sixes`,
          icon_name: 'crown',
          match_id: matchId,
          value: battingScore.runs,
        });
      }
    }
    // Half century
    else if (battingScore.runs >= 50) {
      const halfCenturyExists = await checkExistingAchievement(playerId, 'half_century', matchId);
      if (!halfCenturyExists) {
        achievements.push({
          player_id: playerId,
          achievement_type: 'half_century',
          achievement_name: `Half Century - ${battingScore.runs} runs`,
          achievement_description: `Scored ${battingScore.runs} runs off ${battingScore.balls_faced} balls`,
          icon_name: 'star',
          match_id: matchId,
          value: battingScore.runs,
        });
      }
    }
  }

  // Bowling achievements
  if (bowlingScore) {
    // 5-wicket haul
    if (bowlingScore.wickets >= 5) {
      const fiveWicketExists = await checkExistingAchievement(playerId, 'five_wickets', matchId);
      if (!fiveWicketExists) {
        achievements.push({
          player_id: playerId,
          achievement_type: 'five_wickets',
          achievement_name: `5 Wicket Haul - ${bowlingScore.wickets}/${bowlingScore.runs_conceded}`,
          achievement_description: `Took ${bowlingScore.wickets} wickets for ${bowlingScore.runs_conceded} runs in ${bowlingScore.overs} overs`,
          icon_name: 'flame',
          match_id: matchId,
          value: bowlingScore.wickets,
        });
      }
    }
  }

  // Insert all new achievements
  if (achievements.length > 0) {
    const { error } = await supabase
      .from('player_achievements')
      .insert(achievements);

    if (error) {
      console.error('Error inserting achievements:', error);
    } else {
      console.log(`Awarded ${achievements.length} achievements to player ${playerId}`);
    }
  }

  return achievements;
};

export const checkCareerMilestones = async (playerId: string) => {
  const achievements: AchievementData[] = [];

  // Check total career runs
  const { data: battingData } = await supabase
    .from('batting_scores')
    .select('runs')
    .eq('batsman_id', playerId);

  if (battingData) {
    const totalRuns = battingData.reduce((sum, b) => sum + (b.runs || 0), 0);
    
    // Career run milestones
    const runMilestones = [1000, 2000, 5000, 10000];
    for (const milestone of runMilestones) {
      if (totalRuns >= milestone) {
        const exists = await checkCareerMilestoneExists(playerId, 'career_runs', milestone);
        if (!exists) {
          achievements.push({
            player_id: playerId,
            achievement_type: 'career',
            achievement_name: `${milestone} Career Runs`,
            achievement_description: `Reached ${milestone} runs in career`,
            icon_name: 'trophy',
            value: milestone,
          });
        }
      }
    }
  }

  // Check total career wickets
  const { data: bowlingData } = await supabase
    .from('bowling_scores')
    .select('wickets')
    .eq('bowler_id', playerId);

  if (bowlingData) {
    const totalWickets = bowlingData.reduce((sum, b) => sum + (b.wickets || 0), 0);
    
    // Career wicket milestones
    const wicketMilestones = [50, 100, 200, 500];
    for (const milestone of wicketMilestones) {
      if (totalWickets >= milestone) {
        const exists = await checkCareerMilestoneExists(playerId, 'career_wickets', milestone);
        if (!exists) {
          achievements.push({
            player_id: playerId,
            achievement_type: 'career',
            achievement_name: `${milestone} Career Wickets`,
            achievement_description: `Reached ${milestone} wickets in career`,
            icon_name: 'target',
            value: milestone,
          });
        }
      }
    }
  }

  // Insert career achievements
  if (achievements.length > 0) {
    await supabase.from('player_achievements').insert(achievements);
  }

  return achievements;
};

const checkExistingAchievement = async (
  playerId: string,
  achievementType: string,
  matchId: string
): Promise<boolean> => {
  const { data } = await supabase
    .from('player_achievements')
    .select('id')
    .eq('player_id', playerId)
    .eq('achievement_type', achievementType)
    .eq('match_id', matchId)
    .maybeSingle();

  return !!data;
};

const checkCareerMilestoneExists = async (
  playerId: string,
  milestoneType: string,
  value: number
): Promise<boolean> => {
  const { data } = await supabase
    .from('player_achievements')
    .select('id')
    .eq('player_id', playerId)
    .eq('achievement_type', 'career')
    .ilike('achievement_name', `%${value}%`)
    .maybeSingle();

  return !!data;
};

export const getAchievementsSummary = async (playerId: string) => {
  const { data } = await supabase
    .from('player_achievements')
    .select('achievement_type')
    .eq('player_id', playerId);

  if (!data) return null;

  const summary = data.reduce((acc, a) => {
    acc[a.achievement_type] = (acc[a.achievement_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    centuries: summary.century || 0,
    halfCenturies: summary.half_century || 0,
    fiveWickets: summary.five_wickets || 0,
    careerMilestones: summary.career || 0,
    total: data.length,
  };
};
