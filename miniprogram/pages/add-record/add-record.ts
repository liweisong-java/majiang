// add-record.ts - 添加游戏记录页面
import roomService from '../../services/room.service';
import recordService from '../../services/record.service';
import haptic from '../../utils/haptic.util';
import { Room, ScoreEntry } from '../../types/models';

const app = getApp<IAppOption>();

Page({
  data: {
    navBarHeight: 0,
    roomId: '',
    room: null as Room | null,
    scores: [] as ScoreEntry[],
    loading: true,
    submitting: false,
    sumText: '0.00',
    isBalanced: true
  },

  async onLoad(options: any) {
    this.setData({
      navBarHeight: app.globalData.navBarHeight,
      roomId: options.roomId
    });

    await this.loadRoomData();
    this.initScores();
  },

  /**
   * 加载房间数据
   */
  async loadRoomData() {
    try {
      this.setData({ loading: true });
      const room = await roomService.getRoomDetail(this.data.roomId);
      this.setData({ room });
    } catch (error) {
      console.error('加载房间数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 初始化分数输入
   */
  initScores() {
    if (!this.data.room) return;

    const scores: ScoreEntry[] = this.data.room.members.map(member => ({
      openid: member.openid,
      nickname: member.nickname,
      scoreChange: 0,
      note: ''
    }));

    this.setData({ scores });
  },

  /**
   * 输入分数
   */
  onScoreInput(e: any) {
    const { index } = e.currentTarget.dataset;
    const value = parseFloat(e.detail.value);
    const scores = [...this.data.scores];

    scores[index].scoreChange = isNaN(value) ? 0 : value;

    this.setData({ scores });
    this.updateSum();
  },

  /**
   * 输入备注
   */
  onNoteInput(e: any) {
    const { index } = e.currentTarget.dataset;
    const value = e.detail.value;
    const scores = [...this.data.scores];

    scores[index].note = value;

    this.setData({ scores });
  },

  /**
   * 检查分数是否平衡
   */
  checkBalance() {
    const sum = this.data.scores.reduce((acc, score) => acc + score.scoreChange, 0);
    return Math.abs(sum) < 0.01;
  },

  /**
   * 获取总和
   */
  getSum() {
    return this.data.scores.reduce((acc, score) => acc + score.scoreChange, 0);
  },

  /**
   * 更新总和显示
   */
  updateSum() {
    const sum = this.getSum();
    const isBalanced = this.checkBalance();
    this.setData({
      sumText: sum.toFixed(2),
      isBalanced
    });
  },

  /**
   * 提交记录
   */
  async onSubmit() {
    // 检查是否平衡
    if (!this.checkBalance()) {
      const sum = this.getSum();
      haptic.error(); // 错误反馈
      wx.showModal({
        title: '分数不平衡',
        content: `当前总和为 ${sum.toFixed(2)}，确认继续吗？`,
        success: async (res) => {
          if (res.confirm) {
            haptic.medium(); // 确认反馈
            await this.submitRecord();
          }
        }
      });
      return;
    }

    haptic.medium(); // 提交反馈
    await this.submitRecord();
  },

  /**
   * 提交记录到服务器
   */
  async submitRecord() {
    try {
      this.setData({ submitting: true });

      await recordService.addRecord(this.data.roomId, {
        scores: this.data.scores
      });

      wx.showToast({
        title: '添加成功',
        icon: 'success'
      });

      // 返回房间详情页
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);

    } catch (error) {
      console.error('添加记录失败:', error);
      wx.showToast({
        title: '添加失败',
        icon: 'error'
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  /**
   * 快速设置（胡牌者）
   */
  onQuickSetWinner(e: any) {
    const { index } = e.currentTarget.dataset;
    const scores = [...this.data.scores];

    // 假设其他人平均分摊
    const winAmount = 30;
    const loseAmount = -winAmount / (scores.length - 1);

    scores.forEach((score, i) => {
      if (i === index) {
        score.scoreChange = winAmount;
        score.note = '胡牌';
      } else {
        score.scoreChange = loseAmount;
        score.note = '';
      }
    });

    this.setData({ scores });
  },

  /**
   * 重置
   */
  onReset() {
    this.initScores();
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  }
})
