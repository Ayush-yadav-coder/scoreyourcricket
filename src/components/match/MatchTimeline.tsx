import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Target, 
  Zap, 
  AlertTriangle, 
  Star,
  TrendingUp,
  Award
} from 'lucide-react';

interface TimelineEvent {
  over: number;
  ball: number;
  type: 'wicket' | 'boundary' | 'six' | 'milestone' | 'momentum' | 'review';
  description: string;
  player?: string;
  runs?: number;
}

interface MatchTimelineProps {
  events: TimelineEvent[];
  teamName?: string;
}

const MatchTimeline: React.FC<MatchTimelineProps> = ({ events, teamName }) => {
  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'wicket':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'boundary':
        return <Zap className="h-4 w-4 text-primary" />;
      case 'six':
        return <Star className="h-4 w-4 text-accent" />;
      case 'milestone':
        return <Award className="h-4 w-4 text-yellow-500" />;
      case 'momentum':
        return <TrendingUp className="h-4 w-4 text-primary" />;
      default:
        return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'wicket':
        return 'border-l-destructive bg-destructive/5';
      case 'boundary':
        return 'border-l-primary bg-primary/5';
      case 'six':
        return 'border-l-accent bg-accent/5';
      case 'milestone':
        return 'border-l-yellow-500 bg-yellow-500/5';
      case 'momentum':
        return 'border-l-primary bg-primary/5';
      default:
        return 'border-l-muted-foreground bg-muted/5';
    }
  };

  if (events.length === 0) {
    return (
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Match Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">No key events yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Match Timeline
          {teamName && <Badge variant="outline" className="ml-2">{teamName}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {events.map((event, idx) => (
              <div
                key={idx}
                className={`border-l-4 pl-4 py-2 rounded-r-lg ${getEventColor(event.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    {getEventIcon(event.type)}
                    <div>
                      <p className="font-medium text-sm">{event.description}</p>
                      {event.player && (
                        <p className="text-xs text-muted-foreground">{event.player}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {event.over}.{event.ball}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default MatchTimeline;
