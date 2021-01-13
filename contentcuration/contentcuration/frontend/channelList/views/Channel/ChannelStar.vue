<template>

  <!-- Adding div wrapper as tests fail when VTooltip is the root -->
  <div style="display: inline-block;">
    <IconButton
      data-test="button"
      :icon="bookmark ? 'star' : 'starBorder'"
      :text="starText"
      v-bind="$attrs"
      @click="toggleStar"
    />
  </div>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
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
      ...mapGetters('channel', ['getChannel']),
      starText() {
        return this.bookmark ? this.$tr('unstar') : this.$tr('star');
      },
      channelName() {
        const { name = '' } = this.getChannel(this.channelId) || {};
        return name;
      },
    },
    methods: {
      ...mapActions('channel', ['bookmarkChannel']),
      toggleStar() {
        const isBookmarked = this.bookmark;
        this.bookmarkChannel({ id: this.channelId, bookmark: !this.bookmark }).then(() => {
          this.$store.dispatch(
            'showSnackbarSimple',
            isBookmarked ? this.$tr('unstarred') : this.$tr('starred')
          );

          this.$analytics.trackAction('channel_list', isBookmarked ? 'Unstar' : 'Star', {
            eventLabel: this.channelName,
          });
        });
      },
    },
    $trs: {
      unstar: 'Remove from starred channels',
      star: 'Add to starred channels',
      unstarred: 'Removed from starred channels',
      starred: 'Added to starred channels',
    },
  };

</script>


<style lang="less" scoped>

</style>
