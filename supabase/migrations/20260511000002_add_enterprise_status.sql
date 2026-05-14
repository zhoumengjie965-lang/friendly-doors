-- 为企业表添加状态字段
ALTER TABLE public.enterprises ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'enabled';

-- 添加检查约束确保状态值有效
ALTER TABLE public.enterprises DROP CONSTRAINT IF EXISTS enterprises_status_check;
ALTER TABLE public.enterprises ADD CONSTRAINT enterprises_status_check CHECK (status IN ('enabled', 'disabled'));

-- 添加注释
COMMENT ON COLUMN public.enterprises.status IS '企业状态：enabled-已启用，disabled-已禁用';

-- 更新现有数据，设置默认值为 enabled
UPDATE public.enterprises SET status = 'enabled' WHERE status IS NULL;
