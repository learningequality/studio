<template>

  <VBtn
    :title="starText"
    icon
    flat
    color="primary"
    data-test="button"
    @click.stop.prevent="toggleStar"
  >
    <VIcon data-test="icon">
      {{ bookmark ? 'star' : 'star_border' }}
    </VIcon>
  </VBtn>

</template>

<script>

  import { mapMutations } from 'vuex';

  export default {
    name: 'ChannelStar',
    props: {
      channelId: {
        type: String,
        required: true,
      },
      bookmark: {
        type: Boolean,
        required: true,
      },
    },
    computed: {
      starText() {
        return this.bookmark ? this.$tr('unstar') : this.$tr('star');
      },
    },
    methods: {
      ...mapMutations('channelList', {
        toggleBookmark: 'TOGGLE_BOOKMARK',
      }),
      toggleStar() {
        this.toggleBookmark(this.channelId);
      },
    },
    $trs: {
      unstar: 'Remove Star',
      star: 'Add Star',
    },
  };

</script>


<style lang="less" scoped>

</style>
