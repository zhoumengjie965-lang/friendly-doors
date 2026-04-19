-- ============================================
-- 验证和修复用户角色
-- ============================================

-- 1. 首先查看当前 members 表中的角色
SELECT 
    m.user_phone,
    e.name as enterprise_name,
    e.enterprise_code,
    o.name as org_name,
    m.role,
    m.enterprise_id,
    m.organization_id
FROM members m
JOIN enterprises e ON e.id = m.enterprise_id
JOIN organizations o ON o.id = m.organization_id
WHERE m.user_phone = '18217795009';

-- 2. 确保所有企业都有且仅有一个默认组织
-- 先检查每个企业的组织数量
SELECT 
    e.id as enterprise_id,
    e.name as enterprise_name,
    COUNT(o.id) as org_count
FROM enterprises e
LEFT JOIN organizations o ON o.enterprise_id = e.id
WHERE e.owner_phone = '18217795009'
GROUP BY e.id, e.name;

-- 3. 如果有企业的默认组织被删除，重新创建
INSERT INTO organizations (enterprise_id, name)
SELECT e.id, '默认组织'
FROM enterprises e
LEFT JOIN organizations o ON o.enterprise_id = e.id AND o.name = '默认组织'
WHERE e.owner_phone = '18217795009'
AND o.id IS NULL;

-- 4. 强制更新所有成员角色为 admin（确保 enterprise_id 和 organization_id 正确）
UPDATE members
SET role = 'admin'
WHERE user_phone = '18217795009'
AND enterprise_id IN (
    SELECT id FROM enterprises WHERE owner_phone = '18217795009'
);

-- 5. 验证更新后的结果
SELECT 
    m.user_phone,
    e.name as enterprise_name,
    e.enterprise_code,
    o.name as org_name,
    m.role
FROM members m
JOIN enterprises e ON e.id = m.enterprise_id
JOIN organizations o ON o.id = m.organization_id
WHERE m.user_phone = '18217795009';
