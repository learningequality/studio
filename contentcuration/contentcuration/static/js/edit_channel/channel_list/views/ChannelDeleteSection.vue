<template>
  <div>
    <h4>{{ $tr('deleteTitle') }}</h4>
    <p>{{ $tr('deletePrompt') }}</p>
    <a class="delete-channel" @click="handleDeleteChannel">
      {{ $tr('deleteChannel') }}
    </a>
  </div>
</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import { dialog } from 'edit_channel/utils/dialog';

  export default {
    name: 'ChannelDeleteSection',
    $trs: {
      deleteTitle: 'Delete this Channel',
      deletePrompt: 'Once you delete a channel, the channel will be permanently deleted.',
      deleteChannel: 'Delete channel',
      deletingChannel: 'Deleting Channel...',
      deleteWarning:
        'All content under this channel will be deleted.\nAre you sure you want to delete this channel?',
      cancel: 'Cancel',
    },
    computed: mapState('channel_list', {
      channel: 'activeChannel',
    }),
    methods: {
      ...mapActions('channel_list', ['deleteChannel']),
      handleDeleteChannel() {
        dialog(
          this.$tr('deletingChannel'),
          this.$tr('deleteWarning'),
          {
            [this.$tr('cancel')]: () => {},
            [this.$tr('deleteChannel')]: () => {
              this.deleteChannel(this.channel.id);
              this.$emit('deletedChannel');
            },
          },
          null
        );
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../../less/channel_list.less';

  h4 {
    margin: 2px 0;
    font-size: 10pt;
    font-weight: bold;
    color: @gray-800;
  }
  p {
    margin-top: 5px;
    margin-bottom: 20px;
  }
  a {
    font-weight: bold;
    color: @delete-color;
    text-transform: uppercase;
  }

</style>
