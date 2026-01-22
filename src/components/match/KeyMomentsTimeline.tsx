import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Copy, Target, Zap, AlertTriangle, Star, TrendingUp, Award } from 'lucide-react';
import {
  shouldNotifyPowerplayEnd,
  shouldNotifyPressure,
  updateDotStreak,
  type SmartDelivery,
} from '@/lib/smartMatchAlerts';

type KeyMomentType = 'wicket' | 'boundary' | 'six' | 'milestone' | 'powerplay_end' | 'pressure';

export interface KeyMoment {
  key: string;
  over: number;
  ball: number;
  type: KeyMomentType;
  description: string;
}

interface KeyMomentsTimelineProps {
  matchId: string;
  deliveries: SmartDelivery[];
  teamName?: string;
  powerplayOvers?: number;
}

const KeyMomentsTimeline: React.FC<KeyMomentsTimelineProps> = ({
  matchId,
  deliveries,
  teamName,
  powerplayOvers = 6,
}) => {
  const moments = useMemo<KeyMoment[]>(() => {
    if (!deliveries?.length) return [];

    // Work in chronological order so milestones/pressure are computed correctly.
    const sorted = [...deliveries].sort((a, b) => {
      const ao = (a.over_number ?? 0) - (b.over_number ?? 0);
      if (ao !== 0) return ao;
      const ab = (a.ball_number ?? 0) - (b.ball_number ?? 0);
      if (ab !== 0) return ab;
      return new Date((a as any).created_at ?? 0).getTime() - new Date((b as any).created_at ?? 0).getTime();
    });

    const out: KeyMoment[] = [];
    const powerplayNotified = new Set<string>();
    const dotStreak = new Map<string, number>();
    let runningRuns = 0;
    let lastMilestone = 0;

    for (const d of sorted) {
      const over = d.over_number ?? 0;
      const ball = d.ball_number ?? 0;
      const deliveryKeyBase = `${over}.${ball}-${(d as any).created_at ?? ''}`;

      // Basic event moments
      if (d.is_wicket) {
        out.push({
          key: `wicket-${deliveryKeyBase}`,
          over,
          ball,
          type: 'wicket',
          description: `WICKET! ${d.dismissal_type || 'Out'}`,
        });
      } else if (d.is_six) {
        out.push({
          key: `six-${deliveryKeyBase}`,
          over,
          ball,
          type: 'six',
          description: 'SIX! Maximum!',
        });
      } else if (d.is_boundary) {
        out.push({
          key: `four-${deliveryKeyBase}`,
          over,
          ball,
          type: 'boundary',
          description: 'FOUR! Finds the boundary!',
        });
      }

      // Milestones (simple team total milestones inferred from deliveries)
      runningRuns += Number(d.runs || 0);
      const milestone = Math.floor(runningRuns / 50) * 50;
      if (milestone >= 50 && milestone > lastMilestone) {
        lastMilestone = milestone;
        out.push({
          key: `milestone-${milestone}-${deliveryKeyBase}`,
          over,
          ball,
          type: 'milestone',
          description: `Team reaches ${milestone} runs`,
        });
      }

      // Smart moments
      if (shouldNotifyPowerplayEnd(d, powerplayOvers, powerplayNotified)) {
        out.push({
          key: `powerplay-${powerplayOvers}-${deliveryKeyBase}`,
          over,
          ball,
          type: 'powerplay_end',
          description: `Powerplay completed (end of ${powerplayOvers} overs)`,
        });
      }

      const streak = updateDotStreak(dotStreak, d);
      if (shouldNotifyPressure(streak)) {
        out.push({
          key: `pressure-${streak}-${deliveryKeyBase}`,
          over,
          ball,
          type: 'pressure',
          description: `Pressure building: ${streak} dot balls in a row`,
        });
      }
    }

    // Show latest first (timeline UX)
    return out.sort((a, b) => (b.over - a.over) || (b.ball - a.ball));
  }, [deliveries, powerplayOvers]);

  const copyShareLink = async (momentKey: string) => {
    const url = `${window.location.origin}/match/${matchId}?tab=analytics&moment=${encodeURIComponent(momentKey)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied', { description: 'Share this key moment link.' });
    } catch {
      toast.error('Copy failed', { description: url });
    }
  };

  const getIcon = (type: KeyMomentType) => {
    switch (type) {
      case 'wicket':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'boundary':
        return <Zap className="h-4 w-4 text-primary" />;
      case 'six':
        return <Star className="h-4 w-4 text-accent" />;
      case 'milestone':
        return <Award className="h-4 w-4 text-muted-foreground" />;
      case 'powerplay_end':
        return <Zap className="h-4 w-4 text-primary" />;
      case 'pressure':
        return <TrendingUp className="h-4 w-4 text-primary" />;
      default:
        return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRowClass = (type: KeyMomentType) => {
    switch (type) {
      case 'wicket':
        return 'border-l-destructive bg-destructive/5';
      case 'boundary':
        return 'border-l-primary bg-primary/5';
      case 'six':
        return 'border-l-accent bg-accent/5';
      case 'milestone':
        return 'border-l-muted-foreground bg-muted/20';
      case 'powerplay_end':
        return 'border-l-primary bg-primary/5';
      case 'pressure':
        return 'border-l-primary bg-primary/5';
      default:
        return 'border-l-muted-foreground bg-muted/20';
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Key Moments
          {teamName ? <Badge variant="outline" className="ml-2">{teamName}</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {moments.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">No key moments yet</p>
        ) : (
          <ScrollArea className="h-[320px] pr-4">
            <div className="space-y-3">
              {moments.map((m) => (
                <div
                  key={m.key}
                  className={`border-l-4 pl-4 py-2 rounded-r-lg ${getRowClass(m.type)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      {getIcon(m.type)}
                      <div>
                        <p className="font-medium text-sm">{m.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {m.over}.{m.ball}
                      </Badge>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyShareLink(m.key)}
                        aria-label="Copy share link"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default KeyMomentsTimeline;
