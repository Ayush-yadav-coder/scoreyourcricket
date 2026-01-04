import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

interface Partnership {
  batsman1_name: string;
  batsman2_name: string;
  runs: number;
  balls: number;
  batsman1_runs: number;
  batsman2_runs: number;
  batsman1_balls: number;
  batsman2_balls: number;
  wicket_number: number;
}

interface PartnershipAnalysisProps {
  partnerships: Partnership[];
}

const PartnershipAnalysis: React.FC<PartnershipAnalysisProps> = ({ partnerships }) => {
  if (partnerships.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Partnerships
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">No partnership data available yet</p>
        </CardContent>
      </Card>
    );
  }

  const maxRuns = Math.max(...partnerships.map(p => p.runs));

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Partnerships
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {partnerships.map((partnership, index) => {
            const totalPercent = maxRuns > 0 ? (partnership.runs / maxRuns) * 100 : 0;
            const batsman1Percent = partnership.runs > 0 ? (partnership.batsman1_runs / partnership.runs) * 100 : 50;
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {partnership.wicket_number === 0 ? 'Opening' : `${partnership.wicket_number}${getOrdinalSuffix(partnership.wicket_number)} Wicket`}
                  </span>
                  <span className="font-bold text-foreground">
                    {partnership.runs} ({partnership.balls})
                  </span>
                </div>
                
                {/* Partnership bar */}
                <div className="relative h-8 rounded-lg overflow-hidden bg-muted">
                  <div 
                    className="absolute h-full flex"
                    style={{ width: `${totalPercent}%` }}
                  >
                    <div 
                      className="h-full bg-primary flex items-center justify-end px-2 text-xs text-primary-foreground font-medium"
                      style={{ width: `${batsman1Percent}%` }}
                    >
                      {partnership.batsman1_runs > 10 && partnership.batsman1_runs}
                    </div>
                    <div 
                      className="h-full bg-primary/60 flex items-center px-2 text-xs text-primary-foreground font-medium"
                      style={{ width: `${100 - batsman1Percent}%` }}
                    >
                      {partnership.batsman2_runs > 10 && partnership.batsman2_runs}
                    </div>
                  </div>
                </div>
                
                {/* Batsmen names */}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {partnership.batsman1_name.split(' ')[0]} {partnership.batsman1_runs} ({partnership.batsman1_balls})
                  </span>
                  <span>
                    {partnership.batsman2_name.split(' ')[0]} {partnership.batsman2_runs} ({partnership.batsman2_balls})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {partnerships.reduce((sum, p) => sum + p.runs, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Total Runs</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {Math.max(...partnerships.map(p => p.runs))}
            </p>
            <p className="text-xs text-muted-foreground">Best Partnership</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {Math.round(partnerships.reduce((sum, p) => sum + p.runs, 0) / partnerships.length)}
            </p>
            <p className="text-xs text-muted-foreground">Avg Partnership</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export default PartnershipAnalysis;
