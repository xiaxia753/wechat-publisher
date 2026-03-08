---
name: wechat-publisher
description: 自动发布微信公众号文章。支持上传封面图、创建草稿、发布文章到微信公众号。可结合Qwen Image自动生成封面图。适用于需要将投资分析报告、文章内容自动发布到微信公众号的场景。
homepage: https://github.com/openclaw/wechat-publisher
metadata:
  openclaw:
    emoji: 📤
    requires:
      bins: [node, curl]
      skills: [qwen-image]
---

# 微信公众号自动发布技能

## 概述

本技能用于将文章自动发布到微信公众号。支持：
- 自动获取Access Token
- 上传封面图片
- 创建草稿
- 发布文章（需认证服务号）
- 结合Qwen Image自动生成封面图

## 触发条件

当用户提出以下需求时触发此技能：
- "发布文章到微信公众号"
- "把报告发到公众号"
- "自动发布公众号文章"
- "微信公众号发布"

## 前置条件

### 1. 微信公众号配置

需要在微信公众号后台获取：
- **AppID**：公众号唯一标识
- **AppSecret**：公众号密钥

获取位置：微信公众平台 → 设置与开发 → 基本配置

### 2. IP白名单

需要将服务器IP添加到公众号IP白名单：
- 位置：微信公众平台 → 设置与开发 → 基本配置 → IP白名单
- 当前服务器IP：`115.206.105.179`

### 3. API权限说明

| 功能 | 订阅号 | 认证订阅号 | 服务号 | 认证服务号 |
|------|--------|------------|--------|------------|
| 创建草稿 | ✅ | ✅ | ✅ | ✅ |
| API发布 | ❌ | ❌ | ❌ | ✅ |

**注意**：未认证的订阅号/服务号只能创建草稿，需手动登录后台发布。

## 使用方法

### 方法一：命令行调用

```bash
# 发布文章（使用默认封面）
node /Users/m/.copaw/active_skills/wechat-publisher/scripts/publish.js \
  --appid "your_appid" \
  --secret "your_secret" \
  --title "文章标题" \
  --content "文章HTML内容" \
  --author "作者名" \
  --digest "文章摘要"

# 使用Qwen Image生成封面图
uv run /Users/m/.copaw/active_skills/wechat-publisher/scripts/generate_cover.py \
  --prompt "专业投资报告封面，深蓝色商务风格" \
  --api-key "your_qwen_api_key"
```

### 方法二：通过AI助手调用

AI助手会自动：
1. 获取Access Token
2. 使用Qwen Image生成封面图
3. 上传封面图到微信
4. 创建草稿
5. 尝试发布（如有权限）

## 配置文件

### 环境变量

在 `~/.openclaw/openclaw.json` 中配置：

```json
{
  "skills": {
    "wechat-publisher": {
      "appId": "wxe7a5dd8bc5645ab9",
      "appSecret": "your_app_secret"
    }
  }
}
```

### 当前配置

| 参数 | 值 |
|------|-----|
| AppID | wxe7a5dd8bc5645ab9 |
| 公众号类型 | 订阅号 |
| API发布权限 | ❌ 无（仅支持创建草稿） |

## API接口

### 1. 获取Access Token

```javascript
GET https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={APPID}&secret={APPSECRET}
```

返回：
```json
{
  "access_token": "ACCESS_TOKEN",
  "expires_in": 7200
}
```

### 2. 上传图片素材

```javascript
POST https://api.weixin.qq.com/cgi-bin/material/add_material?access_token={TOKEN}&type=image
Content-Type: multipart/form-data

返回：
{
  "media_id": "MEDIA_ID",
  "url": "图片URL"
}
```

### 3. 创建草稿

```javascript
POST https://api.weixin.qq.com/cgi-bin/draft/add?access_token={TOKEN}
Content-Type: application/json

{
  "articles": [{
    "title": "标题",
    "author": "作者",
    "content": "HTML内容",
    "thumb_media_id": "封面图MEDIA_ID",
    "digest": "摘要",
    "need_open_comment": 1,
    "only_fans_can_comment": 0
  }]
}
```

### 4. 发布文章

```javascript
POST https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token={TOKEN}
Content-Type: application/json

{
  "media_id": "草稿MEDIA_ID"
}
```

## 发布流程

```
┌─────────────────────────────────────────────────────────────────┐
│  📤 微信公众号文章发布流程                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [1] 获取Access Token                                           │
│       ↓                                                         │
│  [2] 生成/准备封面图                                             │
│       ↓                                                         │
│  [3] 上传封面图到微信                                            │
│       ↓                                                         │
│  [4] 创建草稿                                                    │
│       ↓                                                         │
│  [5] 发布文章（如有权限）                                        │
│       ↓                                                         │
│  [6] 返回结果                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 错误码说明

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 40001 | Access Token无效 | 重新获取Token |
| 40125 | AppSecret错误 | 检查配置 |
| 40164 | IP不在白名单 | 添加IP到白名单 |
| 45009 | 接口调用超过限制 | 减少调用频率 |
| 48001 | API功能未授权 | 需要认证服务号 |

## 注意事项

1. **Access Token有效期2小时**，建议缓存复用
2. **订阅号只能创建草稿**，需手动登录后台发布
3. **封面图尺寸**：建议900x383像素
4. **文章内容**：支持HTML格式，但部分样式受限
5. **发布频率**：订阅号每天1次，服务号每月4次

## 示例用法

### 发布投资分析报告

```javascript
// AI助手调用示例
const result = await publishToWechat({
  title: '家居行业投资价值分析报告（AI生成）',
  author: '奥得赛投资研究',
  content: htmlContent,  // HTML格式文章内容
  digest: '覆盖28家A股家居上市公司...',
  generateCover: true,   // 自动生成封面图
  coverPrompt: '专业投资报告封面，深蓝色商务风格'
});
```

## 相关文件

- `scripts/publish.js` - 主发布脚本
- `scripts/generate_cover.js` - 封面图生成脚本
- `scripts/api.js` - 微信API封装

## 更新记录

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2026-03-09 | 初始版本，支持草稿创建、封面图上传 |