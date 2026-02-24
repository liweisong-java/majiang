// index.ts - 个人中心页
import userService from '../../services/user.service';
import roomService from '../../services/room.service';
import themeService from '../../services/theme.service';
import { User, Room } from '../../types/models';

const app = getApp<IAppOption>();

Page({
  data: {
    user: null as User | null,
    activeRooms: [] as Room[],
    loading: true,
    navBarHeight: 0,
    currentTheme: 'light' as 'light' | 'dark',
    hasShownWelcome: false
  },

  async onLoad() {
    // 获取导航栏高度
    this.setData({
      navBarHeight: app.globalData.navBarHeight,
      currentTheme: themeService.getTheme()
    });

    await this.loadUserData();
    await this.loadActiveRooms();
  },

  async onShow() {
    // 设置自定义 tab bar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    // 每次显示页面时刷新数据
    await this.loadUserData();
    await this.loadActiveRooms();
  },

  /**
   * 切换主题
   */
  onToggleTheme() {
    const newTheme = themeService.toggleTheme();
    this.setData({ currentTheme: newTheme });
    wx.vibrateShort({ type: 'light' });
  },

  /**
   * 用户信息更新
   */
  async onUserUpdate() {
    await this.loadUserData();
  },

  /**
   * 加载用户数据
   */
  async loadUserData() {
    try {
      this.setData({ loading: true });
      const user = await userService.getCurrentUser();
      this.setData({ user });

      // 只在首次加载且用户信息为默认值时提示（避免每次 onShow 都弹窗）
      if (!this.data.hasShownWelcome &&
          (!user.nickname || user.nickname === '微信用户' || user.nickname === '点击更换名称')) {
        this.setData({ hasShownWelcome: true });

        // 延迟一下，让页面先渲染
        setTimeout(() => {
          wx.showModal({
            title: '完善个人信息',
            content: '请设置你的昵称和头像，方便其他玩家识别',
            confirmText: '去设置',
            cancelText: '稍后',
            success: (res) => {
              if (res.confirm) {
                wx.showToast({
                  title: '点击头像或昵称进行设置',
                  icon: 'none',
                  duration: 2000
                });
              }
            }
          });
        }, 500);
      }
    } catch (error) {
      console.error('加载用户数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 加载进行中的房间（附带当前用户积分）
   */
  async loadActiveRooms() {
    try {
      const rooms = await roomService.getMyRooms('active');
      const myOpenid = (this.data.user && (this.data.user as any)._openid) || '';

      // 3小时无积分变动的房间自动结算
      const threeHours = 3 * 60 * 60 * 1000;
      const now = Date.now();
      const stillActive: any[] = [];

      for (const room of rooms) {
        const history = (room as any).balanceHistory || [];
        const lastActivity = history.length > 0
          ? new Date(history[history.length - 1].timestamp).getTime()
          : new Date(room.createdAt).getTime();
        const allLeft = room.members && room.members.every((m: any) => m.memberStatus === 'left');
        if (now - lastActivity > threeHours || allLeft) {
          try {
            await roomService.settleRoom(room._id);
          } catch (e) {
            try { await roomService.forceSettle(room._id); } catch (_) {}
          }
        } else {
          stillActive.push(room);
        }
      }

      const withBalance = stillActive.slice(0, 3).map((r: any) => ({
        ...r,
        myBalance: r.members?.find((m: any) => m.openid === myOpenid)?.currentBalance ?? 0
      }));
      this.setData({ activeRooms: withBalance });
    } catch (error) {
      console.error('加载房间列表失败:', error);
    }
  },

  /**
   * 更新用户信息
   */
  async onUpdateUserInfo(e: any) {
    try {
      const { avatarUrl, nickName } = e.detail;
      if (avatarUrl && nickName) {
        await app.updateUserInfo({ avatarUrl, nickName });
        await this.loadUserData();
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      wx.showToast({
        title: '更新失败',
        icon: 'error'
      });
    }
  },

  /**
   * 创建房间
   */
  onCreateRoom() {
    wx.navigateTo({
      url: '/pages/create-room/create-room'
    });
  },

  /**
   * 加入房间
   */
  onJoinRoom() {
    wx.navigateTo({
      url: '/pages/join-room/join-room'
    });
  },

  /**
   * 查看房间详情
   */
  onRoomTap(e: any) {
    const room = e.detail?.room;
    if (!room?._id) return;
    wx.navigateTo({
      url: `/pages/room-detail/room-detail?id=${room._id}`
    });
  },

  /**
   * 查看所有房间
   */
  onViewAllRooms() {
    wx.switchTab({
      url: '/pages/rooms/rooms'
    });
  }
})
