/*
# [FIX] Corrección de Dependencia de Funciones
Este script soluciona el error "function public.update_updated_at_column() does not exist" asegurando el orden correcto de creación: primero funciones, luego tablas y finalmente triggers.

## Query Description: Este script primero eliminará las tablas y funciones existentes de FinanzasDúo para garantizar una instalación limpia y luego las recreará en el orden correcto. No debería haber pérdida de datos si la migración anterior falló, pero si se insertaron datos manualmente, se perderán.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Medium"
- Requires-Backup: true
- Reversible: false

## Structure Details:
- Funciones: update_updated_at_column, handle_new_user
- Tablas: profiles, transactions, saving_goals, recurring_transactions, smart_alerts
- Triggers: on_auth_user_created, y triggers de updated_at para cada tabla.
- RLS: Políticas de seguridad para todas las tablas.
*/

-- 1. Limpieza de estructuras previas (en orden inverso de dependencia)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS set_transactions_updated_at ON public.transactions;
DROP TRIGGER IF EXISTS set_saving_goals_updated_at ON public.saving_goals;
DROP TRIGGER IF EXISTS set_recurring_transactions_updated_at ON public.recurring_transactions;
DROP TRIGGER IF EXISTS set_smart_alerts_updated_at ON public.smart_alerts;

DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.saving_goals;
DROP TABLE IF EXISTS public.recurring_transactions;
DROP TABLE IF EXISTS public.smart_alerts;
DROP TABLE IF EXISTS public.profiles;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at_column();


-- 2. Creación de Funciones
/*
  # [Function] update_updated_at_column
  Función de trigger para actualizar automáticamente la columna `updated_at` en cualquier tabla.
*/
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now(); 
   RETURN NEW;
END;
$$ language 'plpgsql';
-- Security definer para que pueda ser ejecutada por el sistema de triggers
ALTER FUNCTION public.update_updated_at_column() SECURITY DEFINER;


/*
  # [Function] handle_new_user
  Función de trigger para crear un perfil de usuario en `public.profiles` cuando se crea un nuevo usuario en `auth.users`.
*/
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar'
  );
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';
-- Security definer para que pueda operar sobre la tabla `public.profiles`
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER;


-- 3. Creación de Tablas
/*
  # [Table] profiles
  Almacena información pública del perfil de los usuarios.
*/
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_profiles_email ON public.profiles(email);

/*
  # [Table] saving_goals
  Almacena las metas de ahorro de los usuarios.
*/
CREATE TABLE public.saving_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(10, 2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_saving_goals_user_id ON public.saving_goals(user_id);

/*
  # [Table] transactions
  Almacena todas las transacciones financieras.
*/
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'saving')),
  date TIMESTAMPTZ NOT NULL,
  is_shared BOOLEAN DEFAULT false NOT NULL,
  goal_id UUID REFERENCES public.saving_goals(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_date ON public.transactions(date);
CREATE INDEX idx_transactions_type ON public.transactions(type);

/*
  # [Table] recurring_transactions
  Almacena transacciones que se repiten periódicamente.
*/
CREATE TABLE public.recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'saving')),
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'yearly')),
  day_of_month INT CHECK (day_of_month >= 1 AND day_of_month <= 31),
  start_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_recurring_transactions_user_id ON public.recurring_transactions(user_id);
CREATE INDEX idx_recurring_next_due_date ON public.recurring_transactions(next_due_date);

/*
  # [Table] smart_alerts
  Almacena alertas y notificaciones para los usuarios.
*/
CREATE TABLE public.smart_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('warning', 'info', 'success')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_smart_alerts_user_id ON public.smart_alerts(user_id);
CREATE INDEX idx_smart_alerts_read ON public.smart_alerts(read);


-- 4. Creación de Triggers (después de crear tablas y funciones)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER set_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER set_saving_goals_updated_at
  BEFORE UPDATE ON public.saving_goals
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER set_recurring_transactions_updated_at
  BEFORE UPDATE ON public.recurring_transactions
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER set_smart_alerts_updated_at
  BEFORE UPDATE ON public.smart_alerts
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();


-- 5. Políticas de Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saving_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas para perfiles
CREATE POLICY "Los usuarios pueden ver su propio perfil" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Los usuarios pueden actualizar su propio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para transacciones
CREATE POLICY "Los usuarios pueden gestionar sus propias transacciones" ON public.transactions FOR ALL USING (auth.uid() = user_id);

-- Políticas para metas de ahorro
CREATE POLICY "Los usuarios pueden gestionar sus propias metas" ON public.saving_goals FOR ALL USING (auth.uid() = user_id);

-- Políticas para transacciones recurrentes
CREATE POLICY "Los usuarios pueden gestionar sus propios recurrentes" ON public.recurring_transactions FOR ALL USING (auth.uid() = user_id);

-- Políticas para alertas
CREATE POLICY "Los usuarios pueden gestionar sus propias alertas" ON public.smart_alerts FOR ALL USING (auth.uid() = user_id);
