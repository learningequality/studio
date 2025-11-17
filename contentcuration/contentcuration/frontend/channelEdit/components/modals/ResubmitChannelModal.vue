<template>

  <KModal
    v-if="value"
    :title="title"
    :submitText="resubmitButtonText"
    :cancelText="dismissButtonText"
    data-test="resubmit-modal"
    @submit="handleResubmit"
    @cancel="handleDismiss"
  >
    <div class="resubmit-modal-content">
      <p class="resubmit-modal-description">{{ description }}</p>
      <p class="resubmit-modal-question">{{ question }}</p>
    </div>
  </KModal>

</template>


<script setup>

  import { computed } from 'vue';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

  const props = defineProps({
      value: {
        type: Boolean,
        default: false,
      },
      channel: {
        type: Object,
        required: true,
        validator(value) {
          return value && typeof value.name === 'string' && typeof value.version === 'number';
        },
      },
    latestSubmissionVersion: {
      type: Number,
      default: null,
    },
  });

  const emit = defineEmits(['dismiss', 'resubmit', 'input']);

  const title = computed(() => communityChannelsStrings.resubmitModalTitle$());

  const publishedVersion = computed(() => {
    return props.latestSubmissionVersion != null ? props.latestSubmissionVersion : props.channel.version;
  });

  const description = computed(() =>
    communityChannelsStrings.resubmitModalBodyFirst$({
      channelName: props.channel.name,
      version: publishedVersion.value,
    }),
  );

  const question = computed(() => communityChannelsStrings.resubmitModalBodySecond$());

  const dismissButtonText = computed(() => communityChannelsStrings.dismissButton$());

  const resubmitButtonText = computed(() => communityChannelsStrings.resubmitButton$());

  function handleDismiss() {
    emit('dismiss');
    emit('input', false);
  }

  function handleResubmit() {
    emit('resubmit');
    emit('input', false);
  }

</script>
