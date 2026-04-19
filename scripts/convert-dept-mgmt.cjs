const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\zhou.mengjie\\Desktop\\friendly-doors-main0318\\src\\pages\\DeptManagement.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. 更新导入语句
content = content.replace(
  `import { supabase } from "@/integrations/supabase/client";\nimport { getCurrentPhone } from "@/lib/auth";`,
  `import { getCurrentPhone } from "@/lib/auth";\nimport {\n  getMockData,\n  getEnterpriseOrganizations,\n  getEnterpriseMembers,\n  getOrganizationMembers,\n  createOrganization,\n  updateOrganization,\n  deleteOrganization,\n  addMember,\n  updateMember,\n  removeMember,\n  updateUser,\n  createInvitation,\n  acceptInvitation,\n  rejectInvitation,\n  createApiKey,\n  updateApiKey,\n  deleteApiKey,\n} from "@/lib/mockData";`
);

// 2. 替换数据加载 - 第 175-178 行附近
content = content.replace(
  /const \[orgsRes, membersRes, usersRes, entRes\] = await Promise\.all\(\[\s*supabase\.from\("organizations"\)\.select\("\*"\)\.eq\("enterprise_id", enterprise\.id\)\.order\("created_at"\),\s*supabase\.from\("members"\)\.select\("user_phone, role, organization_id"\)\.eq\("enterprise_id", enterprise\.id\),\s*supabase\.from\("users"\)\.select\("phone, name"\),\s*supabase\.from\("enterprises"\)\.select\("balance, total_consumed"\)\.eq\("id", enterprise\.id\)\.maybeSingle\(\),\s*\]\);/,
  `const mockData = getMockData();
    const orgsData = mockData.organizations.filter(o => o.enterprise_id === enterprise.id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const membersData = mockData.members.filter(m => m.enterprise_id === enterprise.id).map(m => ({ user_phone: m.user_phone, role: m.role, organization_id: m.organization_id }));
    const usersData = mockData.users.map(u => ({ phone: u.phone, name: u.name }));
    const entData = mockData.enterprises.find(e => e.id === enterprise.id) || null;`
);

// 3. 替换 toggleStatus 函数
content = content.replace(
  /const toggleStatus = async \(org: Org\) => \{\s*const newStatus = org\.status === "active" \? "disabled" : "active";\s*const \{ error } = await supabase\.from\("organizations"\)\.update\(\{ status: newStatus } as any\)\.eq\("id", org\.id\);\s*if \(error\) \{ toast\(\{ title: "操作失败", variant: "destructive" }\); return; }\s*toast\(\{ title: newStatus === "active" \? "已启用" : "已禁用" }\);\s*load\(\);\s*};/,
  `const toggleStatus = async (org: Org) => {
    const newStatus = org.status === "active" ? "disabled" : "active";
    try {
      await updateOrganization(org.id, { status: newStatus as "active" | "inactive" });
      toast({ title: newStatus === "active" ? "已启用" : "已禁用" });
      load();
    } catch {
      toast({ title: "操作失败", variant: "destructive" });
    }
  };`
);

// 4. 替换 handleDelete 函数
content = content.replace(
  /await supabase\.from\("organizations"\)\.delete\(\)\.eq\("id", deleteOrg\.id\);\s*toast\(\{\s*title: "已删除部门",/,
  `await deleteOrganization(deleteOrg.id);
    toast({
      title: "已删除部门",`
);

// 5. 替换 handleEditName 函数
content = content.replace(
  /await supabase\.from\("organizations"\)\.update\(\{ name: editName\.trim\(\) } as any\)\.eq\("id", editOrg\.id\);\s*toast\(\{ title: "名称已更新" }\);\s*setEditOrg\(null\);/,
  `await updateOrganization(editOrg.id, { name: editName.trim() });
    toast({ title: "名称已更新" });
    setEditOrg(null);`
);

// 6. 替换 setAdmin 相关函数
content = content.replace(
  /await supabase\.from\("organizations"\)\.update\(\{ admin_phone: primaryPhone } as any\)\.eq\("id", setAdminOrg\.id\);/,
  `await updateOrganization(setAdminOrg.id, { admin_phone: primaryPhone });`
);

content = content.replace(
  /await supabase\.from\("members"\)\.update\(\{ role: "org_admin", organization_id: setAdminOrg\.id } as any\)\s*\.eq\("user_phone", phone\)\.eq\("enterprise_id", enterprise\.id\);/,
  `// Update member role for primary admin
        const mockDataForAdmin = getMockData();
        const memberIndex = mockDataForAdmin.members.findIndex(m => m.user_phone === phone && m.enterprise_id === enterprise.id);
        if (memberIndex !== -1) {
          mockDataForAdmin.members[memberIndex].role = "org_admin";
          mockDataForAdmin.members[memberIndex].organization_id = setAdminOrg.id;
          localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockDataForAdmin));
        }`
);

// 7. 替换批量更新预算
content = content.replace(
  /await Promise\.all\(orgs\.map\(org => supabase\.from\("organizations"\)\.update\(\{ monthly_budget: monthlyBudget } as any\)\.eq\("id", org\.id\)\)\);/,
  `const mockDataForBudget = getMockData();
                    for (const org of orgs) {
                      const orgIndex = mockDataForBudget.organizations.findIndex(o => o.id === org.id);
                      if (orgIndex !== -1) {
                        (mockDataForBudget.organizations[orgIndex] as any).monthly_budget = monthlyBudget;
                      }
                    }
                    localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockDataForBudget));`
);

// 8. 替换 fetchMembers 函数中的数据加载
content = content.replace(
  /const \[membersRes, invitationsRes\] = await Promise\.all\(\[\s*supabase\.from\("members"\)\.select\("\*"\)\.eq\("organization_id", orgId\),\s*supabase\.from\("invitations"\)\.select\("\*"\)\.eq\("organization_id", orgId\)\.eq\("status", "pending"\)\.gt\("expires_at", new Date\(\)\.toISOString\(\)\)\.not\("invitee_phone", "is", null\),\s*\]\);/,
  `const mockData = getMockData();
    const membersResData = mockData.members.filter(m => m.organization_id === orgId);
    const invitationsResData = mockData.invitations.filter(
      i => i.organization_id === orgId && i.status === "pending" && new Date(i.expires_at) > new Date() && i.invitee_phone
    );`
);

// 9. 替换获取用户数据部分
content = content.replace(
  /const \{ data: usersData } = await supabase\.from\("users"\)\.select\("phone, name"\)\.in\("phone", phones\);\s*if \(usersData\) \{\s*usersData\.forEach\(u => \{\s*if \(u\.phone\) phoneToName\[u\.phone\] = u\.name \|\| "";\s*\}\);\s*\}/,
  `const mockDataForUsers = getMockData();
    const usersData = mockDataForUsers.users.filter(u => phones.includes(u.phone));
    usersData.forEach(u => {
      if (u.phone) phoneToName[u.phone] = u.name || "";
    });`
);

// 10. 替换删除邀请
content = content.replace(
  /await supabase\.from\("invitations"\)\.delete\(\)\.eq\("id", inviteId\);\s*fetchMembers\(\);/,
  `const mockDataForInvite = getMockData();
    mockDataForInvite.invitations = mockDataForInvite.invitations.filter(i => i.id !== inviteId);
    localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockDataForInvite));
    fetchMembers();`
);

// 11. 替换更新成员角色和备注
content = content.replace(
  /await supabase\.from\("members"\)\.update\(\{ role: editRole }\)\.eq\("id", editMember\.id\);\s*\/\/ Update user remark name\s*if \(editRemark\.trim\(\)\) \{\s*await supabase\.from\("users"\)\.upsert\(\{ phone: editMember\.user_phone, name: editRemark\.trim\(\) }, \{ onConflict: "phone" }\);\s*\}/,
  `const mockDataForEdit = getMockData();
    const memberIdx = mockDataForEdit.members.findIndex(m => m.id === editMember.id);
    if (memberIdx !== -1) {
      mockDataForEdit.members[memberIdx].role = editRole;
    }
    if (editRemark.trim()) {
      const userIdx = mockDataForEdit.users.findIndex(u => u.phone === editMember.user_phone);
      if (userIdx !== -1) {
        mockDataForEdit.users[userIdx].name = editRemark.trim();
      }
    }
    localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockDataForEdit));`
);

// 12. 替换更新成员状态
content = content.replace(
  /await supabase\.from\("members"\)\.update\(\{ status: newStatus }\)\.eq\("id", m\.id\);\s*fetchMembers\(\);/,
  `const mockDataForStatus = getMockData();
    const memberStatusIdx = mockDataForStatus.members.findIndex(mem => mem.id === m.id);
    if (memberStatusIdx !== -1) {
      mockDataForStatus.members[memberStatusIdx].status = newStatus;
      localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockDataForStatus));
    }
    fetchMembers();`
);

// 13. 替换获取 API Keys 数量
content = content.replace(
  /const query = supabase\.from\("api_keys"\)\.select\("\*", \{ count: "exact", head: true }\)\.eq\("owner_phone", memberPhone\) as any;\s*const result: \{ count: number \| null; error: Error \| null } = await query;/,
  `const mockDataForKeys = getMockData();
    const keyCount = mockDataForKeys.api_keys.filter(k => k.owner_phone === memberPhone).length;`
);

// 14. 替换删除成员
content = content.replace(
  /await supabase\.from\("members"\)\.delete\(\)\.eq\("id", deleteMemberConfirm\.id\);\s*setDeleteMemberConfirm\(null\);/,
  `const mockDataForDelete = getMockData();
    mockDataForDelete.members = mockDataForDelete.members.filter(m => m.id !== deleteMemberConfirm.id);
    localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockDataForDelete));
    setDeleteMemberConfirm(null);`
);

// 15. 替换子部门 toggleStatus
content = content.replace(
  /const \{ error } = await supabase\.from\("organizations"\)\.update\(\{ status: newStatus } as any\)\.eq\("id", org\.id\);\s*if \(error\) \{ toast\(\{ title: "操作失败", variant: "destructive" }\); return; }\s*toast\(\{ title: newStatus === "active" \? "已启用" : "已禁用" }\);\s*loadChildOrgs\(parentOrg\.id\);/,
  `try {
      await updateOrganization(org.id, { status: newStatus as "active" | "inactive" });
      toast({ title: newStatus === "active" ? "已启用" : "已禁用" });
      loadChildOrgs(parentOrg.id);
    } catch {
      toast({ title: "操作失败", variant: "destructive" });
    }`
);

// 16. 替换子部门删除
content = content.replace(
  /await supabase\.from\("organizations"\)\.delete\(\)\.eq\("id", childDeleteOrg\.id\);\s*toast\(\{\s*title: "已删除部门",\s*description: recovered > 0 \? `\u00a5\$\{recovered\.toLocaleString\(\)\} 预算已回收` : undefined,\s*\}\);/,
  `await deleteOrganization(childDeleteOrg.id);
    toast({
      title: "已删除部门",
      description: recovered > 0 ? `¥${recovered.toLocaleString()} 预算已回收` : undefined,
    });`
);

// 17. 替换子部门编辑名称
content = content.replace(
  /await supabase\.from\("organizations"\)\.update\(\{ name: childEditName\.trim\(\) } as any\)\.eq\("id", childEditOrg\.id\);\s*toast\(\{ title: "名称已更新" }\);/,
  `await updateOrganization(childEditOrg.id, { name: childEditName.trim() });
    toast({ title: "名称已更新" });`
);

// 18. 替换子部门设置管理员
content = content.replace(
  /await supabase\.from\("organizations"\)\.update\(\{ admin_phone: primaryPhone } as any\)\.eq\("id", childSetAdminOrg\.id\);/,
  `await updateOrganization(childSetAdminOrg.id, { admin_phone: primaryPhone });`
);

content = content.replace(
  /await supabase\.from\("members"\)\.update\(\{ role: "org_admin", organization_id: childSetAdminOrg\.id } as any\)\s*\.eq\("user_phone", phone\)\.eq\("enterprise_id", enterprise\.id\);/,
  `// Update member role
        const mockDataChildAdmin = getMockData();
        const childMemberIdx = mockDataChildAdmin.members.findIndex(m => m.user_phone === phone && m.enterprise_id === enterprise.id);
        if (childMemberIdx !== -1) {
          mockDataChildAdmin.members[childMemberIdx].role = "org_admin";
          mockDataChildAdmin.members[childMemberIdx].organization_id = childSetAdminOrg.id;
          localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockDataChildAdmin));
        }`
);

// 19. 替换获取所有用户
content = content.replace(
  /const \{ data } = await supabase\.from\("users"\)\.select\("id, phone, name"\);\s*if \(data\) \{\s*const map: Record<string, string> = {};\s*data\.forEach\(u => \{\s*if \(u\.phone\) map\[u\.phone\] = u\.name \|\| u\.phone;\s*\}\);\s*setAllUsersMap\(map\);\s*\}/,
  `const mockDataAllUsers = getMockData();
    const map: Record<string, string> = {};
    mockDataAllUsers.users.forEach(u => {
      if (u.phone) map[u.phone] = u.name || u.phone;
    });
    setAllUsersMap(map);`
);

// 20. 替换添加成员逻辑
content = content.replace(
  /const \{ data: existing } = await supabase\.from\("members"\)\.select\("id, organization_id"\)\.eq\("enterprise_id", enterprise\.id\)\.eq\("user_phone", memberPhone\)\.maybeSingle\(\);\s*if \(existing\) \{/,
  `const mockDataExisting = getMockData();
    const existing = mockDataExisting.members.find(m => m.enterprise_id === enterprise.id && m.user_phone === memberPhone);
    if (existing) {`
);

content = content.replace(
  /await supabase\.from\("members"\)\.insert\(\{ enterprise_id: enterprise\.id, organization_id: orgId, user_phone: memberPhone, role: memberRole, daily_limit: Number\(memberLimit\), status: "active" }\);/,
  `await addMember({
        enterprise_id: enterprise.id,
        organization_id: orgId,
        user_phone: memberPhone,
        role: memberRole,
        daily_limit: Number(memberLimit),
        status: "active"
      });`
);

content = content.replace(
  /await supabase\.from\("invitations"\)\.insert\(\{ enterprise_id: enterprise\.id, organization_id: orgId, inviter_phone: phone \?\? "", invitee_phone: memberPhone, invited_role: memberRole }\);/,
  `await createInvitation({
        enterprise_id: enterprise.id,
        organization_id: orgId,
        inviter_phone: phone ?? "",
        invitee_phone: memberPhone,
        invited_role: memberRole,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });`
);

content = content.replace(
  /if \(memberName\.trim\(\)\) await supabase\.from\("users"\)\.upsert\(\{ phone: memberPhone, name: memberName\.trim\(\) }, \{ onConflict: "phone" }\);/,
  `if (memberName.trim()) {
      const mockDataUser = getMockData();
      const userIdx = mockDataUser.users.findIndex(u => u.phone === memberPhone);
      if (userIdx !== -1) {
        mockDataUser.users[userIdx].name = memberName.trim();
      } else {
        mockDataUser.users.push({
          id: Math.random().toString(36).substring(2),
          phone: memberPhone,
          name: memberName.trim(),
          created_at: new Date().toISOString()
        });
      }
      localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockDataUser));
    }`
);

// 21. 替换更新成员额度
content = content.replace(
  /await supabase\.from\("members"\)\.update\(\{ daily_limit: val }\)\.eq\("id", m\.id\);\s*setMembers\(prev => prev\.map\(x => x\.id === m\.id \? \{ \.\.\.x, daily_limit: val } : x\)\);/,
  `const mockDataLimit = getMockData();
    const limitIdx = mockDataLimit.members.findIndex(mem => mem.id === m.id);
    if (limitIdx !== -1) {
      mockDataLimit.members[limitIdx].daily_limit = val;
      localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockDataLimit));
    }
    setMembers(prev => prev.map(x => x.id === m.id ? { ...x, daily_limit: val } : x));`
);

// 22. 替换批量插入成员
content = content.replace(
  /await supabase\.from\("members"\)\.insert\(\{\s*enterprise_id: enterprise\.id,/,
  `await addMember({
                      enterprise_id: enterprise.id,`
);

// 23. 替换获取企业成员列表
content = content.replace(
  /const \{ data } = await supabase\.from\("members"\)\.select\("user_phone, role, organization_id"\)\.eq\("enterprise_id", enterprise\.id\);\s*if \(data\) setEnterpriseMembers\(data as any\);/,
  `const mockDataEntMembers = getMockData();
    const entMembersData = mockDataEntMembers.members.filter(m => m.enterprise_id === enterprise.id).map(m => ({ user_phone: m.user_phone, role: m.role, organization_id: m.organization_id }));
    setEnterpriseMembers(entMembersData as any);`
);

// 24. 替换创建子部门
content = content.replace(
  /const \{ data: newOrg, error: orgError } = await supabase\.from\("organizations"\)\.insert\(\{\s*enterprise_id: enterprise\.id,\s*name: childOrgName\.trim\(\),\s*parent_id: parentOrg\.id,\s*level: \(parentOrg\.level \|\| 1\) \+ 1,\s*path: `\$\{parentOrg\.path \|\| parentOrg\.id\}\.\$\{Date\.now\(\)\}`,\s*monthly_budget: childMonthlyBudget \? Number\(childMonthlyBudget\) : null,\s*admin_phone: childOrgAdminPhone,\s*status: "active",\s*created_at: new Date\(\)\.toISOString\(\),\s*updated_at: new Date\(\)\.toISOString\(\),\s*}\)\.select\(\)\.single\(\);/,
  `const newOrg = await createOrganization(enterprise.id, childOrgName.trim(), parentOrg.id, {
                monthly_budget: childMonthlyBudget ? Number(childMonthlyBudget) : null,
                admin_phone: childOrgAdminPhone,
                status: "active"
              });`
);

content = content.replace(
  /await supabase\.from\("members"\)\s*\.update\(\{ role: "org_admin" } as any\)\s*\.eq\("user_phone", childOrgAdminPhone\)\s*\.eq\("enterprise_id", enterprise\.id\);/,
  `const mockDataUpdateRole = getMockData();
                  const updateRoleIdx = mockDataUpdateRole.members.findIndex(m => m.user_phone === childOrgAdminPhone && m.enterprise_id === enterprise.id);
                  if (updateRoleIdx !== -1) {
                    mockDataUpdateRole.members[updateRoleIdx].role = "org_admin";
                    localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockDataUpdateRole));
                  }`
);

content = content.replace(
  /await supabase\.from\("members"\)\.insert\(\{\s*enterprise_id: enterprise\.id,\s*organization_id: newOrg\.id,\s*user_phone: childOrgAdminPhone,\s*role: "org_admin",\s*status: "active",\s*daily_limit: childDailyLimit \? Number\(childDailyLimit\) : 1000,\s*}\);/,
  `await addMember({
                    enterprise_id: enterprise.id,
                    organization_id: newOrg.id,
                    user_phone: childOrgAdminPhone,
                    role: "org_admin",
                    status: "active",
                    daily_limit: childDailyLimit ? Number(childDailyLimit) : 1000,
                  });`
);

// 25. 替换批量更新成员额度
content = content.replace(
  /await Promise\.all\(members\.map\(m => supabase\.from\("members"\)\.update\(\{ daily_limit: dailyLimitNum }\)\.eq\("id", m\.id\)\)\);\s*setMembers\(prev => prev\.map\(m => \(\{ \.\.\.m, daily_limit: dailyLimitNum }\)\)\);/,
  `const mockDataBatch = getMockData();
                    for (const m of members) {
                      const batchIdx = mockDataBatch.members.findIndex(mem => mem.id === m.id);
                      if (batchIdx !== -1) {
                        mockDataBatch.members[batchIdx].daily_limit = dailyLimitNum;
                      }
                    }
                    localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockDataBatch));
                    setMembers(prev => prev.map(m => ({ ...m, daily_limit: dailyLimitNum })));`
);

// 26. 替换单个成员额度更新
content = content.replace(
  /supabase\.from\("members"\)\.update\(\{ daily_limit: dailyLimit }\)\.eq\("id", m\.id\)/,
  `updateMember(m.id, { daily_limit: dailyLimit })`
);

// 27. 替换第二个数据加载位置
content = content.replace(
  /const \[membersRes2, usersRes2\] = await Promise\.all\(\[\s*supabase\.from\("members"\)\.select\("user_phone, role, organization_id"\)\.eq\("enterprise_id", enterprise\.id\),\s*supabase\.from\("users"\)\.select\("phone, name"\),\s*\]\);/,
  `const mockData2 = getMockData();
    const membersRes2Data = mockData2.members.filter(m => m.enterprise_id === enterprise.id).map(m => ({ user_phone: m.user_phone, role: m.role, organization_id: m.organization_id }));
    const usersRes2Data = mockData2.users.map(u => ({ phone: u.phone, name: u.name }));`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('DeptManagement.tsx converted successfully!');
