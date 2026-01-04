import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Video, VideoOff, Check, ArrowRight, ArrowLeft, Palette } from 'lucide-react';
import { toast } from 'sonner';
import TickerCustomizer, { TickerCustomization } from './TickerCustomizer';

interface TickerStyle {
  id: string;
  name: string;
  preview: string;
}

const TICKER_STYLES: TickerStyle[] = [
  { id: 'ipl', name: 'IPL Style', preview: 'Blue gradient with orange accents' },
  { id: 'bcci', name: 'BCCI Style', preview: 'Orange top bar with dark bottom' },
  { id: 'test', name: 'Test Match', preview: 'Classic green minimal style' },
  { id: 'ashes', name: 'Ashes Style', preview: 'Green/Blue split design' },
  { id: 'blackcaps', name: 'Black Caps Style', preview: 'Pink/Black modern design' },
  { id: 'aus', name: 'Australia Style', preview: 'Dark gradient with gold accents' },
  { id: 'world_cup', name: 'World Cup Style', preview: 'Dark with this over balls' },
  { id: 'eng_ind', name: 'England-India Style', preview: 'Dual color with team logos' },
  { id: 't20_wc', name: 'T20 WC Style', preview: 'Blue/Magenta gradient' },
  { id: 'pak_nz', name: 'Pink Style', preview: 'Vibrant pink with flags' },
  // New ticker styles based on user's reference images
  { id: 'ind_aus', name: 'India-Australia', preview: 'Dark gradient with day/session info' },
  { id: 'pak_nz_2', name: 'Pakistan-NZ', preview: 'Green with player photos layout' },
  { id: 'west_indies', name: 'West Indies', preview: 'Maroon with partnership info' },
  { id: 'ban_sl', name: 'Bangladesh-SL', preview: 'Green top with match info' },
  { id: 'sl_aus', name: 'SriLanka-Australia', preview: 'Blue with lead info' },
  { id: 'eng_pak', name: 'England-Pakistan', preview: 'Gradient with speed info' },
];

interface LiveStreamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchData: {
    battingTeam: string;
    bowlingTeam: string;
    score: number;
    wickets: number;
    overs: number;
    striker: { name: string; runs: number; balls: number };
    nonStriker: { name: string; runs: number; balls: number };
    bowler: { name: string; wickets: number; runs: number; overs: number };
    currentOverBalls?: string[];
    runRate?: number;
    requiredRunRate?: number;
    target?: number;
  };
  onStartStream: (withTicker: boolean, tickerStyle: string, customization?: TickerCustomization) => void;
}

type Step = 'permission' | 'choice' | 'ticker_select' | 'preview';

const LiveStreamDialog: React.FC<LiveStreamDialogProps> = ({
  open,
  onOpenChange,
  matchData,
  onStartStream,
}) => {
  const [step, setStep] = useState<Step>('permission');
  const [cameraGranted, setCameraGranted] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string>('ipl');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [tickerCustomization, setTickerCustomization] = useState<TickerCustomization | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) {
      // Cleanup stream when dialog closes
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setStep('permission');
      setCameraGranted(false);
    }
  }, [open]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, step]);

  const requestCameraAccess = async () => {
    try {
      // First check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera access is not supported in this browser');
        return;
      }

      // Try to get video first, audio is optional
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: { ideal: 'environment' } }, 
          audio: true 
        });
      } catch (audioError) {
        // If audio fails, try video only
        console.warn('Audio access failed, trying video only:', audioError);
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: { ideal: 'environment' } }
        });
      }
      
      setStream(mediaStream);
      setCameraGranted(true);
      setStep('choice');
      toast.success('Camera access granted!');
    } catch (error: any) {
      console.error('Camera access error:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        toast.error('No camera found on this device.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        toast.error('Camera is already in use by another application.');
      } else if (error.name === 'OverconstrainedError') {
        // Try with simpler constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setStream(fallbackStream);
          setCameraGranted(true);
          setStep('choice');
          toast.success('Camera access granted!');
          return;
        } catch (fallbackError) {
          toast.error('Could not access camera with current settings.');
        }
      } else {
        toast.error('Failed to access camera. Please check your permissions.');
      }
    }
  };

  const handleChoice = (withTicker: boolean) => {
    if (withTicker) {
      setStep('ticker_select');
    } else {
      setStep('preview');
    }
  };

  const handleStartStream = () => {
    onStartStream(step === 'preview' && selectedTicker !== '', selectedTicker, tickerCustomization || undefined);
    onOpenChange(false);
  };

  const handleSaveCustomization = (customization: TickerCustomization) => {
    setTickerCustomization(customization);
    toast.success('Ticker customization saved!');
  };

  const renderTickerPreview = () => {
    switch (selectedTicker) {
      case 'ipl':
        return <IPLTicker {...matchData} />;
      case 'bcci':
        return <BCCITicker {...matchData} />;
      case 'test':
        return <TestTicker {...matchData} />;
      case 'ashes':
        return <AshesTicker {...matchData} />;
      case 'blackcaps':
        return <BlackCapsTicker {...matchData} />;
      case 'aus':
        return <AustraliaTicker {...matchData} />;
      case 'world_cup':
        return <WorldCupTicker {...matchData} />;
      case 'eng_ind':
        return <EngIndTicker {...matchData} />;
      case 't20_wc':
        return <T20WCTicker {...matchData} />;
      case 'pak_nz':
        return <PinkTicker {...matchData} />;
      case 'ind_aus':
        return <IndAusTicker {...matchData} />;
      case 'pak_nz_2':
        return <PakNZTicker {...matchData} />;
      case 'west_indies':
        return <WestIndiesTicker {...matchData} />;
      case 'ban_sl':
        return <BanSLTicker {...matchData} />;
      case 'sl_aus':
        return <SLAusTicker {...matchData} />;
      case 'eng_pak':
        return <EngPakTicker {...matchData} />;
      default:
        return <IPLTicker {...matchData} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            {step === 'permission' && 'Camera Access Required'}
            {step === 'choice' && 'Stream Options'}
            {step === 'ticker_select' && 'Select Scorecard Ticker'}
            {step === 'preview' && 'Preview Stream'}
          </DialogTitle>
        </DialogHeader>

        {step === 'permission' && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="h-12 w-12 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Allow Camera Access</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                To go live, we need access to your device's camera and microphone.
              </p>
            </div>
            <Button onClick={requestCameraAccess} size="lg" className="gap-2">
              <Camera className="h-4 w-4" />
              Allow Camera Access
            </Button>
          </div>
        )}

        {step === 'choice' && (
          <div className="space-y-6 py-4">
            <p className="text-center text-muted-foreground">
              Would you like to stream with or without a scorecard ticker overlay?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-32 flex flex-col gap-2"
                onClick={() => handleChoice(false)}
              >
                <VideoOff className="h-8 w-8" />
                <span>Without Ticker</span>
                <span className="text-xs text-muted-foreground">Stream video only</span>
              </Button>
              <Button
                variant="outline"
                className="h-32 flex flex-col gap-2 border-primary"
                onClick={() => handleChoice(true)}
              >
                <Video className="h-8 w-8 text-primary" />
                <span>With Scorecard Ticker</span>
                <span className="text-xs text-muted-foreground">Show live score overlay</span>
              </Button>
            </div>
          </div>
        )}

        {step === 'ticker_select' && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
              {TICKER_STYLES.map((style) => (
                <Button
                  key={style.id}
                  variant={selectedTicker === style.id ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col items-start gap-1"
                  onClick={() => setSelectedTicker(style.id)}
                >
                  <span className="font-semibold">{style.name}</span>
                  <span className="text-xs opacity-70">{style.preview}</span>
                </Button>
              ))}
            </div>
            
            {/* Ticker Preview */}
            <div className="mt-4 p-2 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Preview:</p>
              <div className="transform scale-90 origin-left">
                {renderTickerPreview()}
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setStep('choice')} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button variant="outline" onClick={() => setShowCustomizer(true)} className="gap-2">
                <Palette className="h-4 w-4" />
                Customize
              </Button>
              <Button onClick={() => setStep('preview')} className="flex-1">
                Preview
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 py-4">
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {selectedTicker && (
                <div className="absolute bottom-0 left-0 right-0">
                  {renderTickerPreview()}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('ticker_select')} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Change Ticker
              </Button>
              <Button onClick={handleStartStream} className="flex-1 bg-red-600 hover:bg-red-700">
                <Video className="mr-2 h-4 w-4" />
                Go Live
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Ticker Customizer Dialog */}
      <TickerCustomizer
        open={showCustomizer}
        onOpenChange={setShowCustomizer}
        selectedTicker={selectedTicker}
        onSave={handleSaveCustomization}
      />
    </Dialog>
  );
};

// Ticker Components based on uploaded reference images

interface TickerProps {
  battingTeam: string;
  bowlingTeam: string;
  score: number;
  wickets: number;
  overs: number;
  striker: { name: string; runs: number; balls: number };
  nonStriker: { name: string; runs: number; balls: number };
  bowler: { name: string; wickets: number; runs: number; overs: number };
  currentOverBalls?: string[];
  runRate?: number;
  requiredRunRate?: number;
  target?: number;
}

// IPL Style - Blue with orange accents (Image 1 top ticker)
const IPLTicker: React.FC<TickerProps> = ({
  battingTeam,
  bowlingTeam,
  score,
  wickets,
  overs,
  striker,
  nonStriker,
  bowler,
  runRate = 0,
}) => (
  <div className="w-full bg-gradient-to-r from-[#1a237e] via-[#283593] to-[#1a237e] text-white text-xs py-1.5 px-3 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        <span className="text-[10px]">▶</span>
        <span className="font-bold">{striker.name.split(' ')[0]}</span>
        <span className="ml-1">{striker.runs} ({striker.balls})</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-medium">{nonStriker.name.split(' ')[0]}</span>
        <span className="ml-1">{nonStriker.runs} ({nonStriker.balls})</span>
      </div>
    </div>
    <div className="flex items-center gap-2 bg-[#d84315] px-3 py-0.5 rounded-sm">
      <span className="font-bold">{battingTeam.substring(0, 3).toUpperCase()}</span>
      <span className="text-sm font-bold">{score}/{wickets}</span>
    </div>
    <div className="text-[10px]">RR: {runRate.toFixed(2)}</div>
    <div className="flex items-center gap-2">
      <span className="font-medium">{bowler.name.split(' ')[0]}</span>
      <span>{bowler.wickets}/{bowler.runs} ({bowler.overs})</span>
    </div>
  </div>
);

// BCCI/India Style - Orange top with dark bottom (Image 7 & 9)
const BCCITicker: React.FC<TickerProps> = ({
  battingTeam,
  bowlingTeam,
  score,
  wickets,
  overs,
  striker,
  nonStriker,
  bowler,
  currentOverBalls = [],
}) => (
  <div className="w-full">
    <div className="bg-gradient-to-r from-[#ff6f00] to-[#ff8f00] text-white text-xs py-1 px-3 flex items-center justify-between rounded-t-lg">
      <div className="flex items-center gap-2">
        <span className="font-bold">{battingTeam.substring(0, 3).toUpperCase()}</span>
        <span className="text-lg font-bold">{score}-{wickets}</span>
        <span className="text-[10px] opacity-80">{overs} overs</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-[10px]">▶</span>
          <span className="font-bold">{striker.name.split(' ')[0]}</span>
          <span>{striker.runs}</span>
          <span className="text-[10px]">{striker.balls}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">{nonStriker.name.split(' ')[0]}</span>
          <span>{nonStriker.runs}</span>
          <span className="text-[10px]">{nonStriker.balls}</span>
        </div>
      </div>
    </div>
    <div className="bg-[#1a1a2e] text-white text-xs py-1 px-3 flex items-center justify-between rounded-b-lg">
      <div className="flex items-center gap-2">
        <span className="font-medium">{bowler.name.split(' ')[0]}</span>
        <span>{bowler.wickets}-{bowler.runs}</span>
        <span className="text-[10px] opacity-70">{bowler.overs}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] opacity-70">THIS OVER</span>
        {currentOverBalls.slice(-6).map((ball, i) => (
          <span key={i} className="w-5 h-5 rounded-sm bg-[#2a2a4e] flex items-center justify-center text-[10px]">
            {ball}
          </span>
        ))}
      </div>
    </div>
  </div>
);

// Test Match Style - Classic green minimal (Image 3)
const TestTicker: React.FC<TickerProps> = ({
  battingTeam,
  score,
  wickets,
  overs,
  striker,
  nonStriker,
  bowler,
}) => (
  <div className="w-full bg-gradient-to-r from-[#2e7d32] via-[#388e3c] to-[#2e7d32] text-white text-xs py-2 px-4 flex items-center justify-between rounded-sm">
    <div className="flex items-center gap-2">
      <span className="font-bold">{battingTeam.substring(0, 2).toUpperCase()}</span>
      <span className="text-lg font-bold bg-[#1b5e20] px-2 rounded">{score}-{wickets}</span>
    </div>
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 border-l border-white/30 pl-3">
        <span className="text-[10px]">▶</span>
        <span className="font-medium">{striker.name.split(' ')[0]}</span>
        <span className="font-bold">{striker.runs}</span>
        <span className="text-[10px] opacity-70">({striker.balls})</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-medium">{nonStriker.name.split(' ')[0]}</span>
        <span>{nonStriker.runs}</span>
        <span className="text-[10px] opacity-70">({nonStriker.balls})</span>
      </div>
    </div>
    <div className="flex items-center gap-1 border-l border-white/30 pl-3">
      <span className="font-medium">{bowler.name.split(' ')[0]}</span>
      <span>{bowler.wickets}-{bowler.runs}</span>
      <span className="text-[10px] opacity-70">({bowler.overs})</span>
    </div>
  </div>
);

// Ashes Style - Green/Blue split design (Image 4)
const AshesTicker: React.FC<TickerProps> = ({
  battingTeam,
  bowlingTeam,
  score,
  wickets,
  overs,
  striker,
  nonStriker,
  bowler,
  runRate = 0,
}) => (
  <div className="w-full flex text-white text-xs">
    <div className="bg-[#2e7d32] flex-1 py-2 px-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-bold">{battingTeam.substring(0, 3).toUpperCase()}</span>
        <span className="text-lg font-bold">{score}-{wickets}</span>
        <span className="text-[10px] opacity-80">Overs {overs}</span>
        <span className="text-[10px] opacity-80">Run rate {runRate.toFixed(2)}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="font-medium">{striker.name.split(' ')[0]}</span>
          <span className="font-bold">{striker.runs}</span>
          <span className="text-[10px] opacity-70">({striker.balls})</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">/{nonStriker.name.split(' ')[0]}</span>
          <span>{nonStriker.runs}</span>
          <span className="text-[10px] opacity-70">({nonStriker.balls})</span>
        </div>
      </div>
    </div>
    <div className="bg-[#1565c0] px-4 py-2 flex items-center gap-2">
      <span className="font-bold">{bowlingTeam.substring(0, 3).toUpperCase()}</span>
      <span className="font-medium">{bowler.name.split(' ')[0]}</span>
      <span>{bowler.wickets}-{bowler.runs}</span>
      <span className="text-[10px] opacity-70">({bowler.overs})</span>
    </div>
  </div>
);

// Black Caps / Pink Style (Image 2)
const BlackCapsTicker: React.FC<TickerProps> = ({
  battingTeam,
  bowlingTeam,
  score,
  wickets,
  overs,
  striker,
  nonStriker,
  bowler,
}) => (
  <div className="w-full flex text-white text-xs">
    <div className="bg-gradient-to-r from-[#e91e63] to-[#f06292] flex-1 py-2 px-4 flex items-center gap-4 clip-arrow-right">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-[10px]">▶</span>
          <span className="font-bold">{striker.name.toUpperCase()}</span>
        </div>
        <span>{striker.runs}</span>
        <span className="text-[10px]">{striker.balls}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium">{nonStriker.name.toUpperCase()}</span>
        <span>{nonStriker.runs}</span>
        <span className="text-[10px]">{nonStriker.balls}</span>
      </div>
    </div>
    <div className="bg-[#1a237e] px-4 py-2 flex items-center gap-2">
      <span className="text-[10px] opacity-70">{bowlingTeam.substring(0, 2).toUpperCase()} v</span>
      <span className="font-bold">{battingTeam.substring(0, 3).toUpperCase()}</span>
      <span className="bg-[#e91e63] px-2 py-0.5 rounded text-lg font-bold">{score}-{wickets}</span>
      <span className="text-[10px]">P1</span>
      <span className="text-[10px]">{overs} overs</span>
    </div>
    <div className="bg-gradient-to-r from-[#f06292] to-[#e91e63] px-4 py-2 flex items-center gap-2">
      <span className="font-medium">{bowler.name.toUpperCase()}</span>
      <span>{bowler.wickets}-{bowler.runs}</span>
      <span className="text-[10px]">{bowler.overs}</span>
    </div>
  </div>
);

// Australia Style - Dark gradient with gold (Image 6)
const AustraliaTicker: React.FC<TickerProps> = ({
  battingTeam,
  bowlingTeam,
  score,
  wickets,
  overs,
  striker,
  nonStriker,
  bowler,
  runRate = 0,
  currentOverBalls = [],
}) => (
  <div className="w-full bg-gradient-to-r from-[#1a1a2e] via-[#2d2d44] to-[#1a1a2e] text-white text-xs py-2 px-4 flex items-center justify-between rounded-full border border-[#ffd700]/30">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-[#006400] flex items-center justify-center text-[10px] font-bold">
        {battingTeam.substring(0, 2).toUpperCase()}
      </div>
      <div className="flex flex-col">
        <span className="font-bold">{battingTeam.toUpperCase()}</span>
        <span className="text-lg font-bold text-[#ffd700]">{wickets}-{score}</span>
      </div>
      <span className="text-[10px] opacity-70">OVERS<br/>{overs}</span>
    </div>
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1">
        <span className="text-[10px]">▶</span>
        <span className="font-bold">{striker.name.toUpperCase()}</span>
        <span className="text-[#ffd700]">{striker.runs}</span>
        <span className="text-[10px]">{striker.balls}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-medium">{nonStriker.name.toUpperCase()}</span>
        <span>{nonStriker.runs}</span>
        <span className="text-[10px]">{nonStriker.balls}</span>
      </div>
    </div>
    <span className="text-[10px]">RUN RATE: {runRate.toFixed(2)}</span>
    <div className="flex items-center gap-1">
      {currentOverBalls.slice(-6).map((ball, i) => (
        <span key={i} className="w-5 h-5 rounded-full border border-white/30 flex items-center justify-center text-[10px]">
          {ball}
        </span>
      ))}
    </div>
    <div className="flex items-center gap-2">
      <span className="font-bold">{bowlingTeam.toUpperCase()}</span>
      <span className="text-[#00bcd4]">{bowler.name.toUpperCase()} {bowler.wickets}-{bowler.runs}</span>
      <span className="text-[10px]">{bowler.overs}</span>
    </div>
  </div>
);

// World Cup Style - Dark with this over balls (Image 8)
const WorldCupTicker: React.FC<TickerProps> = ({
  battingTeam,
  bowlingTeam,
  score,
  wickets,
  overs,
  striker,
  nonStriker,
  bowler,
  runRate = 0,
  currentOverBalls = [],
}) => (
  <div className="w-full">
    <div className="bg-gradient-to-r from-[#1a237e] to-[#283593] text-white text-xs py-1.5 px-3 flex items-center justify-between rounded-t-lg">
      <div className="flex items-center gap-3">
        <span className="font-bold text-[#ffd700]">{battingTeam.toUpperCase()}</span>
        <span className="text-xl font-bold">{score}-{wickets}</span>
        <span className="text-[10px] opacity-80">{overs}</span>
        <span className="font-bold">{bowlingTeam.toUpperCase()}</span>
      </div>
      <div className="text-[10px]">CURRENT RUN-RATE <span className="text-lg font-bold">{runRate.toFixed(2)}</span></div>
    </div>
    <div className="bg-[#0d1421] text-white text-xs py-1.5 px-3 flex items-center justify-between rounded-b-lg">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="font-medium">{nonStriker.name.split(' ')[0]}</span>
          <span>{nonStriker.runs}</span>
          <span className="text-[10px] opacity-70">{nonStriker.balls}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px]">▶</span>
          <span className="font-bold">{striker.name.split(' ')[0]}</span>
          <span className="font-bold">{striker.runs}</span>
          <span className="text-[10px] opacity-70">{striker.balls}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium">{bowler.name.split(' ')[0]}</span>
        <span>{bowler.wickets}-{bowler.runs}</span>
        <span className="text-[10px] opacity-70">{bowler.overs}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] opacity-70">THIS OVER</span>
        {currentOverBalls.slice(-6).map((ball, i) => (
          <span key={i} className="w-5 h-5 rounded-sm bg-[#1e3a5f] flex items-center justify-center text-[10px] font-bold">
            {ball}
          </span>
        ))}
      </div>
    </div>
  </div>
);

// England-India Style (Image 9)
const EngIndTicker: React.FC<TickerProps> = ({
  battingTeam,
  bowlingTeam,
  score,
  wickets,
  overs,
  striker,
  nonStriker,
  bowler,
  currentOverBalls = [],
}) => (
  <div className="w-full bg-[#0a1628] text-white text-xs py-2 px-3 flex items-center justify-between border-t-4 border-[#1565c0] rounded-lg">
    <div className="flex items-center gap-3">
      <span className="font-bold text-[#1565c0]">{battingTeam.substring(0, 3).toUpperCase()}</span>
      <span className="text-xl font-bold">{score}-{wickets}</span>
      <span className="text-[10px] opacity-80">OVERS {overs}</span>
    </div>
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1">
        <span className="text-[10px]">▶</span>
        <span className="font-bold text-[#ffd700]">{striker.name.split(' ')[0].toUpperCase()}</span>
        <span className="font-bold">{striker.runs}</span>
        <span className="text-[10px]">{striker.balls}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-medium">{nonStriker.name.split(' ')[0].toUpperCase()}</span>
        <span>{nonStriker.runs}</span>
        <span className="text-[10px]">{nonStriker.balls}</span>
      </div>
    </div>
    <div className="flex items-center gap-2 text-[#1565c0]">
      <span className="font-medium">{bowler.name.split(' ')[0].toUpperCase()}</span>
      <span>{bowler.wickets}-{bowler.runs}</span>
      <span className="text-[10px]">{bowler.overs}</span>
    </div>
    <div className="flex items-center gap-1">
      {currentOverBalls.slice(-6).map((ball, i) => (
        <span key={i} className="w-5 h-5 rounded-sm bg-[#1e3a5f] flex items-center justify-center text-[10px] font-bold">
          {ball}
        </span>
      ))}
    </div>
  </div>
);

// T20 World Cup Style (Image 10)
const T20WCTicker: React.FC<TickerProps> = ({
  battingTeam,
  bowlingTeam,
  score,
  wickets,
  overs,
  striker,
  nonStriker,
  bowler,
}) => (
  <div className="w-full flex text-white text-xs">
    <div className="bg-gradient-to-r from-[#1a237e] to-[#3949ab] flex-1 py-2 px-4 flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="font-medium">/{striker.name.split(' ')[0].toUpperCase()}</span>
        <span>{striker.runs}</span>
        <span className="text-[10px]">{striker.balls}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-bold">{nonStriker.name.split(' ')[0].toUpperCase()}</span>
        <span>{nonStriker.runs}</span>
        <span className="text-[10px]">{nonStriker.balls}</span>
      </div>
    </div>
    <div className="bg-gradient-to-r from-[#d81b60] to-[#e91e63] px-4 py-2 flex items-center gap-2">
      <span className="font-bold">{battingTeam.substring(0, 3).toUpperCase()} v {bowlingTeam.substring(0, 3).toUpperCase()}</span>
      <span className="bg-[#4caf50] px-2 py-0.5 rounded text-lg font-bold">{score}-{wickets}</span>
      <span className="text-[10px]">{overs} OVERS</span>
    </div>
    <div className="bg-[#1a237e] px-4 py-2 flex items-center gap-2">
      <span className="font-medium">{bowler.name.split(' ')[0].toUpperCase()}</span>
      <span>{bowler.wickets}-{bowler.runs}</span>
    </div>
  </div>
);

// Pink Style (Image 2 bottom)
const PinkTicker: React.FC<TickerProps> = ({
  battingTeam,
  bowlingTeam,
  score,
  wickets,
  overs,
  striker,
  nonStriker,
  bowler,
}) => (
  <div className="w-full flex text-white text-xs">
    <div className="bg-gradient-to-r from-[#e91e63] to-[#f48fb1] flex-1 py-2 px-4 flex items-center gap-4 rounded-l-lg">
      <div className="flex items-center gap-2">
        <span className="text-[10px]">▶</span>
        <span className="font-bold">{striker.name.toUpperCase()}</span>
        <span className="font-bold">{striker.runs}</span>
        <span className="text-[10px]">{striker.balls}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium">{nonStriker.name.toUpperCase()}</span>
        <span>{nonStriker.runs}</span>
        <span className="text-[10px]">{nonStriker.balls}</span>
      </div>
    </div>
    <div className="bg-[#1a237e] px-4 py-2 flex items-center gap-2">
      <span className="text-[10px]">{bowlingTeam.substring(0, 3).toUpperCase()} v</span>
      <span className="font-bold">{battingTeam.substring(0, 3).toUpperCase()}</span>
      <span className="bg-[#4caf50] px-2 py-0.5 rounded text-lg font-bold">{score}-{wickets}</span>
      <span className="text-[10px]">P2</span>
      <span className="text-[10px]">{overs} overs</span>
    </div>
    <div className="bg-gradient-to-r from-[#f48fb1] to-[#e91e63] px-4 py-2 flex items-center gap-2 rounded-r-lg">
      <span className="font-medium">{bowler.name.toUpperCase()}</span>
      <span>{bowler.wickets}-{bowler.runs}</span>
      <span className="text-[10px]">{bowler.overs}</span>
    </div>
  </div>
);

// India-Australia Style - Dark gradient with day/session info (Reference Image 1)
const IndAusTicker: React.FC<TickerProps> = ({
  battingTeam,
  bowlingTeam,
  score,
  wickets,
  overs,
  striker,
  nonStriker,
  bowler,
  currentOverBalls = [],
}) => (
  <div className="w-full bg-gradient-to-r from-[#0d1f3c] via-[#1a3a5c] to-[#0d1f3c] text-white text-xs">
    <div className="flex items-center justify-between py-2 px-3 border-b border-cyan-500/30">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-[8px] font-bold">
            ☀
          </div>
          <span className="font-bold text-orange-400">{battingTeam.toUpperCase()}</span>
        </div>
        <span className="text-2xl font-bold text-cyan-400">{score}-{wickets}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] opacity-80">{overs}</span>
        <span className="font-bold text-green-400">{bowlingTeam.toUpperCase()}</span>
        <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-[8px] font-bold">
          🏏
        </div>
      </div>
      <div className="bg-[#1e3a5f] px-3 py-1 rounded">
        <span className="text-[10px] font-medium">DAY 1</span>
        <br />
        <span className="text-[10px] opacity-70">SESSION 1</span>
      </div>
      <div className="text-right">
        <span className="text-[10px] opacity-70">LEAD BY</span>
        <br />
        <span className="font-bold text-yellow-400">{Math.abs(score - 200)} RUNS</span>
      </div>
    </div>
    <div className="flex items-center justify-between py-1.5 px-3 bg-[#0a1628]">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="text-[10px]">▶</span>
          <span className="font-bold text-yellow-300">{striker.name.split(' ')[0].toUpperCase()}</span>
          <span className="font-bold">{striker.runs}</span>
          <span className="text-[10px] opacity-70">{striker.balls}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">{nonStriker.name.split(' ')[0].toUpperCase()}</span>
          <span>{nonStriker.runs}</span>
          <span className="text-[10px] opacity-70">{nonStriker.balls}</span>
        </div>
      </div>
      <div className="text-[10px] opacity-70">SPEED 82.4 km/h</div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] opacity-70">THIS OVER</span>
        {currentOverBalls.slice(-6).map((ball, i) => (
          <span key={i} className="w-4 h-4 rounded-sm bg-[#1e3a5f] flex items-center justify-center text-[8px]">
            {ball}
          </span>
        ))}
      </div>
    </div>
  </div>
);

// Pakistan-NZ Style - Green with player layout (Reference Image 2)
const PakNZTicker: React.FC<TickerProps> = ({
  battingTeam,
  bowlingTeam,
  score,
  wickets,
  overs,
  striker,
  nonStriker,
  bowler,
}) => (
  <div className="w-full flex text-white text-xs">
    <div className="bg-gradient-to-r from-[#004d00] to-[#006600] flex items-center gap-4 py-2 px-4 flex-1">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
          <span className="text-[8px] text-green-800">⭐</span>
        </div>
        <span className="font-bold text-green-200">{battingTeam.substring(0, 3).toUpperCase()}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-bold">{score}-{wickets}</span>
        <span className="text-[10px] opacity-70">{overs}</span>
      </div>
      <div className="h-8 w-px bg-white/30" />
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs">👤</div>
          <span className="font-medium">{striker.name.split(' ')[0].toUpperCase()}</span>
          <span className="font-bold">{striker.runs} <span className="text-[10px]">{striker.balls}</span></span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs">👤</div>
          <span className="font-medium">{nonStriker.name.split(' ')[0].toUpperCase()}</span>
          <span>{nonStriker.runs} <span className="text-[10px]">{nonStriker.balls}</span></span>
        </div>
      </div>
    </div>
    <div className="bg-gradient-to-r from-[#2d2d2d] to-[#1a1a1a] flex items-center gap-3 py-2 px-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs">👤</div>
        <div className="flex flex-col">
          <span className="font-medium text-cyan-300">{bowler.name.split(' ')[0].toUpperCase()}</span>
          <span className="font-bold">{bowler.wickets}-{bowler.runs} <span className="text-[10px]">{bowler.overs}</span></span>
        </div>
      </div>
      <span className="text-[10px] opacity-70">DAY 1, SESSION 3</span>
      <div className="flex items-center gap-1">
        <span className="font-bold">{bowlingTeam.substring(0, 2).toUpperCase()}</span>
        <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-[8px]">🥝</div>
      </div>
    </div>
  </div>
);

// West Indies Style - Maroon with partnership info (Reference Image 3)
const WestIndiesTicker: React.FC<TickerProps> = ({
  battingTeam,
  score,
  wickets,
  overs,
  striker,
  nonStriker,
  bowler,
  currentOverBalls = [],
}) => (
  <div className="w-full flex text-white text-xs">
    <div className="bg-gradient-to-r from-[#800020] to-[#a0002a] flex-1 py-2 px-4 flex items-center gap-4 rounded-l-lg">
      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
        <span className="text-[10px] text-[#800020]">🏏</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px]">▶</span>
        <span className="font-bold">{striker.name.toUpperCase()}</span>
        <span className="font-bold text-lg">{striker.runs}</span>
        <span className="text-[10px] opacity-70">({striker.balls})</span>
        <span className="text-[10px] bg-white/20 px-1 rounded">168.3</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium">{nonStriker.name.toUpperCase()}</span>
        <span>{nonStriker.runs}</span>
        <span className="text-[10px] opacity-70">({nonStriker.balls})</span>
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-bold">{score}-{wickets}</span>
      </div>
    </div>
    <div className="bg-[#1a1a2e] flex items-center gap-3 py-2 px-4">
      <div className="flex flex-col items-center">
        <span className="text-[10px] opacity-70">TRAIL BY</span>
        <span className="text-xl font-bold text-yellow-400">122</span>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] opacity-70">PARTNERSHIP</span>
        <span className="text-[10px]">34 RUNS OFF 104 BALLS</span>
      </div>
    </div>
    <div className="bg-gradient-to-r from-[#1a237e] to-[#283593] flex items-center gap-3 py-2 px-4 rounded-r-lg">
      <span className="font-bold text-yellow-300">{bowler.name.toUpperCase()}</span>
      <span className="font-bold">{bowler.wickets}-{bowler.runs}</span>
      <span className="text-[10px]">({bowler.overs})</span>
      <div className="flex items-center gap-1">
        <span className="text-[10px] opacity-70">THIS OVER</span>
        {currentOverBalls.slice(-3).map((ball, i) => (
          <span key={i} className="w-4 h-4 rounded-full border border-white/50 flex items-center justify-center text-[8px]">
            {ball}
          </span>
        ))}
      </div>
    </div>
  </div>
);

// Bangladesh-SriLanka Style - Green top with match info (Reference Image 4)
const BanSLTicker: React.FC<TickerProps> = ({
  battingTeam,
  bowlingTeam,
  score,
  wickets,
  overs,
  striker,
  nonStriker,
  bowler,
}) => (
  <div className="w-full">
    <div className="bg-gradient-to-r from-[#006a4e] via-[#00854d] to-[#006a4e] text-white text-xs py-1 px-4 flex items-center justify-between rounded-t-lg border-b-2 border-red-500">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-[8px]">🇧🇩</div>
        <span className="font-bold">{battingTeam.toUpperCase()}</span>
        <span className="text-xl font-bold text-yellow-300">{score}-{wickets}</span>
        <span className="text-[10px] opacity-80">{overs}</span>
      </div>
      <div className="bg-[#004d00] px-3 py-0.5 rounded">
        <span className="font-medium">{battingTeam.toUpperCase()} v {bowlingTeam.toUpperCase()} - SECOND TEST</span>
      </div>
      <div className="text-right">
        <span className="text-[10px]">DAY 2, SESSION 2</span>
      </div>
    </div>
    <div className="bg-[#1a1a2e] text-white text-xs py-1.5 px-4 flex items-center justify-between rounded-b-lg">
      <div className="flex items-center gap-3">
        <span className="font-medium">{bowler.name.split(' ')[0].toUpperCase()}</span>
        <span className="opacity-70">{bowler.runs}</span>
        <span className="text-[10px]">{bowler.overs}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="text-[10px]">▶</span>
          <span className="font-bold text-green-400">{striker.name.toUpperCase()}</span>
          <span className="font-bold">{striker.runs}</span>
          <span className="text-[10px] opacity-70">{striker.balls}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium text-blue-400">{bowler.name.split(' ')[0].toUpperCase()}</span>
        <span>{bowler.wickets}-{bowler.runs}</span>
        <span className="text-[10px]">{bowler.overs}</span>
        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[8px]">🇱🇰</div>
      </div>
    </div>
  </div>
);

// SriLanka-Australia Style - Blue with lead info (Reference Image 5)
const SLAusTicker: React.FC<TickerProps> = ({
  battingTeam,
  bowlingTeam,
  score,
  wickets,
  overs,
  striker,
  nonStriker,
  bowler,
}) => (
  <div className="w-full">
    <div className="bg-[#1565c0] text-white text-[10px] py-0.5 px-4 flex items-center justify-start rounded-t-lg">
      <span className="font-medium">{battingTeam.toUpperCase()} LEAD BY 190 RUNS</span>
    </div>
    <div className="bg-gradient-to-r from-[#0d47a1] to-[#1565c0] text-white text-xs py-2 px-4 flex items-center justify-between rounded-b-lg">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-sm bg-blue-800 flex items-center justify-center text-[8px]">🇱🇰</div>
        <span className="font-bold">{battingTeam.substring(0, 2).toUpperCase()}</span>
        <span className="text-xl font-bold text-yellow-300">{score}-{wickets}</span>
        <span className="text-[10px] opacity-80">{overs}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-bold text-yellow-300">{striker.name.toUpperCase()}</span>
        <span className="font-bold">{striker.runs}</span>
        <span className="text-[10px]">{striker.balls}</span>
        <span className="opacity-50">/</span>
        <span className="font-medium">{nonStriker.name.toUpperCase()}</span>
        <span>{nonStriker.runs}</span>
        <span className="text-[10px]">{nonStriker.balls}</span>
      </div>
      <div className="flex items-center gap-2 bg-[#ffd700] text-black px-3 py-1 rounded">
        <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center text-[8px]">🇦🇺</div>
        <span className="font-bold">{bowler.name.toUpperCase()}</span>
        <span>{bowler.wickets}-{bowler.runs}</span>
        <span className="text-[10px]">{bowler.overs}</span>
      </div>
    </div>
  </div>
);

// England-Pakistan Style - Gradient with speed info (Reference Image 6)
const EngPakTicker: React.FC<TickerProps> = ({
  battingTeam,
  bowlingTeam,
  score,
  wickets,
  overs,
  striker,
  nonStriker,
  bowler,
  runRate = 0,
}) => (
  <div className="w-full flex text-white text-xs items-center bg-gradient-to-r from-[#1a1a2e] via-[#2d2d44] to-[#1a1a2e] rounded-full border border-gray-600">
    <div className="flex items-center gap-2 py-2 px-4">
      <div className="w-6 h-6 rounded-sm bg-white flex items-center justify-center">
        <span className="text-[8px] text-red-600">🏴󠁧󠁢󠁥󠁮󠁧󠁿</span>
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <span className="text-[10px]">▶</span>
          <span className="font-medium">{striker.name.split(' ')[0].toUpperCase()}</span>
          <span className="font-bold">{striker.runs}</span>
          <span className="text-[10px] opacity-70">{striker.balls}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">{nonStriker.name.split(' ')[0].toUpperCase()}</span>
          <span>{nonStriker.runs}</span>
          <span className="text-[10px] opacity-70">{nonStriker.balls}</span>
        </div>
      </div>
    </div>
    <div className="bg-gradient-to-r from-[#00bcd4] to-[#0097a7] px-4 py-2 rounded-full flex items-center gap-2">
      <span className="text-[10px] opacity-70">{bowlingTeam.substring(0, 3).toUpperCase()} v</span>
      <span className="font-bold text-yellow-300">{battingTeam.substring(0, 3).toUpperCase()}</span>
      <span className="text-xl font-bold">{score}-{wickets}</span>
      <span className="text-[10px]">P3</span>
      <span className="text-[10px]">{overs}</span>
    </div>
    <div className="px-3">
      <span className="text-[10px] opacity-70">RUN RATE</span>
      <span className="font-bold ml-1">{runRate.toFixed(2)}</span>
    </div>
    <div className="flex items-center gap-2 py-2 px-4">
      <span className="font-bold text-cyan-300">{bowler.name.split(' ')[0].toUpperCase()}</span>
      <span>{bowler.wickets}-{bowler.runs}</span>
      <span className="text-[10px]">{bowler.overs}</span>
      <div className="flex flex-col text-right">
        <span className="text-[10px] text-cyan-400">SPEED</span>
        <span className="text-[10px]">130 KPH / 81 MPH</span>
      </div>
      <div className="w-6 h-6 rounded-sm bg-green-700 flex items-center justify-center">
        <span className="text-[8px]">🇵🇰</span>
      </div>
    </div>
  </div>
);

export default LiveStreamDialog;

// Export the TickerCustomizer dialog for use in ticker selection
export { TickerCustomizer };
