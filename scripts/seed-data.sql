-- ============================================
-- 快速创建测试数据
-- 为手机号 18217795009 创建三个企业并设为管理员
-- ============================================

-- 1. 创建用户（如果不存在）
INSERT INTO users (phone, name) 
VALUES ('18217795009', '周梦洁')
ON CONFLICT (phone) DO UPDATE SET name = '周梦洁';

-- 2. 创建三个企业
INSERT INTO enterprises (name, owner_phone) VALUES
('企业ABC', '18217795009'),
('企业A', '18217795009'),
('1234', '18217795009')
ON CONFLICT DO NOTHING;

-- 3. 为每个企业创建默认组织
INSERT INTO organizations (enterprise_id, name)
SELECT id, '默认组织' FROM enterprises 
WHERE owner_phone = '18217795009'
ON CONFLICT DO NOTHING;

-- 4. 将用户添加为企业的管理员
INSERT INTO members (user_phone, enterprise_id, organization_id, role)
SELECT 
    '18217795009',
    e.id,
    o.id,
    'admin'
FROM enterprises e
JOIN organizations o ON o.enterprise_id = e.id AND o.name = '默认组织'
WHERE e.owner_phone = '18217795009'
ON CONFLICT (user_phone, enterprise_id) DO UPDATE SET role = 'admin';

-- 5. 验证结果
SELECT 
    u.phone,
    u.name,
    e.name as enterprise_name,
    e.enterprise_code,
    o.name as org_name,
    m.role
FROM users u
JOIN members m ON m.user_phone = u.phone
JOIN enterprises e ON e.id = m.enterprise_id
JOIN organizations o ON o.id = m.organization_id
WHERE u.phone = '18217795009';
