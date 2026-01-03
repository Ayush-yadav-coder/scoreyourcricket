import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Delivery {
  id: string;
  ball_number: number;
  runs: number;
  is_wide: boolean;
  is_no_ball: boolean;
  is_bye: boolean;
  is_leg_bye: boolean;
  is_wicket: boolean;
  is_boundary: boolean;
  is_six: boolean;
}

interface BallTimelineProps {
  currentOver: number;
  deliveries: Delivery[];
  ballsInOver: number;
}

const BallTimeline: React.FC<BallTimelineProps> = ({
  currentOver,
  deliveries,
  ballsInOver,
}) => {
  const getBallDisplay = (delivery: Delivery) => {
    if (delivery.is_wicket) {
      return { text: 'W', className: 'bg-destructive text-destructive-foreground' };
    }
    if (delivery.is_wide) {
      return { text: `${delivery.runs}Wd`, className: 'bg-yellow-500 text-yellow-950' };
    }
    if (delivery.is_no_ball) {
      return { text: `${delivery.runs}Nb`, className: 'bg-orange-500 text-orange-950' };
    }
    if (delivery.is_bye) {
      return { text: `${delivery.runs}B`, className: 'bg-blue-400 text-blue-950' };
    }
    if (delivery.is_leg_bye) {
      return { text: `${delivery.runs}Lb`, className: 'bg-blue-300 text-blue-950' };
    }
    if (delivery.is_six) {
      return { text: '6', className: 'bg-purple-600 text-white' };
    }
    if (delivery.is_boundary) {
      return { text: '4', className: 'bg-blue-600 text-white' };
    }
    if (delivery.runs === 0) {
      return { text: '•', className: 'bg-muted text-muted-foreground' };
    }
    return { text: `${delivery.runs}`, className: 'bg-secondary text-secondary-foreground' };
  };

  const getOverTotal = () => {
    return deliveries.reduce((sum, d) => sum + (d.runs || 0), 0);
  };

  // Create array of 6 balls, filled with deliveries or empty
  const balls = Array.from({ length: 6 }, (_, i) => {
    const delivery = deliveries.find(d => d.ball_number === i + 1);
    return delivery;
  });

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Over {currentOver + 1}
          </CardTitle>
          <span className="text-sm font-bold">
            {getOverTotal()} runs
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2">
          {balls.map((delivery, index) => (
            <div
              key={index}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                delivery
                  ? getBallDisplay(delivery).className
                  : index < ballsInOver
                    ? 'bg-muted text-muted-foreground'
                    : 'border-2 border-dashed border-muted-foreground/30'
              }`}
            >
              {delivery ? getBallDisplay(delivery).text : index < ballsInOver ? '•' : ''}
            </div>
          ))}
        </div>
        
        {/* Ball commentary */}
        {deliveries.length > 0 && (
          <div className="mt-3 space-y-1">
            {deliveries.slice(-3).map((delivery, index) => (
              <div key={delivery.id || index} className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="font-mono font-bold text-foreground">
                  {currentOver}.{delivery.ball_number}
                </span>
                <span>
                  {getDeliveryCommentary(delivery)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const getDeliveryCommentary = (delivery: Delivery): string => {
  const parts: string[] = [];
  
  if (delivery.is_wicket) {
    parts.push('WICKET!');
  } else if (delivery.is_six) {
    parts.push('SIX! Maximum!');
  } else if (delivery.is_boundary) {
    parts.push('FOUR! Boundary.');
  } else if (delivery.is_wide) {
    parts.push(`Wide ball, ${delivery.runs} runs.`);
  } else if (delivery.is_no_ball) {
    parts.push(`No ball, ${delivery.runs} runs.`);
  } else if (delivery.is_bye) {
    parts.push(`${delivery.runs} bye${delivery.runs !== 1 ? 's' : ''}.`);
  } else if (delivery.is_leg_bye) {
    parts.push(`${delivery.runs} leg bye${delivery.runs !== 1 ? 's' : ''}.`);
  } else if (delivery.runs === 0) {
    parts.push('Dot ball.');
  } else {
    parts.push(`${delivery.runs} run${delivery.runs !== 1 ? 's' : ''}.`);
  }
  
  return parts.join(' ');
};

export default BallTimeline;
