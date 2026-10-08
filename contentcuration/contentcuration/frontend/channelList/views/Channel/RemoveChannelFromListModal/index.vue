<template>

  <KModal
    :title="$tr('removeTitle')"
    :submitText="$tr('removeBtn')"
    :cancelText="$tr('cancel')"
    appendToOverlay
    @submit="handleRemove"
    @cancel="$emit('close')"
  >
    {{ $tr('removePrompt') }}
  </KModal>

</template>


<script>

  import useKSnackbar from 'kolibri-design-system/lib/composables/useKSnackbar';

  import { mapActions } from 'vuex';

  export default {
    name: 'RemoveChannelFromListModal',
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
      ...mapActions('channel', ['removeViewer']),
      handleRemove() {
        const currentUserId = this.$store.state.session.currentUser.id;
        this.removeViewer({ channelId: this.channelId, userId: currentUserId }).then(() => {
          this.createSnackbar({
            text: this.$tr('channelRemovedSnackbar'),
            autoDismiss: true,
            announce: true,
            duration: 6000,
          });
          this.$emit('close');
        });
      },
    },
    $trs: {
      removeBtn: 'Remove',
      removeTitle: 'Remove from channel list',
      removePrompt:
        'You have view-only access to this channel. Confirm that you want to remove it from your list of channels.',
      channelRemovedSnackbar: 'Channel removed',
      cancel: 'Cancel',
    },
  };

</script>
