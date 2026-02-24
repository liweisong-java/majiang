Component({
  properties: {
    record: {
      type: Object,
      value: null
    }
  },

  data: {
    timeText: ''
  },

  observers: {
    'record.playedAt': function(playedAt) {
      if (playedAt) {
        const d = new Date(playedAt);
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        this.setData({ timeText: `${hours}:${minutes}` });
      }
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('tap', { record: this.data.record });
    }
  }
})
