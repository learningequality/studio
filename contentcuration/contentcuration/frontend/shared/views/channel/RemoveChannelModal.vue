<template>

  <KModal
    :title="canEdit ? $tr('deleteTitle') : $tr('removeTitle')"
    :submitText="canEdit ? $tr('deleteChannel') : $tr('removeBtn')"
    :cancelText="$tr('cancel')"
    :submitDisabled="loading"
    data-test="remove-channel-modal"
    @submit="handleSubmit"
    @cancel="close"
  >
    <div
      v-if="loading"
      class="py-4 text-center"
    >
      <KCircularLoader :size="24" />
    </div>
    <template v-else>
      <div
        v-if="canEdit && hasCommunityLibrarySubmission"
        class="mb-3"
        data-test="cl-warning"
      >
        {{ $tr('deleteChannelWithCLWarning') }}
      </div>
      {{ canEdit ? $tr('deletePrompt') : $tr('removePrompt') }}
    </template>
  </KModal>

</template>


<script>

  import { ref, onMounted } from 'vue';
  import client from 'shared/client';
  import { Channel } from 'shared/data/resources';

  export default {
    name: 'RemoveChannelModal',
    setup(props, { emit }) {
      const loading = ref(false);
      const hasCommunityLibrarySubmission = ref(false);

      async function fetchCommunityLibrarySubmissionStatus() {
        loading.value = true;
        try {
          const url = Channel.getUrlFunction('has_community_library_submission')(props.channelId);
          const response = await client.get(url);
          hasCommunityLibrarySubmission.value =
            response.data?.has_community_library_submission ?? false;
        } catch (error) {
          hasCommunityLibrarySubmission.value = false;
        } finally {
          loading.value = false;
        }
      }

      onMounted(() => {
        if (props.canEdit) {
          fetchCommunityLibrarySubmissionStatus();
        }
      });

      function handleSubmit() {
        emit('delete');
      }

      function close() {
        emit('close');
      }

      return {
        loading,
        hasCommunityLibrarySubmission,
        handleSubmit,
        close,
      };
    },
    props: {
      channelId: {
        type: String,
        required: true,
      },
      canEdit: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['delete', 'close'],
    $trs: {
      deleteTitle: 'Delete this channel',
      removeTitle: 'Remove from channel list',
      deleteChannel: 'Delete channel',
      removeBtn: 'Remove',
      cancel: 'Cancel',
      deletePrompt: 'This channel will be permanently deleted. This cannot be undone.',
      removePrompt:
        'You have view-only access to this channel. Confirm that you want to remove it from your list of channels.',
      deleteChannelWithCLWarning:
        'This channel has been shared with the Community Library. Deleting it here will not remove it from the Community Library — it may still be approved or remain available there.',
    },
  };

</script>


<style lang="scss" scoped></style>
