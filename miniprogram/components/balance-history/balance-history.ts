import { BalanceChange } from '../../types/models';

interface ProcessedChange extends BalanceChange {
  formattedTime: string;
  description: string;
  myBalanceChange: string;
  isRelatedToMe: boolean;
}

Component({
  properties: {
    balanceHistory: {
      type: Array,
      value: [],
      observer: function() {
        this.processBalanceHistory();
      }
    },
    myOpenid: {
      type: String,
      value: '',
      observer: function() {
        this.processBalanceHistory();
      }
    }
  },

  data: {
    expandedIndex: -1,
    processedHistory: [] as ProcessedChange[]
  },

  lifetimes: {
    attached() {
      this.processBalanceHistory();
    }
  },

  methods: {
    /**
     * 预处理积分变动历史数据
     */
    processBalanceHistory() {
      const balanceHistory = this.data.balanceHistory as any as BalanceChange[];
      const myOpenid = this.data.myOpenid as string;

      if (!balanceHistory || balanceHistory.length === 0) {
        this.setData({ processedHistory: [] });
        return;
      }

      const processed: ProcessedChange[] = balanceHistory.map(change => ({
        ...change,
        formattedTime: this.formatTime(change.timestamp),
        description: this.getChangeDescription(change, myOpenid),
        myBalanceChange: this.getMyBalanceChange(change, myOpenid),
        isRelatedToMe: change.fromOpenid === myOpenid || change.toOpenid === myOpenid
      }));

      this.setData({ processedHistory: processed });
    },
    /**
     * 安全解析时间戳（兼容云数据库各种格式）
     */
    parseTimestamp(timestamp: any): Date {
      if (timestamp instanceof Date) return timestamp;
      if (typeof timestamp === 'number') return new Date(timestamp);
      if (typeof timestamp === 'string') return new Date(timestamp);
      if (timestamp && timestamp.$date) return new Date(timestamp.$date);
      if (timestamp && typeof timestamp.getTime === 'function') return new Date(timestamp.getTime());
      return new Date();
    },

    /**
     * 格式化时间
     */
    formatTime(timestamp: any): string {
      const date = this.parseTimestamp(timestamp);

      if (isNaN(date.getTime())) return '--:--';

      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();

      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');

      if (isToday) {
        return `${hours}:${minutes}:${seconds}`;
      } else {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${month}-${day} ${hours}:${minutes}`;
      }
    },

    /**
     * 切换展开/收起
     */
    toggleExpand(e: any) {
      const index = e.currentTarget.dataset.index;
      this.setData({
        expandedIndex: this.data.expandedIndex === index ? -1 : index
      });
    },

    /**
     * 获取变动描述
     */
    getChangeDescription(change: BalanceChange, myOpenid: string): string {

      if (change.fromOpenid === myOpenid) {
        return `转给 ${change.toNickname}`;
      } else if (change.toOpenid === myOpenid) {
        return `收到 ${change.fromNickname} 的转账`;
      } else {
        return `${change.fromNickname} → ${change.toNickname}`;
      }
    },

    /**
     * 获取我的积分变化
     */
    getMyBalanceChange(change: BalanceChange, myOpenid: string): string {
      const myBalance = change.balances[myOpenid] || 0;

      if (myBalance >= 0) {
        return `+${myBalance}`;
      } else {
        return `${myBalance}`;
      }
    }
  }
});
