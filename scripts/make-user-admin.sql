-- 将手机号 18217795009 在所有企业中的角色升级为企业管理员
-- 执行此脚本前请确认手机号是否正确

-- 首先查看该用户在哪些企业中
SELECT 
    m.id,
    m.user_phone,
    m.role,
    m.enterprise_id,
    e.name as enterprise_name
FROM members m
JOIN enterprises e ON m.enterprise_id = e.id
WHERE m.user_phone = '18217795009';

-- 如果上面的查询结果显示 role 是 'member'，执行下面的更新语句
-- 把所有企业的角色都改为 admin
UPDATE members
SET role = 'admin'
WHERE user_phone = '18217795009';

-- 验证更新结果
SELECT 
    m.id,
    m.user_phone,
    m.role,
    e.name as enterprise_name
FROM members m
JOIN enterprises e ON m.enterprise_id = e.id
WHERE m.user_phone = '18217795009';
