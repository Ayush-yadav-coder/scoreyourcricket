import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Zap, Target, Trophy, Share2, Download, Play, 
  ChevronLeft, ChevronRight, Star, Flame, Award
} from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

interface Highlight {
  id: string;
  type: 'six' | 'wicket' | 'milestone' | 'boundary' | 'hattrick' | 'maiden';
  title: string;
  description: string;
  over: number;
  ball: number;
  player: string;
  runs?: number;
  timestamp: string;
  importance: 'high' | 'medium' | 'critical';
}

interface MatchHighlightsReelProps {
  matchId: string;
  team1Name: string;
  team2Name: string;
  deliveries: {
    over_number: number;
    ball_number: number;
    runs: number | null;
    is_wicket: boolean | null;
    is_six: boolean | null;
    is_boundary: boolean | null;
    dismissal_type: string | null;
    batsman_id: string;
    bowler_id: string;
    created_at: string;
  }[];
  battingScores: {
    batsman_id: string;
    runs: number | null;
    balls_faced: number | null;
  }[];
  playerNames: Record<string, string>;
}

const MatchHighlightsReel: React.FC<MatchHighlightsReelProps> = ({
  matchId,
  team1Name,
  team2Name,
  deliveries,
  battingScores,
  playerNames,
}) => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    compileHighlights();
  }, [deliveries, battingScores]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && highlights.length > 0) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % highlights.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, highlights.length]);

  const compileHighlights = () => {
    const newHighlights: Highlight[] = [];
    const batsmanRuns: Record<string, { runs: number; balls: number; milestones: Set<number> }> = {};
    const bowlerWickets: Record<string, { wickets: number; consecutive: number[] }> = {};
    let currentMaiden = { bowlerId: '', runs: 0, balls: 0 };

    deliveries.forEach((delivery, index) => {
      const batsmanName = playerNames[delivery.batsman_id] || 'Batsman';
      const bowlerName = playerNames[delivery.bowler_id] || 'Bowler';

      // Track batsman runs
      if (!batsmanRuns[delivery.batsman_id]) {
        batsmanRuns[delivery.batsman_id] = { runs: 0, balls: 0, milestones: new Set() };
      }
      batsmanRuns[delivery.batsman_id].runs += delivery.runs || 0;
      batsmanRuns[delivery.batsman_id].balls += 1;

      // Check for milestones (50, 100, 150, 200)
      const currentRuns = batsmanRuns[delivery.batsman_id].runs;
      const milestones = [50, 100, 150, 200];
      milestones.forEach((milestone) => {
        if (currentRuns >= milestone && !batsmanRuns[delivery.batsman_id].milestones.has(milestone)) {
          batsmanRuns[delivery.batsman_id].milestones.add(milestone);
          newHighlights.push({
            id: `milestone-${delivery.batsman_id}-${milestone}`,
            type: 'milestone',
            title: milestone >= 100 ? `${milestone >= 150 ? '🔥 ' : ''}Century!` : 'Half Century!',
            description: `${batsmanName} reaches ${milestone} runs`,
            over: delivery.over_number,
            ball: delivery.ball_number,
            player: batsmanName,
            runs: milestone,
            timestamp: delivery.created_at,
            importance: milestone >= 100 ? 'critical' : 'high',
          });
        }
      });

      // Sixes
      if (delivery.is_six) {
        newHighlights.push({
          id: `six-${index}`,
          type: 'six',
          title: '💥 Maximum!',
          description: `${batsmanName} hits a massive six off ${bowlerName}`,
          over: delivery.over_number,
          ball: delivery.ball_number,
          player: batsmanName,
          runs: 6,
          timestamp: delivery.created_at,
          importance: 'high',
        });
      }

      // Boundaries (fours)
      if (delivery.is_boundary && !delivery.is_six) {
        newHighlights.push({
          id: `four-${index}`,
          type: 'boundary',
          title: '4️⃣ Boundary!',
          description: `${batsmanName} finds the gap for four`,
          over: delivery.over_number,
          ball: delivery.ball_number,
          player: batsmanName,
          runs: 4,
          timestamp: delivery.created_at,
          importance: 'medium',
        });
      }

      // Wickets
      if (delivery.is_wicket) {
        if (!bowlerWickets[delivery.bowler_id]) {
          bowlerWickets[delivery.bowler_id] = { wickets: 0, consecutive: [] };
        }
        bowlerWickets[delivery.bowler_id].wickets += 1;
        bowlerWickets[delivery.bowler_id].consecutive.push(index);

        const dismissalText = delivery.dismissal_type 
          ? delivery.dismissal_type.replace('_', ' ') 
          : 'dismissed';

        newHighlights.push({
          id: `wicket-${index}`,
          type: 'wicket',
          title: `🎯 Wicket!`,
          description: `${batsmanName} ${dismissalText} by ${bowlerName}`,
          over: delivery.over_number,
          ball: delivery.ball_number,
          player: bowlerName,
          timestamp: delivery.created_at,
          importance: 'high',
        });

        // Check for hat-trick (3 wickets in 3 consecutive balls)
        const consecutive = bowlerWickets[delivery.bowler_id].consecutive;
        if (consecutive.length >= 3) {
          const last3 = consecutive.slice(-3);
          if (last3[2] - last3[0] === 2) {
            newHighlights.push({
              id: `hattrick-${index}`,
              type: 'hattrick',
              title: '🎩 HAT-TRICK!',
              description: `${bowlerName} takes a sensational hat-trick!`,
              over: delivery.over_number,
              ball: delivery.ball_number,
              player: bowlerName,
              timestamp: delivery.created_at,
              importance: 'critical',
            });
          }
        }
      }

      // Maiden over tracking
      if (currentMaiden.bowlerId !== delivery.bowler_id || delivery.ball_number === 1) {
        if (currentMaiden.balls === 6 && currentMaiden.runs === 0 && currentMaiden.bowlerId) {
          const maidenBowler = playerNames[currentMaiden.bowlerId] || 'Bowler';
          newHighlights.push({
            id: `maiden-${delivery.over_number - 1}`,
            type: 'maiden',
            title: '⭕ Maiden Over!',
            description: `${maidenBowler} bowls a maiden over`,
            over: delivery.over_number - 1,
            ball: 6,
            player: maidenBowler,
            timestamp: delivery.created_at,
            importance: 'medium',
          });
        }
        currentMaiden = { bowlerId: delivery.bowler_id, runs: 0, balls: 0 };
      }
      currentMaiden.runs += delivery.runs || 0;
      currentMaiden.balls += 1;
    });

    // Sort by importance and timestamp
    const importanceOrder = { critical: 3, high: 2, medium: 1 };
    newHighlights.sort((a, b) => {
      if (importanceOrder[a.importance] !== importanceOrder[b.importance]) {
        return importanceOrder[b.importance] - importanceOrder[a.importance];
      }
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    setHighlights(newHighlights);
  };

  const getHighlightIcon = (type: Highlight['type']) => {
    switch (type) {
      case 'six': return <Flame className="h-6 w-6 text-orange-500" />;
      case 'wicket': return <Target className="h-6 w-6 text-red-500" />;
      case 'milestone': return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 'boundary': return <Zap className="h-6 w-6 text-green-500" />;
      case 'hattrick': return <Award className="h-6 w-6 text-purple-500" />;
      case 'maiden': return <Star className="h-6 w-6 text-blue-500" />;
      default: return <Star className="h-6 w-6" />;
    }
  };

  const getHighlightColor = (type: Highlight['type']) => {
    switch (type) {
      case 'six': return 'bg-orange-500/20 border-orange-500/50';
      case 'wicket': return 'bg-red-500/20 border-red-500/50';
      case 'milestone': return 'bg-yellow-500/20 border-yellow-500/50';
      case 'boundary': return 'bg-green-500/20 border-green-500/50';
      case 'hattrick': return 'bg-purple-500/20 border-purple-500/50';
      case 'maiden': return 'bg-blue-500/20 border-blue-500/50';
      default: return 'bg-muted';
    }
  };

  const shareHighlights = async () => {
    const reelElement = document.getElementById('highlights-reel');
    if (reelElement) {
      try {
        const canvas = await html2canvas(reelElement);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `match-highlights-${matchId}.png`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Highlights image downloaded!');
          }
        });
      } catch (error) {
        toast.error('Failed to generate highlights image');
      }
    }
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/match/${matchId}/analytics`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  if (highlights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Match Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No highlights yet. Key moments will appear here as the match progresses.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentHighlight = highlights[currentIndex];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Match Highlights
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsPlaying(!isPlaying)}>
              <Play className={`h-4 w-4 ${isPlaying ? 'text-primary' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={shareHighlights}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={copyShareLink}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Main Highlight Display */}
        <div
          id="highlights-reel"
          className={`relative rounded-lg border-2 p-6 mb-4 transition-all duration-300 ${getHighlightColor(currentHighlight.type)}`}
        >
          <div className="absolute top-2 right-2">
            <Badge variant={currentHighlight.importance === 'critical' ? 'destructive' : 'secondary'}>
              Over {currentHighlight.over}.{currentHighlight.ball}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-background">
              {getHighlightIcon(currentHighlight.type)}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{currentHighlight.title}</h3>
              <p className="text-muted-foreground">{currentHighlight.description}</p>
              <p className="text-sm font-medium mt-1">{currentHighlight.player}</p>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentIndex((prev) => (prev - 1 + highlights.length) % highlights.length)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {highlights.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentIndex((prev) => (prev + 1) % highlights.length)}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Highlights Summary */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 rounded bg-orange-500/10">
            <Flame className="h-4 w-4 mx-auto text-orange-500" />
            <p className="text-lg font-bold">{highlights.filter(h => h.type === 'six').length}</p>
            <p className="text-xs text-muted-foreground">Sixes</p>
          </div>
          <div className="text-center p-2 rounded bg-red-500/10">
            <Target className="h-4 w-4 mx-auto text-red-500" />
            <p className="text-lg font-bold">{highlights.filter(h => h.type === 'wicket').length}</p>
            <p className="text-xs text-muted-foreground">Wickets</p>
          </div>
          <div className="text-center p-2 rounded bg-yellow-500/10">
            <Trophy className="h-4 w-4 mx-auto text-yellow-500" />
            <p className="text-lg font-bold">{highlights.filter(h => h.type === 'milestone').length}</p>
            <p className="text-xs text-muted-foreground">Milestones</p>
          </div>
        </div>

        {/* Timeline */}
        <ScrollArea className="h-48">
          <div className="space-y-2">
            {highlights.map((highlight, index) => (
              <div
                key={highlight.id}
                className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                  index === currentIndex ? 'bg-primary/10' : 'hover:bg-muted'
                }`}
                onClick={() => setCurrentIndex(index)}
              >
                {getHighlightIcon(highlight.type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{highlight.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{highlight.description}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {highlight.over}.{highlight.ball}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default MatchHighlightsReel;
