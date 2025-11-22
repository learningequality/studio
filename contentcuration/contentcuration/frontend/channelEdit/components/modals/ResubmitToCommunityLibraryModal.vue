<template>

  <KModal
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
    channel: {
      type: Object,
      required: true,
      validator(value) {
        return value && typeof value.name === 'string' && typeof value.version === 'number';
      },
    },
    latestSubmissionVersion: {
      type: Number,
      required: true,
    },
  });

  const emit = defineEmits(['close', 'resubmit']);

  const title = computed(() => communityChannelsStrings.resubmitModalTitle$());

  const publishedVersion = computed(() => {
    return props.latestSubmissionVersion != null
      ? props.latestSubmissionVersion
      : props.channel.version;
  });

  const description = computed(() =>
    communityChannelsStrings.resubmitModalBodyFirst$({
      channelName: props.channel.name,
      version: publishedVersion.value,
    }),
  );

  const question = computed(() => communityChannelsStrings.resubmitModalBodySecond$());

  const dismissButtonText = computed(() => communityChannelsStrings.dismissAction$());

  const resubmitButtonText = computed(() => communityChannelsStrings.resubmitAction$());

  function handleDismiss() {
    emit('close');
  }

  function handleResubmit() {
    emit('resubmit');
    emit('close');
  }

</script>
