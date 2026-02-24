// stats.ts - 统计页面
import statsService from '../../services/stats.service';
import userService from '../../services/user.service';
import { User } from '../../types/models';

const app = getApp<IAppOption>();

interface OverallStats {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalScoreChange: number;
  averageScore: number;
}

interface TrendData {
  dates: string[];
  scores: number[];
}

Page({
  data: {
    navBarHeight: 0,
    user: null as User | null,
    overallStats: null as OverallStats | null,
    trendData: null as TrendData | null,
    trendPeriod: 7,
    loading: true,
    winRateText: '-',
    averageScoreText: '0.0'
  },

  onLoad() {
    this.setData({
      navBarHeight: app.globalData.navBarHeight
    });
    this.loadStatsData();
  },

  async onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    // 非首次进入时刷新数据（首次已在 onLoad 加载）
    if (this.data.overallStats !== null) {
      this.loadStatsData();
    }
  },

  /**
   * 加载统计数据
   */
  async loadStatsData() {
    try {
      this.setData({ loading: true });

      const [user, overallStats, trendData] = await Promise.all([
        userService.getCurrentUser(),
        statsService.getOverallStats(),
        statsService.getTrendData(this.data.trendPeriod)
      ]);

      // 计算格式化的文本
      const winRateText = overallStats.winRate.toFixed(1);
      const averageScoreText = overallStats.averageScore.toFixed(1);

      this.setData({
        user,
        overallStats,
        trendData,
        winRateText,
        averageScoreText
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 切换趋势周期
   */
  async onChangePeriod(e: any) {
    const { period } = e.currentTarget.dataset;
    this.setData({ trendPeriod: period });

    try {
      const trendData = await statsService.getTrendData(period);
      this.setData({ trendData });
    } catch (error) {
      console.error('加载趋势数据失败:', error);
    }
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    await this.loadStatsData();
    wx.stopPullDownRefresh();
  }
})
