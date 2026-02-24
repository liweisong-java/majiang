// haptic.util.ts - 触觉反馈工具
type HapticType = 'light' | 'medium' | 'heavy'

class HapticUtil {
  /**
   * 轻触反馈 - 用于按钮点击、选项切换
   */
  light() {
    wx.vibrateShort({ type: 'light' })
  }

  /**
   * 中等反馈 - 用于重要操作确认
   */
  medium() {
    wx.vibrateShort({ type: 'medium' })
  }

  /**
   * 重触反馈 - 用于关键操作、错误提示
   */
  heavy() {
    wx.vibrateShort({ type: 'heavy' })
  }

  /**
   * 成功反馈 - 双次轻触
   */
  success() {
    this.light()
    setTimeout(() => this.light(), 100)
  }

  /**
   * 错误反馈 - 重触
   */
  error() {
    this.heavy()
  }

  /**
   * 选择反馈 - 轻触
   */
  selection() {
    this.light()
  }

  /**
   * 通用触觉反馈
   */
  vibrate(type: HapticType = 'light') {
    wx.vibrateShort({ type })
  }
}

export default new HapticUtil()
