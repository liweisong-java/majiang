// theme.service.ts - 主题管理服务
const THEME_KEY = 'app_theme'

type Theme = 'light' | 'dark'

class ThemeService {
  private currentTheme: Theme = 'light'

  /**
   * 初始化主题
   */
  init() {
    const savedTheme = (wx.getStorageSync(THEME_KEY) || 'light') as Theme
    this.currentTheme = savedTheme
    this.applyTheme(savedTheme)
  }

  /**
   * 获取当前主题
   */
  getTheme(): Theme {
    return this.currentTheme
  }

  /**
   * 设置主题
   */
  setTheme(theme: Theme) {
    this.currentTheme = theme
    wx.setStorageSync(THEME_KEY, theme)
    this.applyTheme(theme)
  }

  /**
   * 切换主题
   */
  toggleTheme(): Theme {
    const newTheme: Theme = this.currentTheme === 'light' ? 'dark' : 'light'
    this.setTheme(newTheme)
    return newTheme
  }

  /**
   * 应用主题到所有页面
   */
  private applyTheme(theme: Theme) {
    // 获取所有页面实例并更新
    const pages = getCurrentPages()
    pages.forEach(page => {
      if (page && page.setData) {
        page.setData({
          __theme__: theme
        })
      }
    })

    // 更新自定义 tab bar
    const tabBar = (pages[pages.length - 1] as any)?.getTabBar?.()
    if (tabBar && tabBar.setData) {
      tabBar.setData({
        __theme__: theme
      })
    }
  }
}

export default new ThemeService()
