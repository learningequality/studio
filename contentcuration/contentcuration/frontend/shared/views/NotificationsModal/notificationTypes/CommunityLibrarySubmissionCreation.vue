<template>

  <NotificationBase
    :title="title"
    :date="notification.date_created"
  >
    <template #default>
      {{ submissionCreationNotification$() }}
    </template>
    <template #footer>
      <StatusChip :status="CommunityLibraryStatus.PENDING" />
    </template>
  </NotificationBase>

</template>


<script setup>

  import { computed } from 'vue';
  import NotificationBase from './NotificationBase.vue';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import StatusChip from 'shared/views/communityLibrary/CommunityLibraryStatusChip.vue';
  import { CommunityLibraryStatus } from 'shared/constants';

  const props = defineProps({
    notification: {
      type: Object,
      required: true,
    },
  });

  const { channelVersion$, submissionCreationNotification$ } = communityChannelsStrings;

  const title = computed(() =>
    channelVersion$({
      name: props.notification.channel_name,
      version: props.notification.channel_version,
    }),
  );

</script>
