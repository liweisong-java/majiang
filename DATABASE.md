# 数据库集合配置说明

本项目使用微信云开发数据库，需要在云开发控制台手动创建以下集合。

## 前置条件

1. 在微信开发者工具中开通云开发
2. 获取云开发环境 ID
3. 进入云开发控制台 - 数据库

## 需要创建的集合

### 1. users - 用户表

**集合名称**: `users`

**权限设置**:
```json
{
  "read": true,
  "write": "doc._openid == auth.openid"
}
```

**索引**:
- `_openid`: 唯一索引

**字段说明**:
```typescript
{
  _id: string,              // 自动生成
  _openid: string,          // 自动填充
  nickname: string,         // 昵称
  avatarUrl: string,        // 头像 URL
  stats: {
    totalGames: number,     // 总场次
    totalWins: number,      // 胜场
    totalLosses: number,    // 负场
    totalScoreChange: number, // 总积分变化
    totalMoneyChange: number  // 总金额变化
  },
  createdAt: Date,          // 创建时间
  updatedAt: Date           // 更新时间
}
```

---

### 2. rooms - 房间表

**集合名称**: `rooms`

**权限设置**:
```json
{
  "read": true,
  "write": "doc._openid == auth.openid || get('database.rooms.${doc._id}').data[0].members[].openid.includes(auth.openid)"
}
```

**索引**:
- `_openid`: 普通索引
- `inviteCode`: 唯一索引
- `status`: 普通索引
- `createdAt`: 降序索引

**字段说明**:
```typescript
{
  _id: string,
  _openid: string,          // 房主 OpenID
  roomName: string,         // 房间名称
  gameType: 'majiang' | 'poker' | 'doudizhu' | 'other',
  settlementMode: 'score' | 'money',
  basePoint: number,        // 记分制底分（可选）
  status: 'active' | 'settled' | 'archived',
  members: [{
    openid: string,
    nickname: string,
    avatarUrl: string,
    role: 'creator' | 'member',
    currentBalance: number  // 当前累计积分/金额
  }],
  inviteCode: string,       // 6位邀请码
  qrCodeUrl: string,        // 二维码图片URL（可选）
  totalRounds: number,      // 总局数
  createdAt: Date,
  settledAt: Date           // 结算时间（可选）
}
```

---

### 3. game_records - 游戏记录表

**集合名称**: `game_records`

**权限设置**:
```json
{
  "read": true,
  "write": "get('database.rooms.${doc.roomId}').data[0].members[].openid.includes(auth.openid)"
}
```

**索引**:
- `roomId`: 普通索引
- `playedAt`: 降序索引

**字段说明**:
```typescript
{
  _id: string,
  roomId: string,           // 房间ID
  roundNumber: number,      // 第几局
  scores: [{
    openid: string,
    nickname: string,
    scoreChange: number,    // 本局变化（正负）
    note: string            // 备注（可选）
  }],
  isBalanced: boolean,      // 总和是否为0
  playedAt: Date            // 游戏时间
}
```

---

### 4. friends - 牌友关系表

**集合名称**: `friends`

**权限设置**:
```json
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```

**索引**:
- `_openid`: 普通索引
- `friendOpenid`: 普通索引
- `frequency`: 降序索引（用于排序常用牌友）

**字段说明**:
```typescript
{
  _id: string,
  _openid: string,          // 用户 OpenID
  friendOpenid: string,     // 牌友 OpenID
  friendNickname: string,
  friendAvatarUrl: string,
  frequency: number,        // 一起打过的场次
  stats: {
    gamesPlayed: number,
    wins: number,
    losses: number,
    totalScoreChange: number
  },
  lastPlayedAt: Date,       // 最后一次对局时间
  addedAt: Date             // 添加时间
}
```

---

### 5. personal_records - 个人记账表

**集合名称**: `personal_records`

**权限设置**:
```json
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```

**索引**:
- `_openid`: 普通索引
- `playedAt`: 降序索引

**字段说明**:
```typescript
{
  _id: string,
  _openid: string,
  gameType: string,         // 游戏类型（自定义）
  settlementMode: 'score' | 'money',
  players: [{
    name: string,           // 纯文本，非关联用户
    finalScore: number
  }],
  playedAt: Date,
  note: string              // 备注（可选）
}
```

---

## 创建步骤

1. 登录微信开发者工具
2. 打开云开发控制台（点击工具栏的"云开发"按钮）
3. 进入"数据库"标签
4. 依次创建上述 5 个集合
5. 为每个集合设置对应的权限规则
6. 为需要索引的字段创建索引

## 权限说明

- **users**: 所有人可读，用户只能修改自己的数据
- **rooms**: 所有人可读，房主和成员可修改
- **game_records**: 所有人可读，房间成员可写
- **friends**: 只有用户自己可读写
- **personal_records**: 只有用户自己可读写

## 注意事项

1. `_openid` 字段由云开发自动填充，不需要手动设置
2. 索引的创建可以提高查询性能，建议按文档说明创建
3. 权限规则使用 JSON 格式，请仔细检查语法
4. 测试环境可以先设置为所有人可读写，正式环境务必按文档配置

## 环境配置

创建完集合后，需要在 `miniprogram/app.ts` 中配置云开发环境 ID：

```typescript
await cloudService.init('your-env-id'); // 替换为你的云开发环境 ID
```

或者在 `project.config.json` 中配置：

```json
{
  "cloudfunctionRoot": "cloudfunctions/",
  "cloudbaseRoot": "cloudbase/",
  "cloudbaseConfig": {
    "env": "your-env-id"
  }
}
```
