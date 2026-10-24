-- Club staff emails that get the admin role automatically, before or after they first log in.
CREATE TABLE IF NOT EXISTS public.admin_emails (
  email TEXT PRIMARY KEY CHECK (email = lower(email)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No client access: only the service role and SECURITY DEFINER functions read it.
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

INSERT INTO public.admin_emails (email) VALUES
  ('barellaignacio@gmail.com'),
  ('matiasdichiacchio@gmail.com'),
  ('contactomundopadel@gmail.com'),
  ('nebugedo@gmail.com')
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    CASE
      WHEN EXISTS (SELECT 1 FROM public.admin_emails a WHERE a.email = lower(NEW.email)) THEN 'admin'
      ELSE 'user'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Promote any of these accounts that already exist.
UPDATE public.profiles p
SET role = 'admin', updated_at = now()
FROM public.admin_emails a
WHERE lower(p.email) = a.email AND p.role <> 'admin';
