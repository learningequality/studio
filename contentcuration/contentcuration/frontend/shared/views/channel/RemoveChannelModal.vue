<template>

  <KModal
    v-if="dialog"
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
      class="text-center py-4"
    >
      <VProgressCircular
        indeterminate
        size="24"
      />
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

  import { defineComponent, ref, computed, watch, getCurrentInstance } from 'vue';
  import client from 'shared/client';

  export default defineComponent({
    name: 'RemoveChannelModal',
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      channelId: {
        type: String,
        required: true,
      },
      canEdit: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['input', 'delete'],
    setup(props, { emit }) {
      const { proxy } = getCurrentInstance();
      const loading = ref(false);
      const hasCommunityLibrarySubmission = ref(false);

      const dialog = computed({
        get() {
          return props.value;
        },
        set(value) {
          emit('input', value);
        },
      });

      watch(dialog, (newValue) => {
        if (newValue && props.canEdit) {
          fetchCommunityLibrarySubmissionStatus();
        } else {
          hasCommunityLibrarySubmission.value = false;
          loading.value = false;
        }
      });

      async function fetchCommunityLibrarySubmissionStatus() {
        loading.value = true;
        try {
          const detailUrl = window.Urls.channel_detail(props.channelId);
          const url = `${detailUrl.replace(/\/$/, '')}/has_community_library_submission`;
          const response = await client.get(url);
          hasCommunityLibrarySubmission.value = response.data?.has_community_library_submission ?? false;
        } catch (error) {
          hasCommunityLibrarySubmission.value = false;
        } finally {
          loading.value = false;
        }
      }

      function handleSubmit() {
        emit('delete');
      }

      function close() {
        dialog.value = false;
      }

      const $tr = (messageId) => {
        return proxy.$tr(messageId);
      };

      return {
        loading,
        hasCommunityLibrarySubmission,
        dialog,
        handleSubmit,
        close,
        $tr,
      };
    },
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
  });

</script>


<style lang="scss" scoped></style>

