-- HealthCare Pro v5.2 Schema

-- Enable RLS
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-super-secret-jwt-token';

-- 1. Users & Auth (Managed by Supabase Auth usually, but here is our extended profile)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  phone TEXT UNIQUE,
  role TEXT CHECK (role IN ('client', 'nutritionist', 'admin')),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Clients (The Core Profile)
CREATE TABLE public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nutritionist_id UUID REFERENCES public.profiles(id) NOT NULL, -- Data Isolation Key
  user_id UUID REFERENCES public.profiles(id), -- Linked when client logs in via phone
  
  phone TEXT NOT NULL, -- The Anchor
  name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')),
  birthday DATE,
  
  -- Status Tags
  tags TEXT[], -- ['hypertension', 'pregnant']
  
  -- WROM Scores (Computed by Backend)
  wrom_score INTEGER DEFAULT 0,
  wrom_history JSONB DEFAULT '[]', 
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Nutritionist can only see their own clients
CREATE POLICY "Nutritionists can view own clients" ON public.clients
  FOR SELECT USING (auth.uid() = nutritionist_id);

CREATE POLICY "Nutritionists can update own clients" ON public.clients
  FOR UPDATE USING (auth.uid() = nutritionist_id);

-- RLS Policy: Client can see own profile
CREATE POLICY "Clients can view own profile" ON public.clients
  FOR SELECT USING (auth.uid() = user_id);

-- 3. Inventory (The Stock)
CREATE TABLE public.inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) NOT NULL,
  product_name TEXT NOT NULL,
  
  quantity INTEGER DEFAULT 0, -- Current stock (e.g. 30 pills)
  dosage_per_day INTEGER DEFAULT 1, -- e.g. 2 pills/day
  
  last_replenished_at TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('active', 'low_stock', 'out_of_stock')) DEFAULT 'active',
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Check-ins (The Execution)
CREATE TABLE public.check_ins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) NOT NULL,
  
  checkin_date DATE NOT NULL, -- 2023-10-01
  time_slot TEXT CHECK (time_slot IN ('morning', 'noon', 'night')),
  
  is_taken BOOLEAN DEFAULT FALSE,
  consumed_at TIMESTAMP WITH TIME ZONE, -- The Atomic Timestamp
  
  -- Symptom Tracking
  mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 10),
  energy_score INTEGER CHECK (energy_score BETWEEN 1 AND 10),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Replenishment Orders (The Loop)
CREATE TABLE public.replenishment_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) NOT NULL,
  nutritionist_id UUID REFERENCES public.profiles(id) NOT NULL,
  
  items JSONB NOT NULL, -- [{product: "VitC", qty: 2}]
  tracking_number TEXT,
  
  status TEXT CHECK (status IN ('pending_approval', 'pending_arrival', 'completed', 'cancelled')) DEFAULT 'pending_approval',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);
