-- 为企业表添加备注字段
ALTER TABLE public.enterprises ADD COLUMN IF NOT EXISTS remark TEXT;

-- 添加注释
COMMENT ON COLUMN public.enterprises.remark IS '企业备注信息，仅管理员可见';
