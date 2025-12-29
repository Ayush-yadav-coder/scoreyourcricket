-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create match type enum
CREATE TYPE public.match_type AS ENUM ('test', 'odi', 'T20', 'box_cricket', 'custom');

-- Create ball type enum
CREATE TYPE public.ball_type AS ENUM ('leather', 'tennis', 'rubber', 'other');

-- Create dismissal type enum
CREATE TYPE public.dismissal_type AS ENUM ('bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket', 'retired', 'timed_out', 'handled_ball', 'obstructing_field');

-- Create break type enum
CREATE TYPE public.break_type AS ENUM ('tea', 'lunch', 'rain', 'drinks', 'injury', 'bad_light', 'other');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  is_famous BOOLEAN DEFAULT FALSE,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create team members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_captain BOOLEAN DEFAULT FALSE,
  is_wicketkeeper BOOLEAN DEFAULT FALSE,
  jersey_number INTEGER,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, player_id)
);

-- Create grounds table
CREATE TABLE public.grounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  city TEXT,
  country TEXT,
  capacity INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create matches table
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team1_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  team2_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  match_type match_type NOT NULL,
  overs INTEGER,
  ground_id UUID REFERENCES public.grounds(id) ON DELETE SET NULL,
  ball_type ball_type NOT NULL DEFAULT 'leather',
  toss_winner_id UUID REFERENCES public.teams(id),
  toss_decision TEXT CHECK (toss_decision IN ('bat', 'bowl')),
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed', 'abandoned')),
  is_live_streaming BOOLEAN DEFAULT FALSE,
  stream_url TEXT,
  match_ticker TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- Create innings table
CREATE TABLE public.innings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  batting_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  bowling_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  innings_number INTEGER NOT NULL,
  total_runs INTEGER DEFAULT 0,
  total_wickets INTEGER DEFAULT 0,
  total_overs DECIMAL(5,1) DEFAULT 0,
  extras INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  declared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create batting scorecard
CREATE TABLE public.batting_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  innings_id UUID REFERENCES public.innings(id) ON DELETE CASCADE NOT NULL,
  batsman_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  runs INTEGER DEFAULT 0,
  balls_faced INTEGER DEFAULT 0,
  fours INTEGER DEFAULT 0,
  sixes INTEGER DEFAULT 0,
  is_out BOOLEAN DEFAULT FALSE,
  dismissal_type dismissal_type,
  bowler_id UUID REFERENCES public.profiles(id),
  fielder_id UUID REFERENCES public.profiles(id),
  batting_position INTEGER,
  is_striker BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bowling scorecard
CREATE TABLE public.bowling_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  innings_id UUID REFERENCES public.innings(id) ON DELETE CASCADE NOT NULL,
  bowler_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  overs DECIMAL(5,1) DEFAULT 0,
  maidens INTEGER DEFAULT 0,
  runs_conceded INTEGER DEFAULT 0,
  wickets INTEGER DEFAULT 0,
  wides INTEGER DEFAULT 0,
  no_balls INTEGER DEFAULT 0,
  is_current_bowler BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ball by ball table
CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  innings_id UUID REFERENCES public.innings(id) ON DELETE CASCADE NOT NULL,
  over_number INTEGER NOT NULL,
  ball_number INTEGER NOT NULL,
  bowler_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  batsman_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  non_striker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  runs INTEGER DEFAULT 0,
  is_boundary BOOLEAN DEFAULT FALSE,
  is_six BOOLEAN DEFAULT FALSE,
  is_wicket BOOLEAN DEFAULT FALSE,
  dismissal_type dismissal_type,
  is_wide BOOLEAN DEFAULT FALSE,
  is_no_ball BOOLEAN DEFAULT FALSE,
  is_bye BOOLEAN DEFAULT FALSE,
  is_leg_bye BOOLEAN DEFAULT FALSE,
  shot_x DECIMAL(5,2),
  shot_y DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create match officials table
CREATE TABLE public.match_officials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('umpire', 'scorer', 'referee', 'third_umpire')),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create match breaks table
CREATE TABLE public.match_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  break_type break_type NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  notes TEXT
);

-- Create tournaments table
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tournament_type TEXT CHECK (tournament_type IN ('league', 'knockout', 'group_stage')),
  match_type match_type NOT NULL,
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tournament teams table
CREATE TABLE public.tournament_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (tournament_id, team_id)
);

-- Create series table
CREATE TABLE public.series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  series_type match_type NOT NULL,
  team1_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  team2_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  total_matches INTEGER NOT NULL,
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create follows table
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (follower_id, following_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.innings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batting_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bowling_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for teams
CREATE POLICY "Teams are viewable by everyone" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Team creators can update their teams" ON public.teams FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Team creators can delete their teams" ON public.teams FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for team_members
CREATE POLICY "Team members viewable by everyone" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Team creators can manage members" ON public.team_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
);
CREATE POLICY "Team creators can update members" ON public.team_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
);
CREATE POLICY "Team creators can delete members" ON public.team_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
);

-- RLS Policies for grounds
CREATE POLICY "Grounds are viewable by everyone" ON public.grounds FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create grounds" ON public.grounds FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for matches
CREATE POLICY "Matches are viewable by everyone" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create matches" ON public.matches FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Match creators can update matches" ON public.matches FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Match creators can delete matches" ON public.matches FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for innings
CREATE POLICY "Innings viewable by everyone" ON public.innings FOR SELECT USING (true);
CREATE POLICY "Match creators can manage innings" ON public.innings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND created_by = auth.uid())
);
CREATE POLICY "Match creators can update innings" ON public.innings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND created_by = auth.uid())
);

-- RLS Policies for batting_scores
CREATE POLICY "Batting scores viewable by everyone" ON public.batting_scores FOR SELECT USING (true);
CREATE POLICY "Scorers can manage batting" ON public.batting_scores FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Scorers can update batting" ON public.batting_scores FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS Policies for bowling_scores
CREATE POLICY "Bowling scores viewable by everyone" ON public.bowling_scores FOR SELECT USING (true);
CREATE POLICY "Scorers can manage bowling" ON public.bowling_scores FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Scorers can update bowling" ON public.bowling_scores FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS Policies for deliveries
CREATE POLICY "Deliveries viewable by everyone" ON public.deliveries FOR SELECT USING (true);
CREATE POLICY "Scorers can add deliveries" ON public.deliveries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for match_officials
CREATE POLICY "Officials viewable by everyone" ON public.match_officials FOR SELECT USING (true);
CREATE POLICY "Match creators can add officials" ON public.match_officials FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND created_by = auth.uid())
);
CREATE POLICY "Match creators can update officials" ON public.match_officials FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND created_by = auth.uid())
);
CREATE POLICY "Match creators can delete officials" ON public.match_officials FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND created_by = auth.uid())
);

-- RLS Policies for match_breaks
CREATE POLICY "Breaks viewable by everyone" ON public.match_breaks FOR SELECT USING (true);
CREATE POLICY "Match creators can manage breaks" ON public.match_breaks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND created_by = auth.uid())
);
CREATE POLICY "Match creators can update breaks" ON public.match_breaks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND created_by = auth.uid())
);

-- RLS Policies for tournaments
CREATE POLICY "Tournaments viewable by everyone" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tournaments" ON public.tournaments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creators can update tournaments" ON public.tournaments FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete tournaments" ON public.tournaments FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for tournament_teams
CREATE POLICY "Tournament teams viewable by everyone" ON public.tournament_teams FOR SELECT USING (true);
CREATE POLICY "Tournament creators can manage teams" ON public.tournament_teams FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.tournaments WHERE id = tournament_id AND created_by = auth.uid())
);
CREATE POLICY "Tournament creators can delete teams" ON public.tournament_teams FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.tournaments WHERE id = tournament_id AND created_by = auth.uid())
);

-- RLS Policies for series
CREATE POLICY "Series viewable by everyone" ON public.series FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create series" ON public.series FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creators can update series" ON public.series FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete series" ON public.series FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for follows
CREATE POLICY "Follows viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, full_name)
  VALUES (
    NEW.id,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live scoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.innings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.batting_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bowling_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;