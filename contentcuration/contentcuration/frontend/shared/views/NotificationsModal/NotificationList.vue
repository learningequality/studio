<template>

  <div>
    <div class="notifications-list-header">
      <strong> {{ newLabel$() }} </strong>
      <KButton
        primary
        :text="clearAllAction$()"
        appearance="flat-button"
      />
    </div>
    <ul v-if="!isLoading">
      <component
        :is="NotificationTypeToComponent[notification.type]"
        v-for="(notification, index) in notifications"
        :key="index"
        :notification="notification"
      />
    </ul>
  </div>

</template>


<script setup>

  import CommunityLibrarySubmissionApproval from './notificationTypes/CommunityLibrarySubmissionApproval.vue';
  import CommunityLibrarySubmissionRejection from './notificationTypes/CommunityLibrarySubmissionRejection.vue';
  import CommunityLibrarySubmissionCreation from './notificationTypes/CommunityLibrarySubmissionCreation.vue';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import { NotificationType } from 'shared/constants';

  defineProps({
    notifications: {
      type: Array,
      required: true,
    },
    isLoading: {
      type: Boolean,
      default: false,
    },
  });

  const NotificationTypeToComponent = {
    [NotificationType.COMMUNITY_LIBRARY_SUBMISSION_APPROVED]: CommunityLibrarySubmissionApproval,
    [NotificationType.COMMUNITY_LIBRARY_SUBMISSION_REJECTED]: CommunityLibrarySubmissionRejection,
    [NotificationType.COMMUNITY_LIBRARY_SUBMISSION_CREATED]: CommunityLibrarySubmissionCreation,
  };
  const { newLabel$, clearAllAction$ } = communityChannelsStrings;

</script>


<style scoped lang="scss">

  .notifications-list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px;
    border-bottom: 1px solid v-bind('$themeTokens.fineLine');
  }

</style>
