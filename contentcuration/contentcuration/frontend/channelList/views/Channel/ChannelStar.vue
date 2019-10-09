<template>
  <VBtn
    :title="starText"
    icon
    flat
    color="primary"
    @click.stop.prevent="toggleStar"
  >
    <VIcon>{{ bookmark ? 'star' : 'star_border' }}</VIcon>
  </VBtn>
</template>

<script>

  import { mapMutations } from 'vuex';

  export default {
    name: 'ChannelStar',
    $trs: {
      unstar: 'Remove Star',
      star: 'Add Star',
    },
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
  };

</script>


<style lang="less" scoped>

</style>
