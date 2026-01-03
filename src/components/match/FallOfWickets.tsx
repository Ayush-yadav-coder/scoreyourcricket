import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface WicketData {
  wicket_number: number;
  batsman_name: string;
  runs: number;
  score_at_wicket: number;
  overs_at_wicket: number;
  dismissal_type: string;
  bowler_name?: string;
}

interface FallOfWicketsProps {
  wickets: WicketData[];
}

const FallOfWickets: React.FC<FallOfWicketsProps> = ({ wickets }) => {
  if (wickets.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Fall of Wickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">No wickets have fallen yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          Fall of Wickets
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {wickets.map((wicket, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center text-sm font-bold text-destructive">
                  {wicket.wicket_number}
                </div>
                <div>
                  <p className="font-medium text-foreground">{wicket.batsman_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {wicket.dismissal_type}
                    {wicket.bowler_name && ` b ${wicket.bowler_name}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-foreground">{wicket.score_at_wicket}-{wicket.wicket_number}</p>
                <p className="text-xs text-muted-foreground">
                  ({wicket.overs_at_wicket.toFixed(1)} ov) • {wicket.runs} runs
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            {wickets.map((w, i) => (
              <span key={i}>
                {w.score_at_wicket}-{w.wicket_number}
                {i < wickets.length - 1 && ', '}
              </span>
            ))}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FallOfWickets;
