// join-room.ts - 加入房间页面
import roomService from '../../services/room.service';
import userService from '../../services/user.service';
import haptic from '../../utils/haptic.util';

const app = getApp<IAppOption>();

Page({
  data: {
    navBarHeight: 0,
    inviteCode: '',
    joining: false
  },

  async onLoad(options: any) {
    this.setData({
      navBarHeight: app.globalData.navBarHeight
    });

    // 如果从分享链接进入
    if (options.code) {
      try {
        // 确保用户已登录（如果是新用户会自动创建）
        await userService.getCurrentUser(false);

        this.setData({
          inviteCode: options.code
        });
        // 自动加入
        this.onJoinRoom();
      } catch (error) {
        console.error('初始化用户失败:', error);
        wx.showToast({
          title: '初始化失败，请重试',
          icon: 'none'
        });
      }
    }
  },

  /**
   * 输入邀请码
   */
  onInviteCodeInput(e: any) {
    // 转换为大写
    const code = e.detail.value.toUpperCase();
    this.setData({
      inviteCode: code
    });
  },

  /**
   * 加入房间
   */
  async onJoinRoom() {
    // 验证输入
    if (!this.data.inviteCode.trim()) {
      haptic.error();
      wx.showToast({
        title: '请输入邀请码',
        icon: 'none'
      });
      return;
    }

    if (this.data.inviteCode.length !== 6) {
      haptic.error();
      wx.showToast({
        title: '邀请码应为6位',
        icon: 'none'
      });
      return;
    }

    try {
      haptic.medium(); // 加入操作反馈
      this.setData({ joining: true });

      const room = await roomService.joinRoom(this.data.inviteCode);

      haptic.success(); // 成功反馈
      wx.showToast({
        title: '加入成功',
        icon: 'success'
      });

      // 跳转到房间详情页
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/room-detail/room-detail?id=${room._id}`
        });
      }, 1000);

    } catch (error: any) {
      console.error('加入房间失败:', error);
      haptic.error(); // 错误反馈
      wx.showToast({
        title: error.message || '加入失败',
        icon: 'none'
      });
    } finally {
      this.setData({ joining: false });
    }
  },

  /**
   * 扫码加入
   */
  onScanCode() {
    haptic.light(); // 扫码操作反馈
    wx.scanCode({
      onlyFromCamera: true,
      success: (res) => {
        // 解析二维码中的邀请码
        const code = this.parseInviteCodeFromUrl(res.result);
        if (code) {
          haptic.light();
          this.setData({ inviteCode: code });
          this.onJoinRoom();
        } else {
          haptic.error();
          wx.showToast({
            title: '无效的二维码',
            icon: 'none'
          });
        }
      },
      fail: () => {
        haptic.error();
        wx.showToast({
          title: '扫码失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 从 URL 中解析邀请码
   */
  parseInviteCodeFromUrl(url: string): string | null {
    try {
      const match = url.match(/code=([A-Z0-9]{6})/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  }
})
