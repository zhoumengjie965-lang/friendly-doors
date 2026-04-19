-- 检查用户在各个企业中的角色
SELECT 
    m.user_phone,
    e.name as enterprise_name,
    m.role,
    m.organization_id,
    o.name as organization_name
FROM members m
JOIN enterprises e ON e.id = m.enterprise_id
LEFT JOIN organizations o ON o.id = m.organization_id
WHERE m.user_phone = '18217795009';
