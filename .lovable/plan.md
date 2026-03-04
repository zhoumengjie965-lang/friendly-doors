
## 计划：配置管理扩展 + 系统设置

### 当前状态
配置管理组只有「模型配置」1项，系统分组只有「全局统计」。

### 修改内容

**`src/pages/admin/AdminLayout.tsx`**
- 配置管理分组改为 4 项（按顺序）：渠道管理、模型管理、模型部署、系统设置
- 系统分组保留「全局统计」，移除系统设置（系统设置放配置管理下）
- 新增图标：`Network`（渠道）、`Cpu`（模型管理，已有）、`Layers`（模型部署）、`Settings`（系统设置）
- 新增 4 个路由：`channels`、`models`（已有）、`model-deploy`、`settings`

**新建 3 个空白占位页面**
- `src/pages/admin/AdminChannels.tsx` — 渠道管理（空页）
- `src/pages/admin/AdminModelDeploy.tsx` — 模型部署（空页）
- `src/pages/admin/AdminSettings.tsx` — 系统设置（空页）

每个空页只显示页面标题，无其他内容。

### 导航结果
```text
── 配置管理 ──
  渠道管理     (channels)
  模型管理     (models)
  模型部署     (model-deploy)
  系统设置     (settings)

── 系统 ──
  全局统计     (stats)
```
