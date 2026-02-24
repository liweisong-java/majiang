# TabBar 图标说明

由于微信小程序 TabBar 需要本地图片文件，我提供以下几种解决方案：

## 方案 1：使用在线工具生成图标（推荐）

访问 https://www.iconfont.cn/ （阿里巴巴矢量图标库）

1. 搜索并下载以下图标：
   - home（首页）
   - game / poker（牌局）
   - team / users（牌友）
   - chart / analytics（统计）

2. 下载为 PNG 格式，尺寸建议 81x81 像素

3. 将图标放置到以下目录：
   ```
   miniprogram/assets/icons/
   ├── home.png
   ├── home-active.png
   ├── room.png
   ├── room-active.png
   ├── friend.png
   ├── friend-active.png
   ├── stats.png
   └── stats-active.png
   ```

4. 恢复 app.json 中的图标配置

## 方案 2：使用 Emoji 替代（临时方案）

在 app.json 中使用文字图标：
```json
{
  "pagePath": "pages/index/index",
  "text": "🏠 首页"
}
```

## 方案 3：保持当前配置（最简单）

当前已移除图标配置，TabBar 显示纯文字，功能完全正常。

## 当前状态

已配置为**纯文字 TabBar**（无图标），配色：
- 默认颜色：#7A7E83（灰色）
- 选中颜色：#2F855A（绿色）
- 背景颜色：#ffffff（白色）

这不影响任何功能使用，你可以：
1. 先使用纯文字版本测试功能
2. 后续再添加图标美化

## 如何添加图标

如果你准备好了图标文件，只需：

1. 创建目录 `miniprogram/assets/icons/`

2. 放入 8 个图标文件（每个 Tab 需要普通态 + 选中态）

3. 更新 app.json，恢复图标配置：
```json
"tabBar": {
  "color": "#7A7E83",
  "selectedColor": "#2F855A",
  "list": [
    {
      "pagePath": "pages/index/index",
      "text": "首页",
      "iconPath": "assets/icons/home.png",
      "selectedIconPath": "assets/icons/home-active.png"
    }
    // ... 其他配置
  ]
}
```

## 图标规范

- 格式：PNG
- 尺寸：81x81 像素
- 大小：< 40KB
- 颜色：普通态灰色，选中态绿色(#2F855A)
