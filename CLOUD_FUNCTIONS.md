# 云函数部署指南

## 当前状态

⚠️ **云函数未部署** - 项目正在使用临时 Mock 数据

当前 `login` 云函数返回临时 openid，格式: `mock_<timestamp>`

## 如何部署云函数

### 前置条件

1. ✅ 已开通云开发
2. ✅ 已创建云开发环境
3. ✅ 已配置 project.config.json 中的云函数目录

### 部署步骤

#### 方法一：使用微信开发者工具（推荐）

1. **在项目根目录添加云函数配置**

   编辑 `project.config.json`，添加：
   ```json
   {
     "cloudfunctionRoot": "cloudfunctions/"
   }
   ```

2. **在开发者工具中右键云函数目录**
   ```
   cloudfunctions/
   ├── login/          ← 右键这个文件夹
   ├── createRoom/
   └── joinRoom/
   ```

3. **选择"上传并部署：云端安装依赖"**
   - 会自动上传代码
   - 会自动安装 `wx-server-sdk` 依赖
   - 等待部署完成（约 30-60 秒）

4. **重复操作部署其他云函数**
   - createRoom
   - joinRoom

#### 方法二：使用命令行

```bash
# 安装云开发 CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署所有云函数
tcb functions:deploy login
tcb functions:deploy createRoom
tcb functions:deploy joinRoom
```

### 验证部署

1. **在云开发控制台查看**
   - 打开云开发控制台
   - 点击"云函数"标签
   - 应该看到 3 个云函数：login, createRoom, joinRoom

2. **测试云函数**
   - 在控制台点击"测试"
   - 输入测试参数
   - 查看返回结果

## 已创建的云函数

### 1. login
**位置**: `cloudfunctions/login/`
**功能**: 获取用户 openid
**返回**:
```json
{
  "openid": "xxx",
  "appid": "xxx",
  "unionid": "xxx"
}
```

### 2. createRoom
**位置**: `cloudfunctions/createRoom/`
**功能**: 创建房间
**参数**:
```json
{
  "roomName": "周末麻将局",
  "gameType": "majiang",
  "settlementMode": "score",
  "basePoint": 10
}
```
**返回**:
```json
{
  "success": true,
  "roomId": "xxx",
  "inviteCode": "ABC123"
}
```

### 3. joinRoom
**位置**: `cloudfunctions/joinRoom/`
**功能**: 加入房间
**参数**:
```json
{
  "inviteCode": "ABC123"
}
```
**返回**:
```json
{
  "success": true,
  "roomId": "xxx"
}
```

## 临时方案（当前使用）

在云函数部署前，项目使用以下临时方案：

### Mock OpenID
```typescript
// cloud.service.ts
public async login(): Promise<{ openid: string }> {
  try {
    const result = await this.callFunction('login', {});
    if (result.openid) {
      return { openid: result.openid };
    }
  } catch (err) {
    console.warn('云函数未部署，使用临时方案');
  }

  // 使用临时 openid
  const mockOpenid = 'mock_' + Date.now();
  return { openid: mockOpenid };
}
```

### 限制

使用临时方案时：
- ✅ 可以创建用户
- ✅ 可以创建房间
- ✅ 可以添加记录
- ⚠️ 每次启动都是新用户（openid 不同）
- ⚠️ 无法多设备同步（openid 不同）
- ⚠️ 无法使用微信身份

## 切换到正式方案

部署云函数后，代码会自动切换到正式方案：

1. 移除临时代码（可选）
2. 重新编译
3. 每次启动会调用真实的 login 云函数
4. 获取真实的微信 openid
5. 支持多设备同步

## 注意事项

1. **环境 ID 配置**

   确保 `project.config.json` 中配置了云开发环境 ID：
   ```json
   {
     "cloudfunctionRoot": "cloudfunctions/",
     "cloudbaseRoot": "cloudbase/",
     "cloudbaseConfig": {
       "env": "your-env-id"
     }
   }
   ```

2. **云函数权限**

   云函数会自动继承调用者的身份，`_openid` 会自动填充

3. **依赖安装**

   首次部署选择"云端安装依赖"，确保 `wx-server-sdk` 正确安装

4. **更新云函数**

   修改代码后，需要重新右键部署

## 常见问题

### Q: 云函数部署失败？
A: 检查网络连接，确保已登录微信开发者工具

### Q: 调用云函数返回 -501000 错误？
A: 云函数未部署或未上传，右键云函数目录重新部署

### Q: 云函数调用超时？
A: 检查云函数代码是否有死循环，或增加超时时间

### Q: 能否本地调试云函数？
A: 可以，在开发者工具中右键云函数 → "本地调试"

## 下一步

1. 配置 `project.config.json` 添加 `cloudfunctionRoot`
2. 在开发者工具中右键部署 3 个云函数
3. 刷新小程序，应该就能正常获取 openid 了
4. 可以删除 `cloud.service.ts` 中的临时方案代码
