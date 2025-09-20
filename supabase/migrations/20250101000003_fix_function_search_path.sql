/*
# [Fix Function Search Path]
Establece explícitamente el `search_path` para las funciones `handle_new_user` y `update_updated_at_column` al esquema `public`. Esto mejora la seguridad y la previsibilidad al evitar que las funciones dependan de la ruta de búsqueda de la sesión.

## Query Description: [Esta operación modifica dos funciones existentes para establecer su `search_path` a `public`. Es una operación segura que no afecta a los datos existentes y mejora la robustez de la base de datos. No se requiere copia de seguridad.]

## Metadata:
- Schema-Category: "Safe"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Functions affected: `public.handle_new_user`, `public.update_updated_at_column`

## Security Implications:
- RLS Status: No change
- Policy Changes: No
- Auth Requirements: Admin privileges to alter functions.
- Description: Mitiga el riesgo de ejecución de código no deseado a través de la manipulación del `search_path` de la sesión.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Nulo. El impacto en el rendimiento es insignificante.
*/

-- Establecer `search_path` para la función que maneja nuevos usuarios
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Establecer `search_path` para la función que actualiza `updated_at`
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
