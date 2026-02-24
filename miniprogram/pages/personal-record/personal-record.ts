import recordService from '../../services/record.service';
import { PersonalRecord } from '../../types/models';

Page({
  data: {
    navBarHeight: 0,
    activeTab: 'add' as 'add' | 'list',
    loading: false,
    submitting: false,

    // 表单
    gameTypes: ['麻将', '扑克', '斗地主', '德州'],
    gameType: '麻将',
    isCustomType: false,
    customGameType: '',
    settlementMode: 'score' as 'score' | 'money',
    players: [
      { name: '', finalScore: 0 },
      { name: '', finalScore: 0 },
      { name: '', finalScore: 0 },
      { name: '', finalScore: 0 },
    ] as { name: string; finalScore: number }[],
    note: '',
    totalScore: 0,

    // 历史
    records: [] as (PersonalRecord & { playedAtText: string })[],
  },

  onLoad() {
    const sysInfo = wx.getWindowInfo();
    const menuRect = wx.getMenuButtonBoundingClientRect();
    const navBarHeight = menuRect.bottom + (menuRect.top - sysInfo.statusBarHeight!) + 4;
    this.setData({ navBarHeight });
  },

  onShow() {
    if (this.data.activeTab === 'list') {
      this.loadRecords();
    }
  },

  onBack() {
    wx.navigateBack();
  },

  onSwitchTab(e: WechatMiniprogram.TouchEvent) {
    const tab = e.currentTarget.dataset.tab as 'add' | 'list';
    this.setData({ activeTab: tab });
    if (tab === 'list') {
      this.loadRecords();
    }
  },

  // ===== 表单 =====
  onSelectGameType(e: WechatMiniprogram.TouchEvent) {
    this.setData({
      gameType: e.currentTarget.dataset.type,
      isCustomType: false,
    });
  },

  onCustomType() {
    this.setData({
      isCustomType: true,
      gameType: this.data.customGameType || '',
    });
  },

  onCustomTypeInput(e: WechatMiniprogram.Input) {
    this.setData({
      customGameType: e.detail.value,
      gameType: e.detail.value,
    });
  },

  onSelectMode(e: WechatMiniprogram.TouchEvent) {
    this.setData({ settlementMode: e.currentTarget.dataset.mode });
  },

  onAddPlayer() {
    const players = this.data.players.concat([{ name: '', finalScore: 0 }]);
    this.setData({ players });
  },

  onRemovePlayer(e: WechatMiniprogram.TouchEvent) {
    const idx = e.currentTarget.dataset.index;
    const players = this.data.players.filter((_: any, i: number) => i !== idx);
    this.setData({ players });
    this.calcTotal();
  },

  onPlayerNameInput(e: WechatMiniprogram.Input) {
    const idx = e.currentTarget.dataset.index;
    const key = `players[${idx}].name`;
    this.setData({ [key]: e.detail.value });
  },

  onPlayerScoreInput(e: WechatMiniprogram.Input) {
    const idx = e.currentTarget.dataset.index;
    const val = parseFloat(e.detail.value) || 0;
    const key = `players[${idx}].finalScore`;
    this.setData({ [key]: val });
    this.calcTotal();
  },

  calcTotal() {
    const total = this.data.players.reduce(
      (sum: number, p: { finalScore: number }) => sum + (p.finalScore || 0),
      0
    );
    this.setData({ totalScore: Math.round(total * 100) / 100 });
  },

  onNoteInput(e: WechatMiniprogram.Input) {
    this.setData({ note: e.detail.value });
  },

  async onSubmit() {
    const { gameType, settlementMode, players, note, submitting } = this.data;

    if (submitting) return;

    if (!gameType) {
      wx.showToast({ title: '请选择游戏类型', icon: 'none' });
      return;
    }

    const validPlayers = players.filter((p: { name: string }) => p.name.trim());
    if (validPlayers.length < 2) {
      wx.showToast({ title: '至少需要2个玩家', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      await recordService.addPersonalRecord({
        gameType,
        settlementMode,
        players: validPlayers,
        note: note || undefined,
      });

      wx.showToast({ title: '保存成功', icon: 'success' });

      // 重置表单
      this.setData({
        players: [
          { name: '', finalScore: 0 },
          { name: '', finalScore: 0 },
          { name: '', finalScore: 0 },
          { name: '', finalScore: 0 },
        ],
        note: '',
        totalScore: 0,
      });
    } catch (err) {
      console.error('保存失败:', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  // ===== 历史记录 =====
  async loadRecords() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const records = await recordService.getPersonalRecords();
      const formatted = records.map((r: PersonalRecord) => ({
        ...r,
        playedAtText: this.formatDate(r.playedAt),
      }));
      this.setData({ records: formatted });
    } catch (err) {
      console.error('加载记录失败:', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  formatDate(d: Date | string): string {
    const date = typeof d === 'string' ? new Date(d) : d;
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';
    const m = date.getMonth() + 1;
    const day = date.getDate();
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${m}月${day}日 ${h}:${min}`;
  },
});
