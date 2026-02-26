<template>

  <KModal
    :title="$tr('deleteTitle')"
    :submitText="$tr('deleteChannel')"
    :cancelText="$tr('cancel')"
    appendToOverlay
    @submit="handleDelete"
    @cancel="$emit('close')"
  >
    {{ $tr('deletePrompt') }}
  </KModal>

</template>


<script>

  import { mapActions } from 'vuex';

  export default {
    name: 'DeleteChannelModal',
    props: {
      channelId: {
        type: String,
        required: true,
      },
    },
    methods: {
      ...mapActions('channel', ['deleteChannel']),
      handleDelete() {
        this.deleteChannel(this.channelId).then(() => {
          this.$store.dispatch('showSnackbarSimple', this.$tr('channelDeletedSnackbar'));
          this.$emit('close');
        });
      },
    },
    $trs: {
      deleteChannel: 'Delete channel',
      deleteTitle: 'Delete this channel',
      deletePrompt: 'This channel will be permanently deleted. This cannot be undone.',
      channelDeletedSnackbar: 'Channel deleted',
      cancel: 'Cancel',
    },
  };

</script>
