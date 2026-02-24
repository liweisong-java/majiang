# 云开发初始化问题修复

## 问题描述

**错误**: `Error: 云开发未初始化`

**原因**: Service 类在构造函数中立即调用 `cloudService.getDatabase()`，但此时云开发还没有初始化（app.ts 的 `onLaunch` 还没执行完）。

## 解决方案

使用**延迟初始化**模式：
1. 将 `db` 字段设置为可空类型
2. 添加 `getDb()` 私有方法，首次调用时才获取数据库实例
3. 所有使用 `this.db` 的地方改为 `this.getDb()`

## 修复的文件

### 1. user.service.ts
```typescript
// 修复前
private db: DB.Database;
private constructor() {
  this.db = cloudService.getDatabase(); // ❌ 云开发未初始化
}

// 修复后
private db: DB.Database | null;
private constructor() {
  this.db = null;
}

private getDb(): DB.Database {
  if (!this.db) {
    this.db = cloudService.getDatabase(); // ✅ 延迟到实际使用时
  }
  return this.db;
}
```

### 2. room.service.ts
✅ 相同的修复方案

### 3. record.service.ts
✅ 相同的修复方案

### 4. friend.service.ts
✅ 相同的修复方案

### 5. stats.service.ts
✅ 相同的修复方案

## 工作原理

### 初始化流程

```
1. 小程序启动
   ↓
2. 加载 Service 类（单例模式）
   - 此时构造函数执行
   - db = null（不调用 getDatabase）
   ↓
3. app.onLaunch() 执行
   - cloudService.init() 初始化云开发
   ↓
4. 页面调用 Service 方法
   - getDb() 首次调用
   - 获取数据库实例并缓存
   ↓
5. 后续调用
   - 直接使用缓存的 db 实例
```

### 关键点

- **延迟初始化**: 不在构造函数中获取 db，而是在第一次使用时
- **单例缓存**: 一旦获取成功，就缓存起来，避免重复调用
- **类型安全**: 使用 `| null` 类型，明确表示可能未初始化

## 测试验证

修复后的执行顺序：

1. ✅ Service 类加载成功（构造函数不报错）
2. ✅ app.onLaunch() 初始化云开发
3. ✅ 页面调用 userService.getCurrentUser()
4. ✅ getDb() 成功获取数据库实例
5. ✅ 正常查询和操作数据

## 最佳实践

对于依赖运行时初始化的资源（如云开发、数据库、第三方 SDK），应该：

1. **避免在构造函数中初始化**
   - 构造函数执行时机不可控
   - 可能早于必要的初始化步骤

2. **使用延迟初始化**
   - 首次使用时才初始化
   - 确保依赖项已就绪

3. **缓存已初始化的实例**
   - 避免重复初始化
   - 提高性能

4. **合适的类型标注**
   - 使用 `T | null` 表示可能未初始化
   - 使用私有方法隐藏初始化细节

## 注意事项

- 所有 Service 类都使用单例模式
- `getDb()` 方法是私有的，外部无法访问
- 第一次数据库操作会稍慢（需要初始化），之后都是缓存访问
- 如果云开发初始化失败，会在首次 getDb() 时抛出错误
