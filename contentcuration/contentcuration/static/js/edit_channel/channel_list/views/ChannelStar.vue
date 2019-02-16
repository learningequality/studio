<template>
    <a
      :title="starText"
      class="option star-option material-icons"
      :class="{starred: channel.STARRED && !channel.STARRING, spinner: channel.STARRING}"
      @click.stop="toggleStar"
    />

</template>

<script>

import { mapActions } from 'vuex';

export default {
  name: 'ChannelStar',
  $trs: {
    unstarChannel: "Unstar Channel",
    starChannel: "Star Channel"
  },

  props: {
    channel: {
      type: Object,
      required: true,
    }
  },
  computed: {
    starText() {
      return this.channel.STARRED ? this.$tr('unstarChannel') : this.$tr('starChannel');
    }
  },
  methods: Object.assign(
    mapActions('channel_list', [
      'addStar',
      'removeStar'
    ]),
    {
      toggleStar() {
        (this.channel.STARRED)? this.removeStar(this.channel) : this.addStar(this.channel);
      }
    }
  )
};

</script>


<style lang="less" scoped>

@import '../../../../less/channel_list.less';

.star-option {
  cursor: pointer;
  &::before {
    .material-icons;
    content: "star_border";
  }
  &.starred {
    &::before {
      content: "star";
    }
  }
}

</style>
