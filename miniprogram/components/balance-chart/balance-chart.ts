import { BalanceChange, RoomMember } from '../../types/models';

interface ChartDataPoint {
  timestamp: Date;
  balances: { [openid: string]: number };
  change?: BalanceChange;
}

Component({
  properties: {
    members: {
      type: Array,
      value: []
    },
    balanceHistory: {
      type: Array,
      value: []
    },
    height: {
      type: Number,
      value: 400
    }
  },

  data: {
    canvasId: '',
    chartData: [] as ChartDataPoint[],
    selectedPoint: null as any,
    showTooltip: false,
    tooltipX: 0,
    tooltipY: 0,
    // 缩放和拖动相关
    scale: 1,
    offsetX: 0,
    startX: 0,
    startY: 0,
    lastDistance: 0,
    isDragging: false
  },

  lifetimes: {
    attached() {
      const canvasId = `balance-chart-${Date.now()}`;
      this.setData({ canvasId });
    },

    ready() {
      this.initChart();
    }
  },

  observers: {
    'members, balanceHistory': function() {
      this.initChart();
    }
  },

  methods: {
    /**
     * 安全解析时间戳（兼容云数据库各种格式）
     */
    parseTimestamp(timestamp: any): Date {
      if (timestamp instanceof Date) return timestamp;
      if (typeof timestamp === 'number') return new Date(timestamp);
      if (typeof timestamp === 'string') return new Date(timestamp);
      // 云数据库返回的 Date 对象可能带有 $date 字段
      if (timestamp && timestamp.$date) return new Date(timestamp.$date);
      // 云数据库返回的 ServerDate 对象
      if (timestamp && typeof timestamp.getTime === 'function') return new Date(timestamp.getTime());
      return new Date();
    },

    /**
     * 初始化图表数据
     */
    initChart() {
      const members = this.data.members as RoomMember[];
      const history = this.data.balanceHistory as BalanceChange[];

      if (!members || members.length === 0) {
        return;
      }

      // 构建图表数据点
      const chartData: ChartDataPoint[] = [];

      // 添加初始点（所有人积分为0）
      const initialBalances: { [openid: string]: number } = {};
      members.forEach(m => {
        initialBalances[m.openid] = 0;
      });

      chartData.push({
        timestamp: new Date(Date.now() - 1000), // 稍微早一点
        balances: initialBalances
      });

      // 添加历史变动点
      if (history && history.length > 0) {
        history.forEach(change => {
          chartData.push({
            timestamp: this.parseTimestamp(change.timestamp),
            balances: { ...change.balances },
            change: change
          });
        });
      } else {
        // 如果没有历史记录，添加当前状态
        const currentBalances: { [openid: string]: number } = {};
        members.forEach(m => {
          currentBalances[m.openid] = m.currentBalance;
        });
        chartData.push({
          timestamp: new Date(),
          balances: currentBalances
        });
      }

      this.setData({ chartData }, () => {
        this.drawChart();
      });
    },

    /**
     * 绘制图表
     */
    drawChart() {
      const query = this.createSelectorQuery();
      query.select(`#${this.data.canvasId}`)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0]) return;

          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = wx.getSystemInfoSync().pixelRatio;
          const width = res[0].width;
          const height = res[0].height;

          canvas.width = width * dpr;
          canvas.height = height * dpr;
          ctx.scale(dpr, dpr);

          this.renderChart(ctx, width, height);
        });
    },

    /**
     * 渲染图表
     */
    renderChart(ctx: any, width: number, height: number) {
      const members = this.data.members as RoomMember[];
      const chartData = this.data.chartData as ChartDataPoint[];
      const scale = this.data.scale;
      const offsetX = this.data.offsetX;

      if (chartData.length === 0) return;

      // 清空画布
      ctx.clearRect(0, 0, width, height);

      // 图表边距
      const padding = { top: 40, right: 20, bottom: 60, left: 60 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      // 计算数据范围
      let minBalance = 0;
      let maxBalance = 0;
      chartData.forEach(point => {
        Object.values(point.balances).forEach(balance => {
          minBalance = Math.min(minBalance, balance);
          maxBalance = Math.max(maxBalance, balance);
        });
      });

      // 添加一些边距
      const range = maxBalance - minBalance || 100;
      minBalance -= range * 0.1;
      maxBalance += range * 0.1;

      // 绘制背景网格
      this.drawGrid(ctx, padding, chartWidth, chartHeight, minBalance, maxBalance);

      // 绘制Y轴刻度
      this.drawYAxis(ctx, padding, chartHeight, minBalance, maxBalance);

      // 绘制X轴（时间轴）
      this.drawXAxis(ctx, padding, chartWidth, chartHeight, chartData, scale, offsetX);

      // 绘制每个成员的折线
      const colors = this.getMemberColors(members.length);
      members.forEach((member, index) => {
        this.drawMemberLine(
          ctx,
          member,
          chartData,
          padding,
          chartWidth,
          chartHeight,
          minBalance,
          maxBalance,
          colors[index],
          scale,
          offsetX
        );
      });

      // 绘制图例
      this.drawLegend(ctx, members, colors, width, padding);
    },

    /**
     * 绘制网格
     */
    drawGrid(ctx: any, padding: any, width: number, height: number, minBalance: number, maxBalance: number) {
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;

      // 水平网格线（5条）
      for (let i = 0; i <= 5; i++) {
        const y = padding.top + (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + width, y);
        ctx.stroke();
      }

      // 垂直网格线（根据数据点数量）
      const gridCount = Math.min(10, this.data.chartData.length);
      for (let i = 0; i <= gridCount; i++) {
        const x = padding.left + (width / gridCount) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + height);
        ctx.stroke();
      }
    },

    /**
     * 绘制Y轴
     */
    drawYAxis(ctx: any, padding: any, height: number, minBalance: number, maxBalance: number) {
      ctx.fillStyle = '#6B7280';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      for (let i = 0; i <= 5; i++) {
        const value = maxBalance - (maxBalance - minBalance) * (i / 5);
        const y = padding.top + (height / 5) * i;
        ctx.fillText(Math.round(value).toString(), padding.left - 10, y);
      }

      // Y轴标签
      ctx.save();
      ctx.translate(20, padding.top + height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1F2937';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('积分', 0, 0);
      ctx.restore();
    },

    /**
     * 绘制X轴（时间轴）
     */
    drawXAxis(ctx: any, padding: any, width: number, height: number, chartData: ChartDataPoint[], scale: number, offsetX: number) {
      ctx.fillStyle = '#6B7280';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const visiblePoints = Math.min(10, chartData.length);
      const step = Math.max(1, Math.floor(chartData.length / visiblePoints));

      for (let i = 0; i < chartData.length; i += step) {
        const point = chartData[i];
        const x = padding.left + (width / (chartData.length - 1)) * i * scale + offsetX;

        if (x < padding.left || x > padding.left + width) continue;

        const time = this.parseTimestamp(point.timestamp);
        const h = time.getHours();
        const m = time.getMinutes();
        const timeStr = `${(isNaN(h) ? 0 : h).toString().padStart(2, '0')}:${(isNaN(m) ? 0 : m).toString().padStart(2, '0')}`;

        ctx.fillText(timeStr, x, padding.top + height + 10);
      }

      // X轴标签
      ctx.fillStyle = '#1F2937';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('时间', padding.left + width / 2, padding.top + height + 40);
    },

    /**
     * 绘制成员折线
     */
    drawMemberLine(
      ctx: any,
      member: RoomMember,
      chartData: ChartDataPoint[],
      padding: any,
      width: number,
      height: number,
      minBalance: number,
      maxBalance: number,
      color: string,
      scale: number,
      offsetX: number
    ) {
      const range = maxBalance - minBalance;

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      let firstPoint = true;

      chartData.forEach((point, index) => {
        const balance = point.balances[member.openid] || 0;
        const x = padding.left + (width / (chartData.length - 1)) * index * scale + offsetX;
        const y = padding.top + height - ((balance - minBalance) / range) * height;

        if (x < padding.left - 50 || x > padding.left + width + 50) return;

        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }

        // 绘制数据点
        ctx.fillRect(x - 3, y - 3, 6, 6);
      });

      ctx.stroke();
    },

    /**
     * 绘制图例
     */
    drawLegend(ctx: any, members: RoomMember[], colors: string[], width: number, padding: any) {
      const legendX = padding.left;
      const legendY = 10;
      const itemWidth = 120;

      ctx.font = '12px sans-serif';
      ctx.textBaseline = 'middle';

      members.forEach((member, index) => {
        const x = legendX + (index % 3) * itemWidth;
        const y = legendY + Math.floor(index / 3) * 20;

        // 颜色方块
        ctx.fillStyle = colors[index];
        ctx.fillRect(x, y - 4, 12, 12);

        // 昵称
        ctx.fillStyle = '#1F2937';
        ctx.textAlign = 'left';
        ctx.fillText(member.nickname, x + 18, y + 2);
      });
    },

    /**
     * 获取成员颜色
     */
    getMemberColors(count: number): string[] {
      const colors = [
        '#10B981', // 绿色
        '#3B82F6', // 蓝色
        '#F59E0B', // 橙色
        '#EF4444', // 红色
        '#8B5CF6', // 紫色
        '#EC4899', // 粉色
        '#14B8A6', // 青色
        '#F97316', // 深橙色
      ];

      return colors.slice(0, count);
    },

    /**
     * 触摸开始
     */
    onTouchStart(e: any) {
      const touches = e.touches;

      if (touches.length === 1) {
        // 单指拖动
        this.setData({
          isDragging: true,
          startX: touches[0].x,
          startY: touches[0].y
        });
      } else if (touches.length === 2) {
        // 双指缩放
        const distance = this.getDistance(touches[0], touches[1]);
        this.setData({
          lastDistance: distance
        });
      }
    },

    /**
     * 触摸移动
     */
    onTouchMove(e: any) {
      const touches = e.touches;

      if (touches.length === 1 && this.data.isDragging) {
        // 拖动
        const deltaX = touches[0].x - this.data.startX;
        const newOffsetX = this.data.offsetX + deltaX;

        this.setData({
          offsetX: newOffsetX,
          startX: touches[0].x
        });

        this.drawChart();
      } else if (touches.length === 2) {
        // 缩放
        const distance = this.getDistance(touches[0], touches[1]);
        const scale = distance / this.data.lastDistance;
        const newScale = Math.max(0.5, Math.min(3, this.data.scale * scale));

        this.setData({
          scale: newScale,
          lastDistance: distance
        });

        this.drawChart();
      }
    },

    /**
     * 触摸结束
     */
    onTouchEnd() {
      this.setData({
        isDragging: false
      });
    },

    /**
     * 点击画布
     */
    onTap(e: any) {
      // TODO: 显示点击位置的详细信息
      console.log('点击位置:', e.detail);
    },

    /**
     * 计算两点距离
     */
    getDistance(touch1: any, touch2: any): number {
      const dx = touch1.x - touch2.x;
      const dy = touch1.y - touch2.y;
      return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * 重置缩放
     */
    resetZoom() {
      this.setData({
        scale: 1,
        offsetX: 0
      });
      this.drawChart();
    }
  }
});
