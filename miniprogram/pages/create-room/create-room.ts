// create-room.ts - 开房间（转积分版：仅房间名）
import roomService from '../../services/room.service';
import haptic from '../../utils/haptic.util';
import { CreateRoomData } from '../../types/models';

const app = getApp<IAppOption>();

function defaultRoomName(): string {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return `牌局 ${m}月${d}日`;
}

Page({
  data: {
    navBarHeight: 0,
    roomName: '',
    creating: false
  },

  onLoad() {
    this.setData({
      navBarHeight: app.globalData.navBarHeight,
      roomName: defaultRoomName()
    });
  },

  onRoomNameInput(e: any) {
    this.setData({
      roomName: e.detail.value
    });
  },

  async onCreateRoom() {
    const name = (this.data.roomName || '').trim() || defaultRoomName();

    try {
      haptic.medium(); // 创建操作反馈
      this.setData({ creating: true });

      const roomData: CreateRoomData = {
        roomName: name
      };

      const room = await roomService.createRoom(roomData);

      haptic.success(); // 成功反馈
      wx.showToast({
        title: '创建成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/room-invite/room-invite?roomId=${room._id}`
        });
      }, 800);
    } catch (error) {
      console.error('创建房间失败:', error);
      haptic.error(); // 错误反馈
      wx.showToast({
        title: '创建失败',
        icon: 'error'
      });
    } finally {
      this.setData({ creating: false });
    }
  },

  onBack() {
    wx.navigateBack();
  }
});
