<template>

  <KModal :title="previewYourDraftTitle$()">
    <template #default>
      <div>
        <strong>{{ draftTokenLabel$() }}</strong>
        <StudioCopyToken
          :token="channel.draft_token"
          :showLabel="false"
        />
        <p class="mt-16">{{ channelTokenDescription$() }}</p>
      </div>
    </template>
    <template #actions>
      <KButton
        :text="dismissAction$()"
        @click="handleDismiss"
      />
    </template>
  </KModal>

</template>


<script setup>

  import { onMounted } from 'vue';
  import StudioCopyToken from 'shared/views/StudioCopyToken';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import { commonStrings } from 'shared/strings/commonStrings';
  import logging from 'shared/logging';

  const props = defineProps({
    channel: {
      type: Object,
      required: true,
    },
  });

  const emit = defineEmits(['close']);

  const { dismissAction$ } = commonStrings;
  const { previewYourDraftTitle$, draftTokenLabel$, channelTokenDescription$ } =
    communityChannelsStrings;

  function handleDismiss() {
    emit('close');
  }

  onMounted(() => {
    if (!props.channel.draft_token) {
      // If there is no draft token, we can't preview the draft, so we just close the modal
      logging.error(
        'Attempted to open PreviewDraftChannelModal without a draft token. Closing modal.',
        { channelId: props.channel.id },
      );
      handleDismiss();
    }
  });

</script>


<style lang="scss" scoped>

  .mt-16 {
    margin-top: 16px;
  }

</style>
