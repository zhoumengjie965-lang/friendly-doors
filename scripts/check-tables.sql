-- 检查数据库中有哪些表
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 检查是否有 members 表（可能是大写或其他名称）
SELECT table_name 
FROM information_schema.tables 
WHERE table_name ILIKE '%member%';
