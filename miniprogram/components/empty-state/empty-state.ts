Component({
  properties: {
    message: {
      type: String,
      value: '暂无数据'
    },
    type: {
      type: String,
      value: 'default' // game | friends | stats | default
    },
    buttonText: {
      type: String,
      value: ''
    }
  },

  methods: {
    onButtonTap() {
      this.triggerEvent('buttontap');
    }
  }
})
