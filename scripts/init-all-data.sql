-- ============================================
-- 完整数据初始化脚本
-- 为手机号 18217795009 创建用户、三个企业和管理员权限
-- ============================================

-- 1. 创建用户
INSERT INTO users (phone, name) 
VALUES ('18217795009', '周梦洁')
ON CONFLICT (phone) DO UPDATE SET name = '周梦洁';

-- 2. 创建三个企业
INSERT INTO enterprises (id, name, owner_phone) VALUES
('b813a01f-b607-4235-9091-925092578555', '企业ABC', '18217795009'),
('09d9d24f-27fa-48d4-a149-7fbe95f12415', '企业A', '18217795009'),
('90aef961-6560-4b93-a5ff-b74c70444ecc', '1234', '18217795009')
ON CONFLICT (id) DO UPDATE SET owner_phone = '18217795009';

-- 3. 为每个企业创建默认组织
INSERT INTO organizations (id, enterprise_id, name) VALUES
('c6c6a447-77f0-4312-8afd-a2debb4e772f', 'b813a01f-b607-4235-9091-925092578555', '默认组织'),
('4fa74859-b152-44f5-b8c5-f6acd5531a8e', '09d9d24f-27fa-48d4-a149-7fbe95f12415', '默认组织'),
('a19c55f4-94c2-4146-94a7-0b9672840f93', '90aef961-6560-4b93-a5ff-b74c70444ecc', '默认组织')
ON CONFLICT (id) DO NOTHING;

-- 4. 删除可能存在的旧成员记录（避免冲突）
DELETE FROM members WHERE user_phone = '18217795009';

-- 5. 将用户添加为三个企业的管理员
INSERT INTO members (user_phone, enterprise_id, organization_id, role) VALUES
('18217795009', 'b813a01f-b607-4235-9091-925092578555', 'c6c6a447-77f0-4312-8afd-a2debb4e772f', 'admin'),
('18217795009', '09d9d24f-27fa-48d4-a149-7fbe95f12415', '4fa74859-b152-44f5-b8c5-f6acd5531a8e', 'admin'),
('18217795009', '90aef961-6560-4b93-a5ff-b74c70444ecc', 'a19c55f4-94c2-4146-94a7-0b9672840f93', 'admin');

-- 6. 验证结果
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
