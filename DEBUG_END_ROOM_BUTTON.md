# 调试"结束房间"按钮问题

请在微信开发者工具的 **Console** 中依次执行以下命令，然后告诉我输出结果：

## 第1步：检查页面数据

```javascript
// 获取当前页面实例
const pages = getCurrentPages();
const currentPage = pages[pages.length - 1];

// 检查关键数据
console.log('=== 页面数据检查 ===');
console.log('isCreator:', currentPage.data.isCreator);
console.log('room.status:', currentPage.data.room?.status);
console.log('myOpenid:', currentPage.data.myOpenid);
console.log('room._openid:', currentPage.data.room?._openid);
console.log('myHasLeft:', currentPage.data.myHasLeft);
console.log('');
console.log('按钮显示条件计算:');
console.log('结束房间按钮应该显示:', currentPage.data.isCreator && currentPage.data.room?.status === 'active');
console.log('退出房间按钮应该显示:', !currentPage.data.isCreator && currentPage.data.room?.status === 'active' && !currentPage.data.myHasLeft);
```

## 第2步：检查房间成员

```javascript
console.log('=== 房间成员检查 ===');
console.log('成员列表:', currentPage.data.room?.members);
console.log('成员数量:', currentPage.data.room?.members?.length);

// 找到自己
const myMember = currentPage.data.room?.members?.find(m => m.openid === currentPage.data.myOpenid);
console.log('我的成员信息:', myMember);
console.log('我的角色:', myMember?.role);
```

## 第3步：手动触发数据更新

如果上面显示 `isCreator` 为 `false` 或 `undefined`，请运行：

```javascript
// 手动修正isCreator
const currentPage = getCurrentPages()[getCurrentPages().length - 1];
const isCreator = currentPage.data.room._openid === currentPage.data.myOpenid;

console.log('手动计算的isCreator:', isCreator);

// 更新页面数据
currentPage.setData({
  isCreator: isCreator
});

console.log('已更新isCreator，请查看页面按钮是否显示');
```

## 第4步：查看DOM元素

```javascript
// 查询按钮元素
const query = wx.createSelectorQuery();
query.selectAll('.action-btn').boundingClientRect();
query.exec(res => {
  console.log('=== 页面按钮元素 ===');
  console.log('找到的按钮数量:', res[0]?.length);
  res[0]?.forEach((btn, idx) => {
    console.log(`按钮${idx + 1} 位置:`, btn);
  });
});
```

---

## 预期结果

**如果是房主，应该看到：**
```
isCreator: true
room.status: active
结束房间按钮应该显示: true
退出房间按钮应该显示: false
```

**如果是普通成员，应该看到：**
```
isCreator: false
room.status: active
结束房间按钮应该显示: false
退出房间按钮应该显示: true
```

---

## 可能的问题

### 问题1：isCreator为false
**原因:** Watch更新后没有正确设置
**解决:** 运行第3步手动修正

### 问题2：myOpenid不匹配
**原因:** OpenID获取错误
**解决:** 检查登录逻辑

### 问题3：缓存问题
**原因:** 小程序缓存了旧代码
**解决:**
1. 点击"编译"按钮旁边的下拉箭头
2. 选择"清除缓存" → "清除数据缓存"
3. 重新编译

---

## 临时解决方案

如果急需测试，可以在Console中手动修正：

```javascript
// 临时强制显示结束按钮
const currentPage = getCurrentPages()[getCurrentPages().length - 1];
currentPage.setData({
  isCreator: true
});
console.log('已临时设置为房主');
```

---

请执行以上命令并告诉我输出结果，我会帮你诊断问题！
