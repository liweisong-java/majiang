Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '首页', icon: 'home' },
      { pagePath: '/pages/rooms/rooms', text: '牌局', icon: 'game' },
      { pagePath: '/pages/stats/stats', text: '统计', icon: 'stats' }
    ]
  },
  methods: {
    switchTab(e: WechatMiniprogram.TouchEvent) {
      const data = e.currentTarget.dataset as { path: string; index: number }
      const url = data.path
      wx.switchTab({ url })
      this.setData({ selected: data.index })
    }
  }
})
