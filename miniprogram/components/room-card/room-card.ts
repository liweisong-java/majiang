Component({
  properties: {
    room: {
      type: Object,
      value: null
    },
    /** 当前用户在该房间的积分，可选 */
    myBalance: {
      type: Number,
      value: null
    }
  },

  data: {
    statusMap: {
      active: '进行中',
      settled: '已结束',
      archived: '已归档'
    } as Record<string, string>,
    statusClass: ''
  },

  observers: {
    'room.status': function (status: string) {
      let cls = 'status-archived';
      if (status === 'active') cls = 'status-active';
      else if (status === 'settled') cls = 'status-settled';
      this.setData({ statusClass: cls });
    }
  },

  methods: {
    onTap() {
      if (!this.data.room) return;
      this.triggerEvent('tap', { room: this.data.room });
    }
  }
})
