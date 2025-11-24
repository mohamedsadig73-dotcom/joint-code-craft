-- Add calendar preference column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN calendar_preference TEXT DEFAULT 'gregorian' CHECK (calendar_preference IN ('gregorian', 'hijri'));

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.calendar_preference IS 'User preference for calendar display: gregorian or hijri';