import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingDown, Zap, Award } from 'lucide-react';

interface Delivery {
  bowler_id: string;
  over_number: number;
  ball_number: number;
  runs: number;
  is_wicket: boolean;
  is_wide?: boolean;
  is_no_ball?: boolean;
}

interface BowlerProfile {
  id: string;
  name: string;
}

interface BowlingSpellsAnalyzerProps {
  deliveries: Delivery[];
  bowlers: BowlerProfile[];
}

interface Spell {
  bowlerId: string;
  bowlerName: string;
  startOver: number;
  endOver: number;
  overs: number;
  runs: number;
  wickets: number;
  dots: number;
  boundaries: number;
  maidens: number;
  economy: number;
  spellNumber: number;
}

const BowlingSpellsAnalyzer: React.FC<BowlingSpellsAnalyzerProps> = ({
  deliveries,
  bowlers,
}) => {
  const spells = useMemo(() => {
    const bowlerMap = new Map(bowlers.map(b => [b.id, b.name]));
    const allSpells: Spell[] = [];
    const bowlerSpells = new Map<string, { currentSpell: Delivery[]; lastOver: number; spellCount: number }>();

    // Sort deliveries by over and ball
    const sortedDeliveries = [...deliveries].sort((a, b) => {
      if (a.over_number !== b.over_number) return a.over_number - b.over_number;
      return a.ball_number - b.ball_number;
    });

    sortedDeliveries.forEach(delivery => {
      const bowlerId = delivery.bowler_id;
      let bowlerData = bowlerSpells.get(bowlerId);

      if (!bowlerData) {
        bowlerData = { currentSpell: [], lastOver: -1, spellCount: 0 };
        bowlerSpells.set(bowlerId, bowlerData);
      }

      // Check if this is a new spell (gap of more than 1 over)
      if (bowlerData.lastOver !== -1 && delivery.over_number - bowlerData.lastOver > 1) {
        // Save current spell
        if (bowlerData.currentSpell.length > 0) {
          const spell = calculateSpell(
            bowlerData.currentSpell, 
            bowlerId, 
            bowlerMap.get(bowlerId) || 'Unknown',
            bowlerData.spellCount + 1
          );
          if (spell.overs >= 1) {
            allSpells.push(spell);
          }
        }
        bowlerData.spellCount++;
        bowlerData.currentSpell = [];
      }

      bowlerData.currentSpell.push(delivery);
      bowlerData.lastOver = delivery.over_number;
    });

    // Add remaining spells
    bowlerSpells.forEach((data, bowlerId) => {
      if (data.currentSpell.length > 0) {
        const spell = calculateSpell(
          data.currentSpell, 
          bowlerId, 
          bowlerMap.get(bowlerId) || 'Unknown',
          data.spellCount + 1
        );
        if (spell.overs >= 1) {
          allSpells.push(spell);
        }
      }
    });

    return allSpells.sort((a, b) => b.wickets - a.wickets || a.economy - b.economy);
  }, [deliveries, bowlers]);

  const calculateSpell = (
    spellDeliveries: Delivery[], 
    bowlerId: string, 
    bowlerName: string,
    spellNumber: number
  ): Spell => {
    const startOver = Math.min(...spellDeliveries.map(d => d.over_number));
    const endOver = Math.max(...spellDeliveries.map(d => d.over_number));
    
    let runs = 0;
    let wickets = 0;
    let dots = 0;
    let boundaries = 0;
    let legalBalls = 0;
    let maidens = 0;

    // Group by over to calculate maidens
    const overMap = new Map<number, Delivery[]>();
    spellDeliveries.forEach(d => {
      if (!d.is_wide && !d.is_no_ball) legalBalls++;
      runs += d.runs;
      if (d.is_wicket) wickets++;
      if (d.runs === 0 && !d.is_wide && !d.is_no_ball) dots++;
      if (d.runs === 4 || d.runs === 6) boundaries++;
      
      if (!overMap.has(d.over_number)) {
        overMap.set(d.over_number, []);
      }
      overMap.get(d.over_number)!.push(d);
    });

    // Calculate maidens
    overMap.forEach((overDeliveries) => {
      const legalInOver = overDeliveries.filter(d => !d.is_wide && !d.is_no_ball);
      if (legalInOver.length >= 6) {
        const runsInOver = legalInOver.reduce((sum, d) => sum + d.runs, 0);
        if (runsInOver === 0) maidens++;
      }
    });

    const overs = Math.floor(legalBalls / 6) + (legalBalls % 6) / 10;
    const economy = overs > 0 ? runs / overs : 0;

    return {
      bowlerId,
      bowlerName,
      startOver: startOver + 1,
      endOver: endOver + 1,
      overs,
      runs,
      wickets,
      dots,
      boundaries,
      maidens,
      economy,
      spellNumber,
    };
  };

  const getBestSpell = () => {
    if (spells.length === 0) return null;
    return spells.reduce((best, spell) => {
      const bestScore = best.wickets * 100 - best.economy * 10;
      const spellScore = spell.wickets * 100 - spell.economy * 10;
      return spellScore > bestScore ? spell : best;
    });
  };

  const getMostEconomical = () => {
    if (spells.length === 0) return null;
    const qualified = spells.filter(s => s.overs >= 2);
    if (qualified.length === 0) return null;
    return qualified.reduce((best, spell) => 
      spell.economy < best.economy ? spell : best
    );
  };

  const bestSpell = getBestSpell();
  const economical = getMostEconomical();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Bowling Spells Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Best Spell Highlight */}
        {bestSpell && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold">Best Spell</span>
            </div>
            <p className="text-lg font-bold">{bestSpell.bowlerName}</p>
            <p className="text-2xl font-bold text-primary">
              {bestSpell.wickets}-{bestSpell.runs} ({bestSpell.overs} ov)
            </p>
            <p className="text-sm text-muted-foreground">
              Overs {bestSpell.startOver}-{bestSpell.endOver}
            </p>
          </div>
        )}

        {/* All Spells */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">All Spells</h4>
          {spells.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Spell data will appear as bowlers complete overs
            </p>
          ) : (
            <div className="space-y-2">
              {spells.map((spell, idx) => (
                <div 
                  key={`${spell.bowlerId}-${spell.spellNumber}`}
                  className="p-3 rounded-lg bg-muted/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{spell.bowlerName}</span>
                      <Badge variant="outline" className="text-xs">
                        Spell {spell.spellNumber}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {spell.wickets}-{spell.runs}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {spell.overs} ov
                      </p>
                    </div>
                  </div>
                  
                  {/* Spell Stats */}
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <p className="font-semibold">{spell.economy.toFixed(2)}</p>
                      <p className="text-muted-foreground">Econ</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{spell.dots}</p>
                      <p className="text-muted-foreground">Dots</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{spell.maidens}</p>
                      <p className="text-muted-foreground">Maidens</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{spell.boundaries}</p>
                      <p className="text-muted-foreground">Bndrys</p>
                    </div>
                  </div>

                  {/* Dot Ball Percentage */}
                  <div className="pt-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Dot Ball %</span>
                      <span className="font-medium">
                        {((spell.dots / (spell.overs * 6)) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress 
                      value={(spell.dots / (spell.overs * 6)) * 100} 
                      className="h-1.5" 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Most Economical */}
        {economical && economical !== bestSpell && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Most Economical</span>
            </div>
            <p className="font-semibold mt-1">
              {economical.bowlerName} - {economical.economy.toFixed(2)} RPO
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BowlingSpellsAnalyzer;
