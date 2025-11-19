-- Create status_history table to track declaration status changes
CREATE TABLE public.declaration_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id TEXT NOT NULL REFERENCES public.declarations(id) ON DELETE CASCADE,
  old_status declaration_status,
  new_status declaration_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.declaration_status_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all status history"
ON public.declaration_status_history
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own status changes"
ON public.declaration_status_history
FOR INSERT
WITH CHECK (auth.uid() = changed_by);

-- Create index for better performance
CREATE INDEX idx_status_history_declaration_id ON public.declaration_status_history(declaration_id);
CREATE INDEX idx_status_history_changed_at ON public.declaration_status_history(changed_at DESC);

-- Create function to automatically log status changes
CREATE OR REPLACE FUNCTION public.log_declaration_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.declaration_status_history (
      declaration_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  -- Log initial status on insert
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.declaration_status_history (
      declaration_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      NULL,
      NEW.status,
      NEW.sender_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically log status changes
CREATE TRIGGER trigger_log_declaration_status_change
AFTER INSERT OR UPDATE ON public.declarations
FOR EACH ROW
EXECUTE FUNCTION public.log_declaration_status_change();