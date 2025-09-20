/*
          # [FIX & RE-IMPLEMENTATION] Schema de FinanzasDúo
          Este script corrige el error de migración anterior y define el esquema completo.
          Primero elimina las tablas existentes para garantizar una instalación limpia y luego las recrea en el orden correcto,
          separando la creación de tablas de la creación de relaciones (foreign keys) para evitar errores de dependencia.

          ## Query Description: [¡ATENCIÓN! Esta operación eliminará y recreará las tablas: profiles, saving_goals, transactions, recurring_transactions y smart_alerts.
          Si tienes datos en estas tablas, se perderán. Se recomienda hacer una copia de seguridad si es necesario.
          Esta acción es necesaria para corregir el error de migración anterior y establecer una base de datos limpia y funcional.]
          
          ## Metadata:
          - Schema-Category: "Dangerous"
          - Impact-Level: "High"
          - Requires-Backup: true
          - Reversible: false
          
          ## Structure Details:
          - Se eliminan y recrean 5 tablas.
          - Se definen claves primarias, foráneas y restricciones.
          - Se crean funciones y triggers para automatización.
          - Se habilita RLS y se definen políticas de seguridad para todas las tablas.
          
          ## Security Implications:
          - RLS Status: Enabled
          - Policy Changes: Yes
          - Auth Requirements: Las políticas aseguran que los usuarios solo puedan acceder a sus propios datos.
          
          ## Performance Impact:
          - Indexes: Se añaden índices en claves foráneas (user_id) para optimizar las consultas.
          - Triggers: Se usan triggers para mantener la integridad de datos (perfiles, timestamps).
          - Estimated Impact: Bajo a medio, optimizado para consultas por usuario.
          */

-- PASO 1: Eliminar tablas existentes en orden inverso para evitar errores de dependencia.
DROP TABLE IF EXISTS public.smart_alerts;
DROP TABLE IF EXISTS public.recurring_transactions;
DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.saving_goals;
DROP TABLE IF EXISTS public.profiles;

-- PASO 2: Crear las tablas sin relaciones foráneas complejas.

-- Tabla de perfiles de usuario
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar TEXT,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.profiles IS 'Stores public profile information for each user.';

-- Tabla de metas de ahorro
CREATE TABLE public.saving_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    target_amount NUMERIC(10, 2) NOT NULL,
    current_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    deadline DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.saving_goals IS 'Stores user-defined saving goals.';

-- Tabla de transacciones
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'saving')),
    date TIMESTAMPTZ NOT NULL,
    is_shared BOOLEAN NOT NULL DEFAULT FALSE,
    goal_id UUID,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.transactions IS 'Stores all financial transactions for users.';

-- Tabla de transacciones recurrentes
CREATE TABLE public.recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'saving')),
    frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'yearly')),
    day_of_month INTEGER,
    start_date DATE NOT NULL,
    next_due_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.recurring_transactions IS 'Stores recurring financial events.';

-- Tabla de alertas inteligentes
CREATE TABLE public.smart_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('warning', 'info', 'success')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.smart_alerts IS 'Stores smart alerts and notifications for users.';

-- PASO 3: Añadir relaciones foráneas (Foreign Keys).
ALTER TABLE public.saving_goals ADD CONSTRAINT saving_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.saving_goals(id) ON DELETE SET NULL;
ALTER TABLE public.recurring_transactions ADD CONSTRAINT recurring_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.smart_alerts ADD CONSTRAINT smart_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- PASO 4: Crear índices para mejorar el rendimiento.
CREATE INDEX ON public.saving_goals (user_id);
CREATE INDEX ON public.transactions (user_id);
CREATE INDEX ON public.transactions (user_id, date);
CREATE INDEX ON public.recurring_transactions (user_id);
CREATE INDEX ON public.smart_alerts (user_id);

-- PASO 5: Crear funciones y triggers.

-- Función para crear un perfil cuando se registra un nuevo usuario en Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (new.id, new.raw_user_meta_data->>'name', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que llama a la función anterior después de crear un usuario.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Función para actualizar el campo `updated_at` automáticamente.
CREATE OR REPLACE FUNCTION public.update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar `updated_at` en cada tabla.
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.update_timestamp_column();
CREATE TRIGGER update_saving_goals_updated_at BEFORE UPDATE ON public.saving_goals FOR EACH ROW EXECUTE PROCEDURE public.update_timestamp_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE PROCEDURE public.update_timestamp_column();
CREATE TRIGGER update_recurring_transactions_updated_at BEFORE UPDATE ON public.recurring_transactions FOR EACH ROW EXECUTE PROCEDURE public.update_timestamp_column();

-- PASO 6: Habilitar Row Level Security (RLS) en todas las tablas.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saving_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_alerts ENABLE ROW LEVEL SECURITY;

-- PASO 7: Crear políticas de RLS.

-- Políticas para `profiles`
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Políticas para `saving_goals`
CREATE POLICY "Users can manage their own saving goals" ON public.saving_goals FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Políticas para `transactions`
CREATE POLICY "Users can manage their own transactions" ON public.transactions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Políticas para `recurring_transactions`
CREATE POLICY "Users can manage their own recurring transactions" ON public.recurring_transactions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Políticas para `smart_alerts`
CREATE POLICY "Users can manage their own smart alerts" ON public.smart_alerts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
