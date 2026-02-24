// friends.ts - 牌友列表页
import friendService from '../../services/friend.service';
import { Friend } from '../../types/models';

const app = getApp<IAppOption>();

Page({
  data: {
    navBarHeight: 0,
    friends: [] as any[],
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
      this.getTabBar().setData({ selected: 2 });
    }
    await this.loadFriends();
  },

  /**
   * 加载牌友列表
   */
  async loadFriends() {
    try {
      this.setData({ loading: true });
      let friends = await friendService.getFriends();

      // 计算胜率文本
      friends = friends.map(friend => {
        const winRateText = friend.stats.gamesPlayed > 0
          ? ((friend.stats.wins / friend.stats.gamesPlayed) * 100).toFixed(1) + '%'
          : '-';
        return { ...friend, winRateText };
      });

      this.setData({ friends });
    } catch (error) {
      console.error('加载牌友列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 查看牌友详情
   */
  onFriendTap(e: any) {
    const { friend } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/friend-detail/friend-detail?openid=${friend.friendOpenid}`
    });
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    await this.loadFriends();
    wx.stopPullDownRefresh();
  }
})
