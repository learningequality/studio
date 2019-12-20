<template>

  <VTooltip bottom>
    <template v-slot:activator="{ on }">
      <VBtn
        icon
        flat
        v-bind="$attrs"
        data-test="button"
        v-on="on"
        @click.stop.prevent="toggleStar"
      >
        <VIcon data-test="icon">
          {{ bookmark ? 'star' : 'star_border' }}
        </VIcon>
      </VBtn>
    </template>
    <span>{{ starText }}</span>
  </VTooltip>

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
