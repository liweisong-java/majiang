# TypeScript 编译配置说明

## 已修复的问题

### 1. 可选链操作符 `?.`
**问题**: 微信小程序的 JavaScript 编译器不支持 ES2020 的可选链操作符

**解决方案**: 使用传统的 && 操作符
```typescript
// ❌ 错误
const status = this.data.room?.status;

// ✅ 正确
const room = this.data.room;
const status = room && room.status;
```

### 2. 空值合并操作符 `??`
**问题**: 不支持 ES2020 的空值合并操作符

**解决方案**: 使用三元表达式或逻辑或
```typescript
// ❌ 错误
const value = data ?? 'default';

// ✅ 正确
const value = data !== null && data !== undefined ? data : 'default';
// 或者（如果不需要区分 null 和 undefined）
const value = data || 'default';
```

### 3. WXML 中的复杂表达式
**问题**: WXML 不支持复杂的 JavaScript 方法调用

**解决方案**: 在 TS 中预计算，WXML 中只使用简单表达式
```typescript
// ❌ 错误 (在 WXML 中)
{{items.findIndex(item => item.id === currentId)}}

// ✅ 正确
// TS 中
data: {
  currentIndex: 0
}
onSelect(e) {
  const index = parseInt(e.detail.value);
  this.setData({ currentIndex: index });
}

// WXML 中
{{items[currentIndex].name}}
```

## TypeScript 配置

当前 `tsconfig.json` 配置为：
```json
{
  "compilerOptions": {
    "target": "ES2015",
    "module": "CommonJS",
    "strict": true
  }
}
```

如果遇到编译错误，确保：
1. 不使用 ES2020+ 的语法特性
2. 使用 ES2015 (ES6) 兼容的语法
3. 避免在 WXML 中使用复杂表达式

## 常见 ES2015 安全语法

✅ 可以使用：
- `const` / `let`
- 箭头函数 `=>`
- 模板字符串 `` `${var}` ``
- 解构赋值 `const { a, b } = obj`
- 扩展运算符 `...array`
- Promise / async / await
- 类 `class`

❌ 不要使用：
- 可选链 `?.`
- 空值合并 `??`
- 私有字段 `#field`
- 逻辑赋值 `??=` `&&=` `||=`

## 如果遇到编译错误

1. 查看错误信息中的文件名和行号
2. 检查是否使用了不支持的语法
3. 改写为 ES2015 兼容的代码
4. 重新编译
