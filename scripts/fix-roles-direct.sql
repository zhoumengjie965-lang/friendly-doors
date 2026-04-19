-- ============================================
-- 直接强制更新角色为 admin
-- ============================================

-- 1. 先查看当前数据
SELECT '更新前' as status,
    m.user_phone,
    e.name as enterprise_name,
    e.enterprise_code,
    m.role,
    m.enterprise_id
FROM members m
JOIN enterprises e ON e.id = m.enterprise_id
WHERE m.user_phone = '18217795009';

-- 2. 直接 UPDATE（不使用 INSERT...ON CONFLICT）
UPDATE members
SET role = 'admin'
WHERE user_phone = '18217795009'
AND enterprise_id IN (
    SELECT id FROM enterprises WHERE owner_phone = '18217795009'
);

-- 3. 验证更新结果
SELECT '更新后' as status,
    m.user_phone,
    e.name as enterprise_name,
    e.enterprise_code,
    m.role
FROM members m
JOIN enterprises e ON e.id = m.enterprise_id
WHERE m.user_phone = '18217795009';
