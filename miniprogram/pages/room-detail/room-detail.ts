// room-detail.ts - 房间详情（转积分版：点头像转积分 + 结束对局统计）
import roomService from '../../services/room.service';
import userService from '../../services/user.service';
import { Room, RoomMember } from '../../types/models';

const app = getApp<IAppOption>();

interface MemberWithMe extends RoomMember {
  isMe: boolean;
}

Page({
  data: {
    navBarHeight: 0,
    roomId: '',
    room: null as Room | null,
    loading: true,
    myOpenid: '',
    isCreator: false,
    membersWithMe: [] as MemberWithMe[],
    sortedMembers: [] as RoomMember[],
    myBalance: 0,
    myHasLeft: false,

    showInviteModal: false,
    showTransferModal: false,
    transferTarget: null as RoomMember | null,
    transferAmount: '',
    transferSubmitting: false,

    showStatsModal: false
  },

  watcher: null as DB.Watcher | null,

  async onLoad(options: any) {
    const roomId = options.id || '';
    this.setData({
      navBarHeight: app.globalData.navBarHeight,
      roomId
    });

    // 确保先获取 OpenID
    let myOpenid = '';
    try {
      myOpenid = await userService.getOpenId();
      console.log('获取到的 OpenID:', myOpenid);
      this.setData({ myOpenid });
    } catch (e) {
      console.error('获取 openid 失败', e);
      wx.showToast({
        title: '初始化失败',
        icon: 'error'
      });
      return;
    }

    await this.loadRoomData();
    this.startWatching();
  },

  onUnload() {
    if (this.watcher) this.watcher.close();
  },

  async loadRoomData() {
    try {
      this.setData({ loading: true });
      let room = await roomService.getRoomDetail(this.data.roomId);

      // 3小时无积分变动自动结算
      if (room.status === 'active') {
        const history = room.balanceHistory || [];
        const lastActivity = history.length > 0
          ? new Date(history[history.length - 1].timestamp).getTime()
          : new Date(room.createdAt).getTime();
        const threeHours = 3 * 60 * 60 * 1000;
        if (Date.now() - lastActivity > threeHours) {
          console.log('积分超过3小时未变动，自动结算');
          try {
            await roomService.settleRoom(this.data.roomId);
          } catch (e) {
            console.warn('自动结算失败，降级更新状态', e);
            await roomService.forceSettle(this.data.roomId);
          }
          room = await roomService.getRoomDetail(this.data.roomId);
        }

        // 所有成员都已退出但房间还是 active（僵尸状态），立即结算
        const allLeft = room.status === 'active' && room.members.every(m => m.memberStatus === 'left');
        if (allLeft) {
          console.log('所有成员已退出但房间未结算，立即结算');
          try {
            await roomService.settleRoom(this.data.roomId);
          } catch (e) {
            await roomService.forceSettle(this.data.roomId);
          }
          room = await roomService.getRoomDetail(this.data.roomId);
        }
      }

      const myOpenid = this.data.myOpenid;
      const membersWithMe: MemberWithMe[] = (room.members || []).map((m: RoomMember) => ({
        ...m,
        isMe: m.openid === myOpenid
      }));
      const sortedMembers = [...(room.members || [])].sort((a, b) => b.currentBalance - a.currentBalance);
      const isCreator = room._openid === myOpenid;
      const myMember = membersWithMe.find(m => m.isMe);
      const myBalance = myMember?.currentBalance || 0;
      const myHasLeft = myMember?.memberStatus === 'left';

      this.setData({
        room,
        membersWithMe,
        sortedMembers,
        isCreator,
        myBalance,
        myHasLeft,
        showStatsModal: room.status === 'settled'
      });
    } catch (e) {
      console.error('加载房间失败', e);
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      this.setData({ loading: false });
    }
  },

  startWatching() {
    this.watcher = roomService.watchRoom(this.data.roomId, (room: Room) => {
      const myOpenid = this.data.myOpenid;
      const membersWithMe: MemberWithMe[] = (room.members || []).map((m: RoomMember) => ({
        ...m,
        isMe: m.openid === myOpenid
      }));
      const sortedMembers = [...(room.members || [])].sort((a, b) => b.currentBalance - a.currentBalance);
      const isCreator = room._openid === myOpenid;  // 🔥 修复：添加isCreator判断
      const myMember = membersWithMe.find(m => m.isMe);
      const myBalance = myMember?.currentBalance || 0;
      const myHasLeft = myMember?.memberStatus === 'left';

      // 检测房间是否刚刚变为已结束（从 active 变为 settled）
      const prevStatus = this.data.room?.status;
      const justSettled = prevStatus === 'active' && room.status === 'settled';

      this.setData({
        room,
        membersWithMe,
        sortedMembers,
        isCreator,  // 🔥 修复：更新isCreator状态
        myBalance,
        myHasLeft
      });

      // 被动感知房间结束，自动弹出统计弹窗
      if (justSettled) {
        this.setData({ showStatsModal: true });
      }
    });
  },

  onMemberTap(e: any) {
    const index = e.currentTarget.dataset.index as number;
    const list = this.data.membersWithMe as MemberWithMe[];
    const member = list[index];
    if (!member || member.isMe || this.data.room?.status !== 'active') return;
    // 已退出的成员不能转积分
    if (member.memberStatus === 'left') return;
    this.setData({
      showTransferModal: true,
      transferTarget: member,
      transferAmount: ''
    });
  },

  onHideTransfer() {
    this.setData({
      showTransferModal: false,
      transferTarget: null,
      transferAmount: ''
    });
  },

  preventTap() {},

  onTransferAmountInput(e: any) {
    let v = e.detail.value.replace(/\D/g, '');
    // 限制最大值为 9999
    if (v && parseInt(v, 10) > 9999) {
      v = '9999';
    }
    this.setData({ transferAmount: v });
  },

  async onConfirmTransfer() {
    const amount = parseInt(this.data.transferAmount, 10);
    if (!amount || amount <= 0) {
      wx.showToast({ title: '请输入有效积分', icon: 'none' });
      return;
    }

    const target = this.data.transferTarget as RoomMember;
    if (!target) return;

    // 获取当前用户的余额
    const myMember = this.data.membersWithMe.find(m => m.isMe);
    const myBalance = myMember?.currentBalance || 0;
    const afterBalance = myBalance - amount;

    // 余额警告
    if (afterBalance < -500) {
      const confirmResult = await new Promise<boolean>((resolve) => {
        wx.showModal({
          title: '余额不足提醒',
          content: `转出后你的积分将变为 ${afterBalance}，确定继续？`,
          confirmText: '继续转出',
          cancelText: '取消',
          success: (res) => resolve(res.confirm)
        });
      });
      if (!confirmResult) return;
    }

    try {
      this.setData({ transferSubmitting: true });
      await roomService.transferPoints(
        this.data.roomId,
        this.data.myOpenid,
        target.openid,
        amount
      );
      wx.showToast({ title: '转出成功', icon: 'success' });
      this.onHideTransfer();
    } catch (err: any) {
      wx.showToast({ title: err.message || '转出失败', icon: 'none', duration: 2000 });
    } finally {
      this.setData({ transferSubmitting: false });
    }
  },

  onShowInvite() {
    this.setData({ showInviteModal: true });
  },

  onHideInvite() {
    this.setData({ showInviteModal: false });
  },

  onCopyInviteCode() {
    if (!this.data.room) return;
    wx.setClipboardData({
      data: this.data.room.inviteCode,
      success: () => wx.showToast({ title: '已复制邀请码', icon: 'success' })
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

  onEndGame() {
    wx.showModal({
      title: '结束房间',
      content: '结束房间后所有成员将退出，积分记录保存到历史。确定结束？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await roomService.settleRoom(this.data.roomId);
          wx.showToast({ title: '已结束', icon: 'success' });
          await this.loadRoomData();
          this.setData({ showStatsModal: true });
        } catch (e) {
          console.error('结束房间失败', e);
          wx.showToast({ title: '操作失败', icon: 'error' });
        }
      }
    });
  },

  onLeaveRoom() {
    wx.showModal({
      title: '退出房间',
      content: '确定要退出房间吗？退出后当前积分将作为最终结算记录。',
      confirmText: '确定退出',
      confirmColor: '#ff4444',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await roomService.leaveRoom(this.data.roomId, this.data.myOpenid);
          wx.showToast({ title: '已退出房间', icon: 'success' });
          setTimeout(() => {
            wx.navigateBack();
          }, 1000);
        } catch (e: any) {
          console.error('退出房间失败', e);
          wx.showToast({
            title: e.message || '退出失败',
            icon: 'none',
            duration: 2000
          });
        }
      }
    });
  },

  onShowStats() {
    this.setData({ showStatsModal: true });
  },

  onHideStats() {
    this.setData({ showStatsModal: false });
  },

  onBack() {
    wx.navigateBack();
  }
});
