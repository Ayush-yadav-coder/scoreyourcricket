-- Fix overly permissive RLS policies on bowling_scores table
-- Restrict INSERT and UPDATE to match creators and authorized scorers only

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Scorers can manage bowling" ON public.bowling_scores;
DROP POLICY IF EXISTS "Scorers can update bowling" ON public.bowling_scores;

-- Create new secure INSERT policy
-- Only match creator or authorized scorers can insert bowling records
CREATE POLICY "Authorized scorers can insert bowling" 
ON public.bowling_scores 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.innings i
    JOIN public.matches m ON i.match_id = m.id
    WHERE i.id = innings_id 
    AND (
      m.created_by = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM public.match_officials mo 
        WHERE mo.match_id = m.id 
        AND mo.user_id = auth.uid() 
        AND mo.role = 'scorer'
      )
    )
  )
);

-- Create new secure UPDATE policy  
-- Only match creator or authorized scorers can update bowling records
CREATE POLICY "Authorized scorers can update bowling" 
ON public.bowling_scores 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.innings i
    JOIN public.matches m ON i.match_id = m.id
    WHERE i.id = innings_id 
    AND (
      m.created_by = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM public.match_officials mo 
        WHERE mo.match_id = m.id 
        AND mo.user_id = auth.uid() 
        AND mo.role = 'scorer'
      )
    )
  )
);