# 分享平台接口文档

## 概述

分享平台功能允许管理员配置系统的分享内容,包括分享标题、描述、图片、链接等信息。这些配置可用于社交媒体分享和平台推广。

客户端可以通过公开接口获取这些配置信息,用于实现分享功能。

## 接口列表

### 客户端接口

#### 1. 获取分享内容设置（客户端）

获取当前系统的分享内容配置,供客户端使用。

**接口地址**
```
GET /settings/share/config
```

**权限要求**
- 需要用户登录
- 需要在请求头中携带有效的 JWT Token

**请求参数**

无

**请求示例**
```bash
curl -X GET "http://localhost:3000/settings/share/config" \
  -H "Authorization: Bearer <user_token>"
```

**响应示例**

成功响应 (200 OK):
```json
{
  "data": {
    "title": "加密货币模拟交易平台",
    "description": "体验真实的加密货币交易环境",
    "image": "https://example.com/share-image.jpg",
    "url": "https://example.com",
    "hashtags": ["crypto", "trading", "simulation"],
    "content": "在这里你可以体验真实的加密货币交易\n无风险学习交易技巧\n立即加入我们!"
  }
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| data.title | string | 分享标题 |
| data.description | string | 分享描述 |
| data.image | string | 分享图片 URL |
| data.url | string | 分享链接 |
| data.hashtags | string[] | 话题标签数组 |
| data.content | string | 分享平台文案(支持多行,保留换行格式) |

**默认值**

如果未配置,返回以下默认值:
```json
{
  "data": {
    "content": "",
    "url": ""
  }
}
```

**错误响应**

401 Unauthorized - 未登录:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

### 管理端接口

#### 2. 获取分享内容设置（管理端）

获取当前系统的分享内容配置（管理员专用）。

**接口地址**
```
GET /admin/settings/share/config
```

**权限要求**
- 需要管理员权限 (`admin` 角色)
- 需要在请求头中携带有效的 JWT Token

**请求参数**

无

**请求示例**
```bash
curl -X GET "http://localhost:3000/admin/settings/share/config" \
  -H "Authorization: Bearer <admin_token>"
```

**响应示例**

成功响应 (200 OK):
```json
{
  "data": {
    "title": "加密货币模拟交易平台",
    "description": "体验真实的加密货币交易环境",
    "image": "https://example.com/share-image.jpg",
    "url": "https://example.com",
    "hashtags": ["crypto", "trading", "simulation"],
    "content": "在这里你可以体验真实的加密货币交易\n无风险学习交易技巧\n立即加入我们!"
  }
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| data.title | string | 分享标题 |
| data.description | string | 分享描述 |
| data.image | string | 分享图片 URL |
| data.url | string | 分享链接 |
| data.hashtags | string[] | 话题标签数组 |
| data.content | string | 分享平台文案(支持多行,保留换行格式) |

**默认值**

如果未配置,返回以下默认值:
```json
{
  "data": {
    "content": "",
    "url": ""
  }
}
```

---

#### 3. 更新分享内容设置（管理端）

更新系统的分享内容配置（管理员专用）。

**接口地址**
```
PUT /admin/settings/share/config
```

**权限要求**
- 需要管理员权限 (`admin` 角色)
- 需要在请求头中携带有效的 JWT Token

**请求参数**

Content-Type: `application/json`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| config | object | 是 | 分享配置对象 |
| config.title | string | 否 | 分享标题 |
| config.description | string | 否 | 分享描述 |
| config.image | string | 否 | 分享图片 URL |
| config.url | string | 否 | 分享链接 |
| config.hashtags | string[] | 否 | 话题标签数组 |
| config.content | string | 否 | 分享平台文案(支持多行) |

**请求示例**
```bash
curl -X PUT "http://localhost:3000/admin/settings/share/config" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "title": "加密货币模拟交易平台",
      "description": "体验真实的加密货币交易环境,零风险学习交易技巧",
      "image": "https://example.com/images/share-banner.jpg",
      "url": "https://example.com/register",
      "hashtags": ["crypto", "trading", "bitcoin", "simulation"],
      "content": "🚀 加密货币模拟交易平台\n\n✅ 真实市场数据\n✅ 零风险交易体验\n✅ 专业交易工具\n\n立即注册,开启你的交易之旅!"
    }
  }'
```

**响应示例**

成功响应 (200 OK):
```json
{
  "message": "分享内容设置已更新"
}
```

**错误响应**

401 Unauthorized - 未授权:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

403 Forbidden - 权限不足:
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

400 Bad Request - 请求参数错误:
```json
{
  "statusCode": 400,
  "message": ["config must be an object"],
  "error": "Bad Request"
}
```

---

## 使用场景

### 1. 社交媒体分享

配置的分享内容可用于:
- 微信/微博/Twitter 等社交平台分享
- Open Graph 标签配置
- Twitter Card 配置

### 2. 推广活动

利用 `content` 字段配置多行文案,用于:
- 活动推广文案
- 用户邀请链接分享
- 平台功能介绍

### 3. SEO 优化

通过配置 `title` 和 `description` 优化:
- 搜索引擎展示
- 社交媒体预览
- 链接分享预览

---

## 注意事项

1. **图片要求**
   - `image` 字段应使用 HTTPS 链接
   - 建议图片尺寸: 1200x630 像素
   - 支持的格式: JPG, PNG, WebP

2. **文案格式**
   - `content` 字段支持换行符 `\n`
   - 建议控制文案长度,避免过长
   - 可使用 emoji 增强视觉效果

3. **话题标签**
   - `hashtags` 数组不需要包含 `#` 符号
   - 建议 3-5 个相关标签
   - 标签应与平台内容相关

4. **链接配置**
   - `url` 应该是完整的 URL (包含协议)
   - 建议使用短链接服务优化用户体验
   - 可添加 UTM 参数追踪来源

---

## 完整使用示例

### JavaScript/TypeScript

```typescript
// 获取分享配置
async function getShareConfig(token: string) {
  const response = await fetch('http://localhost:3000/admin/settings/share/config', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data.data;
}

// 更新分享配置
async function updateShareConfig(token: string, config: ShareConfig) {
  const response = await fetch('http://localhost:3000/admin/settings/share/config', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ config }),
  });

  return await response.json();
}

// 使用示例
const shareConfig = {
  title: '加密货币模拟交易平台',
  description: '体验真实的加密货币交易环境',
  image: 'https://example.com/share.jpg',
  url: 'https://example.com',
  hashtags: ['crypto', 'trading'],
  content: '立即体验\n零风险交易',
};

await updateShareConfig(adminToken, shareConfig);
```

### Python

```python
import requests

# 获取分享配置
def get_share_config(token):
    response = requests.get(
        'http://localhost:3000/admin/settings/share/config',
        headers={'Authorization': f'Bearer {token}'}
    )
    return response.json()['data']

# 更新分享配置
def update_share_config(token, config):
    response = requests.put(
        'http://localhost:3000/admin/settings/share/config',
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        },
        json={'config': config}
    )
    return response.json()

# 使用示例
share_config = {
    'title': '加密货币模拟交易平台',
    'description': '体验真实的加密货币交易环境',
    'image': 'https://example.com/share.jpg',
    'url': 'https://example.com',
    'hashtags': ['crypto', 'trading'],
    'content': '立即体验\n零风险交易'
}

result = update_share_config(admin_token, share_config)
print(result)
```

---

## 相关接口

- [系统设置接口文档](./settings-api.md) - 查看其他系统设置接口
- [管理员认证接口](./admin-auth-api.md) - 了解如何获取管理员 Token

---

## 更新日志

| 日期 | 版本 | 说明 |
|------|------|------|
| 2025-11-23 | 1.0.0 | 初始版本 |
