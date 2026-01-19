import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { 
  ArrowLeft, 
  Bell, 
  BellOff,
  Target,
  Zap,
  MessageCircle,
  Trophy,
  Play,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor
} from 'lucide-react';

interface NotificationPreferences {
  wickets: boolean;
  boundaries: boolean;
  sixes: boolean;
  milestones: boolean;
  matchStart: boolean;
  matchEnd: boolean;
  messages: boolean;
  soundEnabled: boolean;
  browserNotifications: boolean;
}

const defaultPreferences: NotificationPreferences = {
  wickets: true,
  boundaries: true,
  sixes: true,
  milestones: true,
  matchStart: true,
  matchEnd: true,
  messages: true,
  soundEnabled: true,
  browserNotifications: true,
};

const NotificationSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load preferences from localStorage
    const saved = localStorage.getItem('notificationPreferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse notification preferences:', e);
      }
    }
  }, []);

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    localStorage.setItem('notificationPreferences', JSON.stringify(newPreferences));
    toast.success('Preferences saved');
  };

  const handleEnableBrowserNotifications = async () => {
    setLoading(true);
    const granted = await requestPermission();
    if (granted) {
      updatePreference('browserNotifications', true);
    }
    setLoading(false);
  };

  const handleDisableAll = () => {
    const disabled: NotificationPreferences = {
      wickets: false,
      boundaries: false,
      sixes: false,
      milestones: false,
      matchStart: false,
      matchEnd: false,
      messages: false,
      soundEnabled: false,
      browserNotifications: false,
    };
    setPreferences(disabled);
    localStorage.setItem('notificationPreferences', JSON.stringify(disabled));
    toast.success('All notifications disabled');
  };

  const handleEnableAll = () => {
    setPreferences(defaultPreferences);
    localStorage.setItem('notificationPreferences', JSON.stringify(defaultPreferences));
    toast.success('All notifications enabled');
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Notification Settings</h1>
            <p className="text-muted-foreground">Customize your notification preferences</p>
          </div>
          <Bell className="h-8 w-8 text-primary" />
        </div>

        {/* Browser Notification Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Browser Notifications
            </CardTitle>
            <CardDescription>
              Receive notifications even when the app is in the background
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium">Status</p>
                  <p className="text-sm text-muted-foreground">
                    {!isSupported 
                      ? 'Not supported in this browser'
                      : permission === 'granted' 
                        ? 'Enabled' 
                        : permission === 'denied'
                          ? 'Blocked - Enable in browser settings'
                          : 'Not enabled'
                    }
                  </p>
                </div>
              </div>
              <Badge variant={permission === 'granted' ? 'default' : 'secondary'}>
                {permission === 'granted' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            
            {isSupported && permission !== 'granted' && permission !== 'denied' && (
              <Button onClick={handleEnableBrowserNotifications} disabled={loading}>
                <Smartphone className="h-4 w-4 mr-2" />
                Enable Browser Notifications
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Match Notifications */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Match Events
            </CardTitle>
            <CardDescription>
              Get notified about important match events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <NotificationToggle
              icon={Target}
              label="Wickets"
              description="When a batsman gets out"
              checked={preferences.wickets}
              onCheckedChange={(value) => updatePreference('wickets', value)}
            />
            
            <Separator />
            
            <NotificationToggle
              icon={Zap}
              label="Boundaries (Fours)"
              description="When a batsman hits a four"
              checked={preferences.boundaries}
              onCheckedChange={(value) => updatePreference('boundaries', value)}
            />
            
            <Separator />
            
            <NotificationToggle
              icon={Zap}
              label="Sixes"
              description="When a batsman hits a six"
              checked={preferences.sixes}
              onCheckedChange={(value) => updatePreference('sixes', value)}
              iconClassName="text-orange-500"
            />
            
            <Separator />
            
            <NotificationToggle
              icon={Trophy}
              label="Score Milestones"
              description="When team reaches 50, 100, 150, etc."
              checked={preferences.milestones}
              onCheckedChange={(value) => updatePreference('milestones', value)}
            />
            
            <Separator />
            
            <NotificationToggle
              icon={Play}
              label="Match Start"
              description="When a match you're following goes live"
              checked={preferences.matchStart}
              onCheckedChange={(value) => updatePreference('matchStart', value)}
            />
            
            <Separator />
            
            <NotificationToggle
              icon={Trophy}
              label="Match End"
              description="When a match completes"
              checked={preferences.matchEnd}
              onCheckedChange={(value) => updatePreference('matchEnd', value)}
            />
          </CardContent>
        </Card>

        {/* Message Notifications */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Messages
            </CardTitle>
            <CardDescription>
              Get notified when you receive new messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationToggle
              icon={MessageCircle}
              label="Direct Messages"
              description="When someone sends you a message"
              checked={preferences.messages}
              onCheckedChange={(value) => updatePreference('messages', value)}
            />
          </CardContent>
        </Card>

        {/* Sound Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Sound
            </CardTitle>
            <CardDescription>
              Play sound with notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationToggle
              icon={preferences.soundEnabled ? Volume2 : VolumeX}
              label="Notification Sound"
              description="Play a sound when notifications arrive"
              checked={preferences.soundEnabled}
              onCheckedChange={(value) => updatePreference('soundEnabled', value)}
            />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleEnableAll} className="flex-1">
            <Bell className="h-4 w-4 mr-2" />
            Enable All
          </Button>
          <Button variant="outline" onClick={handleDisableAll} className="flex-1">
            <BellOff className="h-4 w-4 mr-2" />
            Disable All
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

interface NotificationToggleProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  iconClassName?: string;
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
  iconClassName = "text-primary",
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Icon className={`h-5 w-5 ${iconClassName}`} />
      <div>
        <Label htmlFor={label} className="font-medium cursor-pointer">{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
    <Switch
      id={label}
      checked={checked}
      onCheckedChange={onCheckedChange}
    />
  </div>
);

export default NotificationSettings;
