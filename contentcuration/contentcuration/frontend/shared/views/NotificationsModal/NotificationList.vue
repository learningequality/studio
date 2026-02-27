<template>

  <div class="notifications-list-wrapper">
    <KCircularLoader v-if="isLoading" />
    <div
      v-else-if="notifications.length === 0"
      class="empty-notifications-message"
    >
      {{ hasFiltersApplied ? emptyNotificationsWithFiltersNotice$() : emptyNotificationsNotice$() }}
    </div>
    <div v-else>
      <div class="notifications-list-header">
        <strong> {{ newLabel$() }} </strong>
        <KButton
          v-if="showClearAll"
          primary
          :text="clearAllAction$()"
          :appearanceOverrides="{
            textTransform: 'none',
          }"
          appearance="flat-button"
          @click="$emit('notificationsRead')"
        />
      </div>
      <div>
        <ul>
          <component
            :is="NotificationTypeToComponent[notification.type] || 'div'"
            v-for="notification in notifications"
            :key="`${notification.id}-${notification.type}`"
            :notification="notification"
            @viewMore="goToSubmissionDetails(notification)"
          />
        </ul>
        <div
          v-if="hasMore"
          class="load-more"
        >
          <KButton
            :text="showOlderAction$()"
            appearance="basic-link"
            :disabled="isLoadingMore"
            @click="$emit('fetchMore')"
          />
        </div>
      </div>
    </div>
  </div>

</template>


<script setup>

  import CommunityLibrarySubmissionApproval from './notificationTypes/CommunityLibrarySubmissionApproval.vue';
  import CommunityLibrarySubmissionRejection from './notificationTypes/CommunityLibrarySubmissionRejection.vue';
  import CommunityLibrarySubmissionCreation from './notificationTypes/CommunityLibrarySubmissionCreation.vue';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import { NotificationType } from 'shared/constants';
  import { getCommunityLibrarySubmissionDetailsUrl } from 'shared/utils/helpers';

  defineProps({
    notifications: {
      type: Array,
      required: true,
    },
    isLoading: {
      type: Boolean,
      default: false,
    },
    isLoadingMore: {
      type: Boolean,
      default: false,
    },
    hasMore: {
      type: Boolean,
      default: false,
    },
    hasFiltersApplied: {
      type: Boolean,
      default: false,
    },
    showClearAll: {
      type: Boolean,
      default: false,
    },
  });

  defineEmits(['notificationsRead', 'fetchMore']);

  /**
   * Each notification type should have a corresponding component renderer.
   * This mapping defines which component to use for each notification type.
   *
   * Each notification renderer component should reuse the `NotificationBase` component
   * and accept a `notification` prop.
   */
  const NotificationTypeToComponent = {
    [NotificationType.COMMUNITY_LIBRARY_SUBMISSION_APPROVED]: CommunityLibrarySubmissionApproval,
    [NotificationType.COMMUNITY_LIBRARY_SUBMISSION_REJECTED]: CommunityLibrarySubmissionRejection,
    [NotificationType.COMMUNITY_LIBRARY_SUBMISSION_CREATED]: CommunityLibrarySubmissionCreation,
  };

  const goToSubmissionDetails = notification => {
    const channelId = notification.channel_id;
    const submissionId = notification.id;
    const url = getCommunityLibrarySubmissionDetailsUrl(channelId, submissionId);
    window.location.href = url;
  };

  const {
    newLabel$,
    clearAllAction$,
    showOlderAction$,
    emptyNotificationsNotice$,
    emptyNotificationsWithFiltersNotice$,
  } = communityChannelsStrings;

</script>


<style scoped lang="scss">

  .notifications-list-wrapper {
    margin-top: 8px;

    ul {
      padding: 0;
      margin: 0;
      list-style-type: none;
    }
  }

  .notifications-list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px;
    border-bottom: 1px solid v-bind('$themeTokens.fineLine');
  }

  .load-more {
    display: flex;
    justify-content: center;
    margin-top: 16px;
  }

</style>
