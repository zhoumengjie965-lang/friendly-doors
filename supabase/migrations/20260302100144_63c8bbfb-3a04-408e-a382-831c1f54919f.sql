
-- 删除 api_keys 表上的写操作 RLS 策略
-- 写操作由 SECURITY DEFINER RPC 函数自行鉴权，不再依赖 RLS
DROP POLICY IF EXISTS "Creator can insert own keys" ON public.api_keys;
DROP POLICY IF EXISTS "Creator can update own keys" ON public.api_keys;
DROP POLICY IF EXISTS "Creator can delete own keys" ON public.api_keys;
