Component({
  properties: {
    type: {
      type: String,
      value: 'list' // user-card | room-card | friend-item | stats-card | list
    },
    count: {
      type: Number,
      value: 3 // 列表类型时的数量
    }
  }
})
