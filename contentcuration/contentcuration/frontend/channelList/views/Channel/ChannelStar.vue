<template>

  <!-- Adding div wrapper as tests fail when VTooltip is the root -->
  <div>
    <VTooltip bottom>
      <template v-slot:activator="{ on }">
        <VBtn
          icon
          flat
          v-bind="$attrs"
          data-test="button"
          @click.stop.prevent="toggleStar"
        >
          <VIcon data-test="icon" class="notranslate">
            {{ bookmark ? 'star' : 'star_border' }}
          </VIcon>
        </VBtn>
      </template>
      <span>{{ starText }}</span>
    </VTooltip>
  </div>

</template>

<script>

  import { mapActions } from 'vuex';

  export default {
    name: 'ChannelStar',
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
      ...mapActions('channelList', ['bookmarkChannel']),
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
