/*
# [SECURITY] Set Function Search Path
This script sets the `search_path` for all custom functions to enhance security by preventing potential hijacking attacks.

## Query Description:
This operation modifies the configuration of existing functions to explicitly define their schema search path. It does not alter the logic or data of the application. It's a safe and recommended security hardening step.

## Metadata:
- Schema-Category: ["Safe", "Security"]
- Impact-Level: ["Low"]
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Modifies functions: `handle_new_user`, `update_updated_at_column`, `update_goal_on_transaction_change`.

## Security Implications:
- RLS Status: Unchanged
- Policy Changes: No
- Auth Requirements: None
- Mitigates: `search_path` manipulation vulnerabilities.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible.
*/

ALTER FUNCTION public.handle_new_user() SET search_path = 'public';

ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public';

ALTER FUNCTION public.update_goal_on_transaction_change() SET search_path = 'public';
