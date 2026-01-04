-- Expand allowed official roles to support 1st/2nd/3rd umpire and 1st/2nd scorer
ALTER TABLE public.match_officials
  DROP CONSTRAINT IF EXISTS match_officials_role_check;

ALTER TABLE public.match_officials
  ADD CONSTRAINT match_officials_role_check
  CHECK (role IN (
    'umpire',
    'second_umpire',
    'third_umpire',
    'scorer',
    'second_scorer',
    'referee'
  ));
