export type SmartDelivery = {
  innings_id?: string;
  over_number: number;
  ball_number: number;
  runs: number;
  dismissal_type?: string | null;
  is_wicket?: boolean;
  is_boundary?: boolean;
  is_six?: boolean;
  is_wide?: boolean;
  is_no_ball?: boolean;
};

export const isLegalBall = (d: SmartDelivery) => !d.is_wide && !d.is_no_ball;

/**
 * Powerplay end (default: after 6 overs). We approximate using over_number + ball_number.
 * over_number is 0-indexed in this codebase.
 */
export const shouldNotifyPowerplayEnd = (
  d: SmartDelivery,
  powerplayOvers: number,
  alreadyNotified: Set<string>
) => {
  if (!isLegalBall(d)) return false;

  // End of the powerplay = last ball of the last powerplay over
  const isEndBall = d.over_number === powerplayOvers - 1 && d.ball_number >= 6;
  if (!isEndBall) return false;

  const key = `${d.innings_id || 'unknown'}-pp${powerplayOvers}`;
  if (alreadyNotified.has(key)) return false;
  alreadyNotified.add(key);
  return true;
};

/**
 * Tracks consecutive legal dot balls per innings. Resets on runs/extras.
 */
export const updateDotStreak = (streaks: Map<string, number>, d: SmartDelivery) => {
  const inningsKey = d.innings_id || 'unknown';

  if (!isLegalBall(d)) {
    // Don't affect streak on illegal deliveries
    return streaks.get(inningsKey) || 0;
  }

  const isDot = (d.runs ?? 0) === 0 && !d.is_wicket;
  const next = isDot ? (streaks.get(inningsKey) || 0) + 1 : 0;
  streaks.set(inningsKey, next);
  return next;
};

export const shouldNotifyPressure = (dotStreak: number) => dotStreak === 4 || dotStreak === 6;
