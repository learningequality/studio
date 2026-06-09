<template>

  <NotificationBase
    :title="title"
    :date="notification.date"
  >
    <template
      v-if="notification.feedback_notes"
      #default
    >
      <KTextTruncator
        :text="notification.feedback_notes"
        :maxLines="1"
      />
    </template>
    <template #footer>
      <div class="chips">
        <CommunityLibraryChip />
        <StatusChip :status="CommunityLibraryStatus.APPROVED" />
      </div>
    </template>
    <template #action>
      <KButton
        :text="viewMoreAction$()"
        appearance="basic-link"
        @click="$emit('viewMore')"
      />
    </template>
  </NotificationBase>

</template>


<script setup>

  import { computed } from 'vue';
  import NotificationBase from './NotificationBase.vue';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import StatusChip from 'shared/views/communityLibrary/CommunityLibraryStatusChip.vue';
  import CommunityLibraryChip from 'shared/views/communityLibrary/CommunityLibraryChip.vue';
  import { CommunityLibraryStatus } from 'shared/constants';

  const props = defineProps({
    notification: {
      type: Object,
      required: true,
    },
  });

  const { channelVersion$, viewMoreAction$ } = communityChannelsStrings;

  const title = computed(() =>
    channelVersion$({
      name: props.notification.channel_name,
      version: props.notification.channel_version,
    }),
  );

</script>


<style scoped>

  .chips {
    display: flex;
    gap: 8px;
  }

</style>
