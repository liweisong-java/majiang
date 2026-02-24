Component({
  properties: {
    player: {
      type: Object,
      value: null
    },
    rank: {
      type: Number,
      value: 0
    },
    showBalance: {
      type: Boolean,
      value: true
    }
  },

  data: {
    rankIcon: ''
  },

  observers: {
    'rank': function(rank) {
      let rankIcon = '';
      if (rank === 1) rankIcon = '🥇';
      else if (rank === 2) rankIcon = '🥈';
      else if (rank === 3) rankIcon = '🥉';
      else rankIcon = rank.toString();
      this.setData({ rankIcon });
    }
  }
})
