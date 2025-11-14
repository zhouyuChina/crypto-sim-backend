# IP 白名单 API 文档

## 概述

IP 白名单功能允许管理员配置允许访问系统的 IP 地址列表。

## 数据结构

### IpWhitelistConfig

```typescript
{
  enabled: boolean;      // 是否启用 IP 白名单
  ips: string[];        // IP 地址列表（支持单个 IP 或 CIDR 格式）
  description?: string; // 白名单描述
}
```

### IP 格式支持

- 单个 IP：`"127.0.0.1"`
- CIDR 格式：`"192.168.1.0/24"`
- IPv6：`"::1"`

## API 端点

### 1. 获取 IP 白名单设置

获取当前的 IP 白名单配置。

**请求**

```http
GET /api/admin/settings/ip-whitelist
Authorization: Bearer {access_token}
```

**响应**

```json
{
  "data": {
    "data": {
      "enabled": true,
      "ips": [
        "127.0.0.1",
        "192.168.1.0/24",
        "10.0.0.1"
      ],
      "description": "管理后台 IP 白名单"
    }
  }
}
```

**默认值**（未配置时）

```json
{
  "data": {
    "data": {
      "enabled": false,
      "ips": [],
      "description": ""
    }
  }
}
```

### 2. 更新 IP 白名单设置

更新 IP 白名单配置。

**请求**

```http
PUT /api/admin/settings/ip-whitelist
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "config": {
    "enabled": true,
    "description": "管理后台 IP 白名单",
    "ips": [
      "127.0.0.1",
      "192.168.1.0/24",
      "10.0.0.1"
    ]
  }
}
```

**响应**

```json
{
  "data": {
    "message": "IP 白名单设置已更新"
  }
}
```

## 使用示例

### 示例 1：启用 IP 白名单

```bash
curl -X PUT http://localhost:3000/api/admin/settings/ip-whitelist \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "enabled": true,
      "description": "生产环境白名单",
      "ips": [
        "123.45.67.89",
        "192.168.1.0/24"
      ]
    }
  }'
```

### 示例 2：禁用 IP 白名单

```bash
curl -X PUT http://localhost:3000/api/admin/settings/ip-whitelist \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "enabled": false,
      "description": "已禁用",
      "ips": []
    }
  }'
```

### 示例 3：获取当前配置

```bash
curl -X GET http://localhost:3000/api/admin/settings/ip-whitelist \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 数据存储

IP 白名单设置存储在 `SystemSettings` 表中：

- **Key**: `security.ipWhitelist`
- **Category**: `security`
- **Value**: JSON 格式的 `IpWhitelistConfig` 对象

## 权限要求

所有 IP 白名单接口都需要管理员权限（`@Roles('admin')`）。

## 错误处理

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

未提供有效的访问令牌。

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

用户没有管理员权限。

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": ["config must be an object"]
}
```

请求参数格式不正确。

## 相关文件

- **DTO**: `backend/src/settings/dto/update-settings.dto.ts`
- **Controller**: `backend/src/settings/settings.controller.ts`
- **Service**: `backend/src/settings/settings.service.ts`
- **路由**: `GET/PUT /api/admin/settings/ip-whitelist`

## 注意事项

1. **IP 格式验证**：当前版本不包含 IP 格式验证，建议在客户端进行验证
2. **启用后的行为**：启用 IP 白名单后，需要在中间件中实现 IP 检查逻辑
3. **日志记录**：所有 IP 白名单的更新操作都会记录在应用日志中
4. **测试建议**：在生产环境启用前，请确保包含所有必要的 IP 地址，避免锁定自己

## 未来改进

- [ ] 添加 IP 格式验证（IPv4/IPv6/CIDR）
- [ ] 实现 IP 白名单中间件
- [ ] 添加 IP 访问日志
- [ ] 支持 IP 黑名单功能
- [ ] 添加 IP 范围自动检测
