import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Camera, MapPin, User, Phone, Loader2, Upload, ArrowLeft } from 'lucide-react';

const PLAYING_ROLES = [
  'Opener Batter',
  'Top Order Batter',
  'Middle Order Batter',
  'Lower Order Batter',
  'Wicket Keeper',
  'Wicketkeeper Batter',
  'All Rounder',
  'Bowler',
];

const BATTING_STYLES = [
  'Right Hand Batter',
  'Left Hand Batter',
];

const BOWLING_STYLES = [
  'Right Arm Fast',
  'Right Arm Medium',
  'Left Arm Fast',
  'Left Arm Medium',
  'Right Arm Leg Break',
  'Right Arm Off Break',
  'Slow Left Arm Orthodox',
  'Slow Left Arm Chinaman',
];

const GENDERS = [
  'Male',
  'Female',
  'Rather Not to Say',
];

interface ExtendedProfile {
  id: string;
  phone: string;
  full_name: string;
  avatar_url: string | null;
  is_famous: boolean;
  bio: string | null;
  location?: string | null;
  playing_role?: string | null;
  batting_style?: string | null;
  bowling_style?: string | null;
  gender?: string | null;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const extendedProfile = profile as ExtendedProfile | null;
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(extendedProfile?.avatar_url || '');
  const [fullName, setFullName] = useState(extendedProfile?.full_name || '');
  const [bio, setBio] = useState(extendedProfile?.bio || '');
  const [location, setLocation] = useState(extendedProfile?.location || '');
  const [playingRole, setPlayingRole] = useState(extendedProfile?.playing_role || '');
  const [battingStyle, setBattingStyle] = useState(extendedProfile?.batting_style || '');
  const [bowlingStyle, setBowlingStyle] = useState(extendedProfile?.bowling_style || '');
  const [gender, setGender] = useState(extendedProfile?.gender || '');

  React.useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Update state when profile loads
  React.useEffect(() => {
    if (extendedProfile) {
      setAvatarUrl(extendedProfile.avatar_url || '');
      setFullName(extendedProfile.full_name || '');
      setBio(extendedProfile.bio || '');
      setLocation(extendedProfile.location || '');
      setPlayingRole(extendedProfile.playing_role || '');
      setBattingStyle(extendedProfile.batting_style || '');
      setBowlingStyle(extendedProfile.bowling_style || '');
      setGender(extendedProfile.gender || '');
    }
  }, [extendedProfile]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      toast.success('Photo uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    if (!fullName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          avatar_url: avatarUrl || null,
          bio: bio.trim() || null,
          location: location.trim() || null,
          playing_role: playingRole || null,
          batting_style: battingStyle || null,
          bowling_style: bowlingStyle || null,
          gender: gender || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="border-2">
          <CardHeader className="text-center pb-4">
            <CardTitle className="font-display text-xl">Your Profile</CardTitle>
            <CardDescription>Update your cricket profile details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-3">
                <div 
                  onClick={handleImageClick}
                  className="relative cursor-pointer group"
                >
                  <Avatar className="h-28 w-28 border-4 border-primary/20">
                    <AvatarImage src={avatarUrl} alt={fullName} />
                    <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                      {fullName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploading ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleImageClick}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Change Photo
                    </>
                  )}
                </Button>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {/* Player Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">Player Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Virat Kohli"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Phone Number (readonly) */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={extendedProfile?.phone || ''}
                      readOnly
                      className="pl-10 bg-muted cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      type="text"
                      placeholder="Mumbai, India"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Playing Role */}
                <div className="space-y-2">
                  <Label htmlFor="playingRole">Playing Role</Label>
                  <Select value={playingRole} onValueChange={setPlayingRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your playing role" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAYING_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Batting Style */}
                <div className="space-y-2">
                  <Label htmlFor="battingStyle">Batting Style</Label>
                  <Select value={battingStyle} onValueChange={setBattingStyle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your batting style" />
                    </SelectTrigger>
                    <SelectContent>
                      {BATTING_STYLES.map((style) => (
                        <SelectItem key={style} value={style}>{style}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bowling Style */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bowlingStyle">Bowling Style</Label>
                  <Select value={bowlingStyle} onValueChange={setBowlingStyle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your bowling style" />
                    </SelectTrigger>
                    <SelectContent>
                      {BOWLING_STYLES.map((style) => (
                        <SelectItem key={style} value={style}>{style}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bio */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself as a cricketer..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Profile;
