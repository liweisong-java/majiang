// rooms.ts - 牌局列表页（转积分版）
import roomService from '../../services/room.service';
import userService from '../../services/user.service';
import { Room } from '../../types/models';

const app = getApp<IAppOption>();

function attachMyBalance(rooms: any[], myOpenid: string) {
  return rooms.map((r: any) => ({
    ...r,
    myBalance: r.members?.find((m: any) => m.openid === myOpenid)?.currentBalance ?? 0
  }));
}

Page({
  data: {
    navBarHeight: 0,
    currentTab: 0,
    tabs: [
      { label: '进行中', value: 'active' },
      { label: '已结束', value: 'settled' }
    ],
    activeRooms: [] as Room[],
    settledRooms: [] as Room[],
    loading: true
  },

  onLoad() {
    this.setData({
      navBarHeight: app.globalData.navBarHeight
    });
  },

  async onShow() {
    // 设置自定义 tab bar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    await this.loadRooms();
  },

  async loadRooms() {
    try {
      this.setData({ loading: true });
      let myOpenid = '';
      try {
        myOpenid = await userService.getOpenId();
      } catch (_) {}

      let [activeRooms, settledRooms] = await Promise.all([
        roomService.getMyRooms('active'),
        roomService.getMyRooms('settled')
      ]);

      // 3小时无积分变动的房间自动结算
      const threeHours = 3 * 60 * 60 * 1000;
      const now = Date.now();
      const staleRooms: any[] = [];
      const stillActive: any[] = [];

      for (const room of activeRooms) {
        const history = (room as any).balanceHistory || [];
        const lastActivity = history.length > 0
          ? new Date(history[history.length - 1].timestamp).getTime()
          : new Date(room.createdAt).getTime();
        const allLeft = room.members && room.members.every((m: any) => m.memberStatus === 'left');
        if (now - lastActivity > threeHours || allLeft) {
          staleRooms.push(room);
        } else {
          stillActive.push(room);
        }
      }

      // 后台结算超时房间
      for (const room of staleRooms) {
        try {
          await roomService.settleRoom(room._id);
        } catch (e) {
          try { await roomService.forceSettle(room._id); } catch (_) {}
        }
      }

      // 超时房间移到已结束列表
      if (staleRooms.length > 0) {
        activeRooms = stillActive;
        const freshSettled = await roomService.getMyRooms('settled');
        settledRooms = freshSettled;
      }

      this.setData({
        activeRooms: attachMyBalance(activeRooms, myOpenid),
        settledRooms: attachMyBalance(settledRooms, myOpenid)
      });
    } catch (error) {
      console.error('加载房间列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 切换 Tab
   */
  onTabChange(e: any) {
    this.setData({
      currentTab: e.detail.current
    });
  },

  onTabClick(e: any) {
    const { index } = e.currentTarget.dataset;
    this.setData({
      currentTab: index
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
   * 下拉刷新
   */
  async onPullDownRefresh() {
    await this.loadRooms();
    wx.stopPullDownRefresh();
  }
})
