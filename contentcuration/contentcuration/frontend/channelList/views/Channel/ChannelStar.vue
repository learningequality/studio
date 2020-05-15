<template>

  <!-- Adding div wrapper as tests fail when VTooltip is the root -->
  <IconButton
    data-test="button"
    :icon="bookmark ? 'star' : 'star_border'"
    :text="starText"
    v-bind="$attrs"
    @click.stop.prevent="toggleStar"
    @mouseenter="$emit('mouseenter')"
    @mouseleave="$emit('mouseleave')"
  />

</template>

<script>

  import { mapActions } from 'vuex';
  import IconButton from 'shared/views/IconButton';

  export default {
    name: 'ChannelStar',
    components: {
      IconButton,
    },
    props: {
      channelId: {
        type: String,
        required: true,
      },
      bookmark: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      starText() {
        return this.bookmark ? this.$tr('unstar') : this.$tr('star');
      },
    },
    methods: {
      ...mapActions('channel', ['bookmarkChannel']),
      toggleStar() {
        this.bookmarkChannel({ id: this.channelId, bookmark: !this.bookmark });
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
