# 微信公众号自动发布技能

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D14-green.svg)](https://nodejs.org/)

自动发布微信公众号文章的技能。支持上传封面图、创建草稿、发布文章到微信公众号。可结合Qwen Image自动生成封面图。

## 功能特点

- ✅ 自动获取Access Token
- ✅ 上传封面图片到微信素材库
- ✅ 创建草稿
- ✅ 发布文章（需认证服务号）
- ✅ 支持Qwen Image自动生成封面图
- ✅ 完整的错误处理和日志输出

## 安装

```bash
# 克隆仓库
git clone https://github.com/xiaxia753/wechat-publisher.git

# 复制到你的技能目录
cp -r wechat-publisher /path/to/your/skills/
```

## 前置条件

### 1. 微信公众号配置

需要在微信公众号后台获取：
- **AppID**：公众号唯一标识
- **AppSecret**：公众号密钥

获取位置：微信公众平台 → 设置与开发 → 基本配置

### 2. IP白名单

需要将服务器IP添加到公众号IP白名单：
- 位置：微信公众平台 → 设置与开发 → 基本配置 → IP白名单

### 3. API权限说明

| 功能 | 订阅号 | 认证订阅号 | 服务号 | 认证服务号 |
|------|--------|------------|--------|------------|
| 创建草稿 | ✅ | ✅ | ✅ | ✅ |
| API发布 | ❌ | ❌ | ❌ | ✅ |

**注意**：未认证的订阅号/服务号只能创建草稿，需手动登录后台发布。

## 使用方法

### 命令行调用

```bash
# 发布文章
node scripts/publish.js \
  --appid "your_appid" \
  --secret "your_secret" \
  --title "文章标题" \
  --content "文章HTML内容" \
  --author "作者名" \
  --digest "文章摘要" \
  --cover "/path/to/cover.jpg"
```

### 作为模块调用

```javascript
const WechatAPI = require('./scripts/api');

const api = new WechatAPI('your_appid', 'your_secret');

// 创建草稿
const draft = await api.createDraft({
    title: '文章标题',
    author: '作者',
    content: '<p>HTML内容</p>',
    thumb_media_id: '封面图MEDIA_ID',
    digest: '文章摘要'
});

// 发布文章
const result = await api.publish(draft.media_id);
```

## API文档

### WechatAPI 类

#### 构造函数

```javascript
const api = new WechatAPI(appId, appSecret);
```

#### 方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `getAccessToken()` | 无 | `Promise<string>` | 获取Access Token |
| `uploadImage(imagePath)` | 图片路径 | `Promise<object>` | 上传图片素材 |
| `createDraft(articles)` | 文章对象/数组 | `Promise<object>` | 创建草稿 |
| `publish(mediaId)` | 草稿media_id | `Promise<object>` | 发布文章 |
| `getDraftList(offset, count)` | 偏移量, 数量 | `Promise<object>` | 获取草稿列表 |
| `deleteDraft(mediaId)` | 草稿media_id | `Promise<object>` | 删除草稿 |

### 文章对象结构

```javascript
{
    title: '文章标题',           // 必填
    author: '作者',              // 可选
    content: '<p>HTML内容</p>', // 必填，HTML格式
    thumb_media_id: 'MEDIA_ID', // 必填，封面图素材ID
    digest: '文章摘要',          // 可选
    need_open_comment: 1,       // 可选，是否打开评论
    only_fans_can_comment: 0    // 可选，是否仅粉丝可评论
}
```

## 错误码说明

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 40001 | Access Token无效 | 重新获取Token |
| 40125 | AppSecret错误 | 检查配置 |
| 40164 | IP不在白名单 | 添加IP到白名单 |
| 45009 | 接口调用超过限制 | 减少调用频率 |
| 48001 | API功能未授权 | 需要认证服务号 |

## 目录结构

```
wechat-publisher/
├── SKILL.md           # 技能说明文档
├── README.md          # 项目说明
├── package.json       # NPM配置
├── .gitignore         # Git忽略文件
└── scripts/
    ├── publish.js     # 主发布脚本
    └── api.js         # API封装模块
```

## 依赖

- Node.js >= 14
- 无外部依赖（仅使用Node.js内置模块）

## 注意事项

1. **Access Token有效期2小时**，本模块会自动缓存复用
2. **订阅号只能创建草稿**，需手动登录后台发布
3. **封面图尺寸**：建议900x383像素
4. **文章内容**：支持HTML格式，但部分样式受限
5. **发布频率**：订阅号每天1次，服务号每月4次

## License

MIT License

## 更新记录

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2026-03-09 | 初始版本 |