// room-invite.ts - 邀请好友进房（开房成功后进入）
import roomService from '../../services/room.service';
import { Room } from '../../types/models';

const app = getApp<IAppOption>();

Page({
  data: {
    navBarHeight: 0,
    roomId: '',
    room: null as Room | null,
    loading: true
  },

  async onLoad(options: any) {
    const roomId = options.roomId || '';
    this.setData({
      navBarHeight: app.globalData.navBarHeight,
      roomId
    });
    if (roomId) {
      await this.loadRoom();
    } else {
      this.setData({ loading: false });
    }
  },

  async loadRoom() {
    try {
      this.setData({ loading: true });
      const room = await roomService.getRoomDetail(this.data.roomId);
      this.setData({ room });
    } catch (e) {
      console.error('加载房间失败', e);
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onCopyCode() {
    if (!this.data.room) return;
    wx.setClipboardData({
      data: this.data.room.inviteCode,
      success: () => wx.showToast({ title: '已复制邀请码', icon: 'success' })
    });
  },

  onEnterRoom() {
    if (!this.data.roomId) return;
    wx.redirectTo({
      url: `/pages/room-detail/room-detail?id=${this.data.roomId}`
    });
  },

  onShareAppMessage() {
    const room = this.data.room;
    if (!room) return {};
    return {
      title: `邀请你加入 ${room.roomName}`,
      path: `/pages/join-room/join-room?code=${room.inviteCode}`
    };
  },

  onBack() {
    wx.navigateBack();
  }
});
