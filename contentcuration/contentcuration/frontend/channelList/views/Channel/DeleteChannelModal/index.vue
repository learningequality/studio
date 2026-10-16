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

  import useKSnackbar from 'kolibri-design-system/lib/composables/useKSnackbar';

  import { mapActions } from 'vuex';

  export default {
    name: 'DeleteChannelModal',
    setup() {
      const { createSnackbar } = useKSnackbar();
      return { createSnackbar };
    },
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
          this.createSnackbar({
            text: this.$tr('channelDeletedSnackbar'),
            autoDismiss: true,
            announce: true,
            duration: 6000,
          });
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
