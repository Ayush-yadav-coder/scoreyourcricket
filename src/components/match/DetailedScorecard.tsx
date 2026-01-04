import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trophy, Target } from 'lucide-react';

interface BattingEntry {
  batsman_id: string;
  batsman_name: string;
  runs: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  strike_rate: number;
  is_out: boolean;
  dismissal_type?: string | null;
  bowler_name?: string | null;
  fielder_name?: string | null;
}

interface BowlingEntry {
  bowler_id: string;
  bowler_name: string;
  overs: number;
  maidens: number;
  runs_conceded: number;
  wickets: number;
  economy: number;
  wides?: number;
  no_balls?: number;
}

interface DetailedScorecardProps {
  battingTeamName: string;
  bowlingTeamName: string;
  battingScorecard: BattingEntry[];
  bowlingScorecard: BowlingEntry[];
  totalRuns: number;
  totalWickets: number;
  totalOvers: number;
  extras?: { wides: number; no_balls: number; byes: number; leg_byes: number; total: number };
}

const DetailedScorecard: React.FC<DetailedScorecardProps> = ({
  battingTeamName,
  bowlingTeamName,
  battingScorecard,
  bowlingScorecard,
  totalRuns,
  totalWickets,
  totalOvers,
  extras,
}) => {
  const getDismissalText = (entry: BattingEntry): string => {
    if (!entry.is_out) return 'not out';
    if (!entry.dismissal_type) return 'out';
    
    switch (entry.dismissal_type) {
      case 'bowled':
        return `b ${entry.bowler_name || ''}`;
      case 'caught':
        return `c ${entry.fielder_name || ''} b ${entry.bowler_name || ''}`;
      case 'lbw':
        return `lbw b ${entry.bowler_name || ''}`;
      case 'run_out':
        return `run out (${entry.fielder_name || ''})`;
      case 'stumped':
        return `st ${entry.fielder_name || ''} b ${entry.bowler_name || ''}`;
      case 'hit_wicket':
        return `hit wicket b ${entry.bowler_name || ''}`;
      case 'retired':
        return 'retired hurt';
      default:
        return entry.dismissal_type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Batting Scorecard */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            {battingTeamName} - Batting
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Batsman</TableHead>
                  <TableHead className="text-muted-foreground text-center">R</TableHead>
                  <TableHead className="text-muted-foreground text-center">B</TableHead>
                  <TableHead className="text-muted-foreground text-center">4s</TableHead>
                  <TableHead className="text-muted-foreground text-center">6s</TableHead>
                  <TableHead className="text-muted-foreground text-center">SR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {battingScorecard.map((entry) => (
                  <TableRow key={entry.batsman_id} className="border-border">
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{entry.batsman_name}</p>
                        <p className="text-xs text-muted-foreground">{getDismissalText(entry)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-foreground">
                      {entry.runs}
                      {entry.runs >= 50 && entry.runs < 100 && (
                        <Badge variant="secondary" className="ml-1 text-xs">50</Badge>
                      )}
                      {entry.runs >= 100 && (
                        <Badge variant="default" className="ml-1 text-xs">💯</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{entry.balls_faced}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{entry.fours}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{entry.sixes}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{entry.strike_rate.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Extras and Total */}
          <div className="p-4 border-t border-border space-y-2">
            {extras && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Extras (b {extras.byes}, lb {extras.leg_byes}, w {extras.wides}, nb {extras.no_balls})
                </span>
                <span className="font-medium text-foreground">{extras.total}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between">
              <span className="font-bold text-foreground">Total ({totalWickets} wkts, {totalOvers} ov)</span>
              <span className="text-2xl font-bold text-primary">{totalRuns}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bowling Scorecard */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            {bowlingTeamName} - Bowling
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Bowler</TableHead>
                  <TableHead className="text-muted-foreground text-center">O</TableHead>
                  <TableHead className="text-muted-foreground text-center">M</TableHead>
                  <TableHead className="text-muted-foreground text-center">R</TableHead>
                  <TableHead className="text-muted-foreground text-center">W</TableHead>
                  <TableHead className="text-muted-foreground text-center">Econ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bowlingScorecard.map((entry) => (
                  <TableRow key={entry.bowler_id} className="border-border">
                    <TableCell className="font-medium text-foreground">{entry.bowler_name}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{entry.overs}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{entry.maidens}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{entry.runs_conceded}</TableCell>
                    <TableCell className="text-center font-bold text-foreground">
                      {entry.wickets}
                      {entry.wickets >= 5 && (
                        <Badge variant="default" className="ml-1 text-xs">5W</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{entry.economy.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DetailedScorecard;
