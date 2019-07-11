<template>
  <VBtn
    :title="starText"
    icon
    flat
    color="primary"
    @click.stop.prevent="toggleStar"
  >
    <VIcon>{{ channel.bookmark ? 'star' : 'star_border' }}</VIcon>
  </VBtn>
</template>

<script>

  import { mapActions } from 'vuex';

  export default {
    name: 'Star',
    $trs: {
      unstar: 'Remove Star',
      star: 'Add Star',
    },
    props: {
      channel: {
        type: Object,
        required: true,
      },
    },
    computed: {
      starText() {
        return this.channel.bookmark ? this.$tr('unstar') : this.$tr('star');
      },
    },
    methods: {
      ...mapActions('channelList', ['addStar', 'removeStar']),
      toggleStar() {
        if (!this.channel.bookmark) {
          this.addStar(this.channel.id)
        } else {
          this.removeStar(this.channel.id);
        }
      },
    },
  };

</script>


<style lang="less" scoped>

</style>
