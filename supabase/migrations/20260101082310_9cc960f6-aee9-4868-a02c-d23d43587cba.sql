-- Fix batting_scores RLS policies - drop weak policies and add proper authorization
DROP POLICY IF EXISTS "Scorers can manage batting" ON public.batting_scores;
DROP POLICY IF EXISTS "Scorers can update batting" ON public.batting_scores;

-- Create proper INSERT policy matching bowling_scores pattern
CREATE POLICY "Authorized scorers can insert batting" 
ON public.batting_scores 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM innings i
    JOIN matches m ON i.match_id = m.id
    WHERE i.id = batting_scores.innings_id
    AND (
      m.created_by = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM match_officials mo
        WHERE mo.match_id = m.id
        AND mo.user_id = auth.uid()
        AND mo.role = 'scorer'
      )
    )
  )
);

-- Create proper UPDATE policy matching bowling_scores pattern
CREATE POLICY "Authorized scorers can update batting" 
ON public.batting_scores 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1
    FROM innings i
    JOIN matches m ON i.match_id = m.id
    WHERE i.id = batting_scores.innings_id
    AND (
      m.created_by = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM match_officials mo
        WHERE mo.match_id = m.id
        AND mo.user_id = auth.uid()
        AND mo.role = 'scorer'
      )
    )
  )
);

-- Fix deliveries RLS policies - drop weak policy and add proper authorization
DROP POLICY IF EXISTS "Scorers can add deliveries" ON public.deliveries;

-- Create proper INSERT policy for deliveries
CREATE POLICY "Authorized scorers can add deliveries" 
ON public.deliveries 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM innings i
    JOIN matches m ON i.match_id = m.id
    WHERE i.id = deliveries.innings_id
    AND (
      m.created_by = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM match_officials mo
        WHERE mo.match_id = m.id
        AND mo.user_id = auth.uid()
        AND mo.role = 'scorer'
      )
    )
  )
);