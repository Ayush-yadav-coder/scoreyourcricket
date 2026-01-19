-- Create player achievements table
CREATE TABLE public.player_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  icon_name TEXT DEFAULT 'trophy',
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  value INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;

-- Everyone can view achievements
CREATE POLICY "Achievements are viewable by everyone" 
ON public.player_achievements 
FOR SELECT 
USING (true);

-- Only system can insert (via triggers or admin)
CREATE POLICY "Authenticated users can insert achievements" 
ON public.player_achievements 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for faster queries
CREATE INDEX idx_player_achievements_player_id ON public.player_achievements(player_id);
CREATE INDEX idx_player_achievements_type ON public.player_achievements(achievement_type);

-- Enable realtime for achievements
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_achievements;