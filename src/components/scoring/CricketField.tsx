import React from 'react';

interface CricketFieldProps {
  onShotSelect: (x: number, y: number, region: string) => void;
  selectedShot?: { x: number; y: number } | null;
}

const CricketField: React.FC<CricketFieldProps> = ({ onShotSelect, selectedShot }) => {
  const handleClick = (e: React.MouseEvent<SVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Determine region based on position
    const centerX = 50;
    const centerY = 50;
    const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
    
    let region = 'straight';
    if (angle >= -22.5 && angle < 22.5) region = 'cover';
    else if (angle >= 22.5 && angle < 67.5) region = 'point';
    else if (angle >= 67.5 && angle < 112.5) region = 'third-man';
    else if (angle >= 112.5 && angle < 157.5) region = 'fine-leg';
    else if (angle >= 157.5 || angle < -157.5) region = 'square-leg';
    else if (angle >= -157.5 && angle < -112.5) region = 'mid-wicket';
    else if (angle >= -112.5 && angle < -67.5) region = 'mid-on';
    else if (angle >= -67.5 && angle < -22.5) region = 'mid-off';
    
    onShotSelect(x, y, region);
  };

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full cursor-crosshair"
        onClick={handleClick}
      >
        {/* Outer boundary */}
        <circle cx="50" cy="50" r="48" fill="hsl(140 45% 35%)" stroke="hsl(0 0% 100%)" strokeWidth="0.5" />
        
        {/* Inner circle (30 yard) */}
        <circle cx="50" cy="50" r="25" fill="none" stroke="hsl(0 0% 100% / 0.3)" strokeWidth="0.3" strokeDasharray="2,2" />
        
        {/* Pitch */}
        <rect x="47" y="35" width="6" height="30" fill="hsl(35 40% 70%)" rx="0.5" />
        
        {/* Creases */}
        <line x1="45" y1="40" x2="55" y2="40" stroke="hsl(0 0% 100%)" strokeWidth="0.3" />
        <line x1="45" y1="60" x2="55" y2="60" stroke="hsl(0 0% 100%)" strokeWidth="0.3" />
        
        {/* Stumps */}
        <rect x="49" y="38" width="2" height="3" fill="hsl(35 30% 50%)" />
        <rect x="49" y="59" width="2" height="3" fill="hsl(35 30% 50%)" />
        
        {/* Region labels */}
        <text x="50" y="8" textAnchor="middle" fill="white" fontSize="3" opacity="0.7">Straight</text>
        <text x="85" y="30" textAnchor="middle" fill="white" fontSize="3" opacity="0.7">Cover</text>
        <text x="92" y="52" textAnchor="middle" fill="white" fontSize="3" opacity="0.7">Point</text>
        <text x="85" y="75" textAnchor="middle" fill="white" fontSize="3" opacity="0.7">Third Man</text>
        <text x="50" y="95" textAnchor="middle" fill="white" fontSize="3" opacity="0.7">Fine Leg</text>
        <text x="15" y="75" textAnchor="middle" fill="white" fontSize="3" opacity="0.7">Square Leg</text>
        <text x="8" y="52" textAnchor="middle" fill="white" fontSize="3" opacity="0.7">Mid-Wicket</text>
        <text x="15" y="30" textAnchor="middle" fill="white" fontSize="3" opacity="0.7">Mid-On</text>
        
        {/* Selected shot marker */}
        {selectedShot && (
          <>
            <circle
              cx={selectedShot.x}
              cy={selectedShot.y}
              r="3"
              fill="hsl(0 75% 50%)"
              stroke="white"
              strokeWidth="0.5"
              className="animate-pulse"
            />
            <circle
              cx={selectedShot.x}
              cy={selectedShot.y}
              r="5"
              fill="none"
              stroke="hsl(0 75% 50%)"
              strokeWidth="0.3"
              opacity="0.5"
            />
          </>
        )}
      </svg>
    </div>
  );
};

export default CricketField;
