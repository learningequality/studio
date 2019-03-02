<template>
    <Star
      :starred="channel.STARRED"
      @starred="addStar(channel)"
      @unstarred="removeStar(channel)"
    />
</template>

<script>

import { mapActions } from 'vuex';
import Star from 'edit_channel/sharedComponents/Star.vue';

export default {
  name: 'ChannelStar',
  components: {
    Star
  },
  props: {
    channel: {
      type: Object,
      required: true,
    }
  },
  methods: mapActions('channel_list', [
    'addStar',
    'removeStar'
  ])
};

</script>


<style lang="less" scoped>

</style>
