-- Create tournament_groups table for group stage tournaments
CREATE TABLE public.tournament_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tournament_group_teams junction table
CREATE TABLE public.tournament_group_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.tournament_groups(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (group_id, team_id)
);

-- Add tournament_id to matches table for linking matches to tournaments
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.tournament_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_group_teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournament_groups
CREATE POLICY "Tournament groups viewable by everyone" ON public.tournament_groups FOR SELECT USING (true);
CREATE POLICY "Tournament creators can create groups" ON public.tournament_groups FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.tournaments WHERE id = tournament_id AND created_by = auth.uid())
);
CREATE POLICY "Tournament creators can update groups" ON public.tournament_groups FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.tournaments WHERE id = tournament_id AND created_by = auth.uid())
);
CREATE POLICY "Tournament creators can delete groups" ON public.tournament_groups FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.tournaments WHERE id = tournament_id AND created_by = auth.uid())
);

-- RLS Policies for tournament_group_teams
CREATE POLICY "Tournament group teams viewable by everyone" ON public.tournament_group_teams FOR SELECT USING (true);
CREATE POLICY "Tournament creators can add teams to groups" ON public.tournament_group_teams FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournament_groups tg 
    JOIN public.tournaments t ON t.id = tg.tournament_id 
    WHERE tg.id = group_id AND t.created_by = auth.uid()
  )
);
CREATE POLICY "Tournament creators can delete teams from groups" ON public.tournament_group_teams FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.tournament_groups tg 
    JOIN public.tournaments t ON t.id = tg.tournament_id 
    WHERE tg.id = group_id AND t.created_by = auth.uid()
  )
);

-- Enable realtime for tournament tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_group_teams;