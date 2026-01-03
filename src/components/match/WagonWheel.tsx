import React from 'react';

interface ShotData {
  x: number;
  y: number;
  runs: number;
  is_boundary: boolean;
  is_six: boolean;
}

interface WagonWheelProps {
  shots: ShotData[];
  batsmanName?: string;
}

const WagonWheel: React.FC<WagonWheelProps> = ({ shots, batsmanName }) => {
  const getRunColor = (runs: number, isBoundary: boolean, isSix: boolean) => {
    if (isSix) return 'hsl(var(--primary))';
    if (isBoundary) return 'hsl(142 76% 36%)';
    if (runs === 3) return 'hsl(45 93% 47%)';
    if (runs === 2) return 'hsl(199 89% 48%)';
    if (runs === 1) return 'hsl(var(--muted-foreground))';
    return 'hsl(var(--muted-foreground) / 0.5)';
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {batsmanName && (
        <p className="text-center text-sm text-muted-foreground mb-2">{batsmanName}</p>
      )}
      <div className="aspect-square">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Outer boundary */}
          <circle cx="50" cy="50" r="48" fill="hsl(140 45% 35%)" stroke="hsl(var(--border))" strokeWidth="0.5" />
          
          {/* Inner circle (30 yard) */}
          <circle cx="50" cy="50" r="25" fill="none" stroke="hsl(var(--border) / 0.4)" strokeWidth="0.3" strokeDasharray="2,2" />
          
          {/* Pitch */}
          <rect x="47" y="35" width="6" height="30" fill="hsl(35 40% 70%)" rx="0.5" />
          
          {/* Creases */}
          <line x1="45" y1="40" x2="55" y2="40" stroke="hsl(var(--background))" strokeWidth="0.3" />
          <line x1="45" y1="60" x2="55" y2="60" stroke="hsl(var(--background))" strokeWidth="0.3" />
          
          {/* Stumps */}
          <rect x="49" y="58" width="2" height="3" fill="hsl(35 30% 50%)" />
          
          {/* Region labels */}
          <text x="50" y="8" textAnchor="middle" fill="hsl(var(--background))" fontSize="2.5" opacity="0.7">Straight</text>
          <text x="85" y="30" textAnchor="middle" fill="hsl(var(--background))" fontSize="2.5" opacity="0.7">Cover</text>
          <text x="92" y="52" textAnchor="middle" fill="hsl(var(--background))" fontSize="2.5" opacity="0.7">Point</text>
          <text x="85" y="75" textAnchor="middle" fill="hsl(var(--background))" fontSize="2.5" opacity="0.7">Third Man</text>
          <text x="50" y="95" textAnchor="middle" fill="hsl(var(--background))" fontSize="2.5" opacity="0.7">Fine Leg</text>
          <text x="15" y="75" textAnchor="middle" fill="hsl(var(--background))" fontSize="2.5" opacity="0.7">Square Leg</text>
          <text x="8" y="52" textAnchor="middle" fill="hsl(var(--background))" fontSize="2.5" opacity="0.7">Mid-Wicket</text>
          <text x="15" y="30" textAnchor="middle" fill="hsl(var(--background))" fontSize="2.5" opacity="0.7">Mid-On</text>
          
          {/* Shot lines from batsman position to shot location */}
          {shots.map((shot, index) => (
            <g key={index}>
              {/* Line from batsman to shot */}
              <line
                x1="50"
                y1="60"
                x2={shot.x}
                y2={shot.y}
                stroke={getRunColor(shot.runs, shot.is_boundary, shot.is_six)}
                strokeWidth={shot.is_six ? 1.2 : shot.is_boundary ? 1 : 0.6}
                opacity={0.8}
              />
              {/* Shot marker */}
              <circle
                cx={shot.x}
                cy={shot.y}
                r={shot.is_six ? 2.5 : shot.is_boundary ? 2 : 1.5}
                fill={getRunColor(shot.runs, shot.is_boundary, shot.is_six)}
                stroke="hsl(var(--background))"
                strokeWidth="0.3"
              />
            </g>
          ))}
        </svg>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-muted-foreground">Six</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(142 76% 36%)' }} />
          <span className="text-muted-foreground">Four</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(45 93% 47%)' }} />
          <span className="text-muted-foreground">Three</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(199 89% 48%)' }} />
          <span className="text-muted-foreground">Two</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-muted-foreground" />
          <span className="text-muted-foreground">Single</span>
        </div>
      </div>
    </div>
  );
};

export default WagonWheel;
