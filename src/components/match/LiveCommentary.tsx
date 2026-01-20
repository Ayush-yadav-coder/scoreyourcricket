import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  MessageCircle, Volume2, VolumeX, Flame, Target, 
  Zap, Circle, AlertCircle, ChevronDown
} from 'lucide-react';

interface CommentaryEntry {
  id: string;
  over: number;
  ball: number;
  text: string;
  type: 'normal' | 'wicket' | 'boundary' | 'six' | 'milestone' | 'end_over';
  timestamp: Date;
}

interface LiveCommentaryProps {
  deliveries: {
    over_number: number;
    ball_number: number;
    runs: number | null;
    is_wicket: boolean | null;
    is_six: boolean | null;
    is_boundary: boolean | null;
    is_wide: boolean | null;
    is_no_ball: boolean | null;
    is_bye: boolean | null;
    is_leg_bye: boolean | null;
    dismissal_type: string | null;
    created_at: string;
  }[];
  playerNames: Record<string, string>;
  batsmanId: string;
  bowlerId: string;
  currentScore: { runs: number; wickets: number; overs: number };
}

const LiveCommentary: React.FC<LiveCommentaryProps> = ({
  deliveries,
  playerNames,
  batsmanId,
  bowlerId,
  currentScore,
}) => {
  const [commentary, setCommentary] = useState<CommentaryEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    generateCommentary();
  }, [deliveries]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [commentary, autoScroll]);

  const generateCommentary = () => {
    const newCommentary: CommentaryEntry[] = [];
    let cumulativeRuns = 0;
    let currentOver = 0;
    let overRuns = 0;

    deliveries.forEach((delivery, index) => {
      const batsmanName = playerNames[delivery.over_number === deliveries[index]?.over_number ? batsmanId : ''] || 'Batsman';
      const bowlerName = playerNames[bowlerId] || 'Bowler';
      const runs = delivery.runs || 0;
      cumulativeRuns += runs;

      // Check for new over
      if (delivery.over_number !== currentOver && currentOver > 0) {
        newCommentary.push({
          id: `end-over-${currentOver}`,
          over: currentOver,
          ball: 6,
          text: `End of over ${currentOver}. ${overRuns} runs from the over.`,
          type: 'end_over',
          timestamp: new Date(delivery.created_at),
        });
        overRuns = 0;
      }
      currentOver = delivery.over_number;
      overRuns += runs;

      let text = '';
      let type: CommentaryEntry['type'] = 'normal';

      if (delivery.is_wicket) {
        type = 'wicket';
        const dismissal = delivery.dismissal_type?.replace('_', ' ') || 'out';
        text = `WICKET! ${batsmanName} is ${dismissal}! ${bowlerName} strikes. ${currentScore.runs}/${currentScore.wickets + 1}`;
      } else if (delivery.is_six) {
        type = 'six';
        const sixComments = [
          `MASSIVE SIX! ${batsmanName} sends it into the stands!`,
          `That's HUGE! ${batsmanName} clears the boundary with ease!`,
          `SIX! What a shot from ${batsmanName}! The crowd goes wild!`,
          `Into the stands! ${batsmanName} shows his power!`,
        ];
        text = sixComments[Math.floor(Math.random() * sixComments.length)];
      } else if (delivery.is_boundary) {
        type = 'boundary';
        const fourComments = [
          `FOUR! Beautifully placed by ${batsmanName}!`,
          `That races to the boundary! ${batsmanName} finds the gap.`,
          `FOUR runs! Excellent shot from ${batsmanName}.`,
          `Boundary! ${batsmanName} times it perfectly.`,
        ];
        text = fourComments[Math.floor(Math.random() * fourComments.length)];
      } else if (delivery.is_wide) {
        text = `Wide ball from ${bowlerName}. Extra run to the total.`;
      } else if (delivery.is_no_ball) {
        text = `No ball! Free hit coming up. ${runs > 0 ? `${runs} run${runs > 1 ? 's' : ''} taken.` : ''}`;
      } else if (delivery.is_bye) {
        text = `${runs} bye${runs > 1 ? 's' : ''} taken. The keeper couldn't collect cleanly.`;
      } else if (delivery.is_leg_bye) {
        text = `${runs} leg bye${runs > 1 ? 's' : ''} taken off the pads.`;
      } else if (runs === 0) {
        const dotComments = [
          `Dot ball. Good delivery from ${bowlerName}.`,
          `No run. Tight bowling from ${bowlerName}.`,
          `Defended back to the bowler.`,
          `${batsmanName} blocks it out.`,
        ];
        text = dotComments[Math.floor(Math.random() * dotComments.length)];
      } else if (runs === 1) {
        text = `Single taken. ${batsmanName} rotates the strike.`;
      } else if (runs === 2) {
        text = `Good running! ${runs} runs taken by ${batsmanName}.`;
      } else if (runs === 3) {
        text = `Three runs! Quick running between the wickets.`;
      } else {
        text = `${runs} runs scored.`;
      }

      newCommentary.push({
        id: `${delivery.over_number}-${delivery.ball_number}-${index}`,
        over: delivery.over_number,
        ball: delivery.ball_number,
        text,
        type,
        timestamp: new Date(delivery.created_at),
      });
    });

    // Reverse to show latest first
    setCommentary(newCommentary.reverse());
  };

  const getEntryIcon = (type: CommentaryEntry['type']) => {
    switch (type) {
      case 'wicket': return <Target className="h-4 w-4 text-red-500" />;
      case 'six': return <Flame className="h-4 w-4 text-orange-500" />;
      case 'boundary': return <Zap className="h-4 w-4 text-green-500" />;
      case 'end_over': return <Circle className="h-4 w-4 text-blue-500" />;
      case 'milestone': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEntryStyle = (type: CommentaryEntry['type']) => {
    switch (type) {
      case 'wicket': return 'border-l-4 border-red-500 bg-red-500/10';
      case 'six': return 'border-l-4 border-orange-500 bg-orange-500/10';
      case 'boundary': return 'border-l-4 border-green-500 bg-green-500/10';
      case 'end_over': return 'border-l-4 border-blue-500 bg-blue-500/10';
      default: return 'border-l-2 border-muted';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Live Commentary
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-scroll"
                checked={autoScroll}
                onCheckedChange={setAutoScroll}
              />
              <Label htmlFor="auto-scroll" className="text-xs">Auto-scroll</Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96" ref={scrollRef}>
          <div className="space-y-2 pr-4">
            {commentary.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Commentary will appear here as the match progresses...
              </p>
            ) : (
              commentary.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-3 rounded-r-lg ${getEntryStyle(entry.type)}`}
                >
                  <div className="flex items-start gap-2">
                    {getEntryIcon(entry.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {entry.over}.{entry.ball}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {entry.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm">{entry.text}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        {!autoScroll && commentary.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTop = 0;
              }
            }}
          >
            <ChevronDown className="h-4 w-4 mr-1" />
            Jump to latest
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveCommentary;
