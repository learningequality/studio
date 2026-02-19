<template>

  <StudioImmersiveModal v-model="isModalOpen">
    <template #header>
      <span>
        {{ notificationsLabel$() }}
      </span>
    </template>
    <template #default>
      <div
        v-if="isModalOpen"
        class="notifications-page-container"
        :style="[
          containerStyles,
          {
            color: $themeTokens.text,
          },
        ]"
      >
        <h1>{{ notificationsLabel$() }}</h1>
        <ToolBar color="white">
          <Tabs
            v-model="selectedTab"
            height="64px"
            :showArrows="false"
          >
            <VTab
              class="px-3"
              :disabled="isBusy"
              :value="NotificationsTab.UNREAD"
            >
              {{ unreadNotificationsLabel$() }}
            </VTab>
            <VTab
              class="px-3"
              :disabled="isBusy"
              :value="NotificationsTab.ALL"
            >
              {{ allNotificationsLabel$() }}
            </VTab>
          </Tabs>
        </ToolBar>
        <div
          class="notifications-page-content"
          :style="contentWrapperStyles"
        >
          <NotificationFilters
            :disabled="isBusy"
            @update:filters="filters = $event"
          />
          <!--
            Only show Clear all if no filters are applied, because we can just mark a
            latest read timestamp and cannot selectively clear notifications when filters
            are applied
          -->
          <NotificationList
            :hasMore="hasMore"
            :notifications="notifications"
            :isLoading="isLoading"
            :isLoadingMore="isLoadingMore"
            :hasFiltersApplied="hasFiltersApplied"
            :showClearAll="!hasFiltersApplied && selectedTab === NotificationsTab.UNREAD"
            @notificationsRead="handleNotificationsRead"
            @fetchMore="fetchMore"
          />
        </div>
      </div>
    </template>
  </StudioImmersiveModal>

</template>


<script setup>

  import { computed, ref, watch } from 'vue';
  import isEqual from 'lodash/isEqual';
  import { useRoute, useRouter } from 'vue-router/composables';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  import NotificationFilters from './NotificationFilters.vue';
  import NotificationList from './NotificationList.vue';
  import useCommunityLibraryUpdates from './composables/useCommunityLibraryUpdates';
  import StudioImmersiveModal from 'shared/views/StudioImmersiveModal.vue';
  import Tabs from 'shared/views/Tabs';
  import ToolBar from 'shared/views/ToolBar';
  import { commonStrings } from 'shared/strings/commonStrings';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import { Modals } from 'shared/constants';
  import useStore from 'shared/composables/useStore';
  import useSnackbar from 'shared/composables/useSnackbar';

  const NotificationsTab = {
    UNREAD: 0,
    ALL: 1,
  };

  const router = useRouter();
  const route = useRoute();
  const store = useStore();
  const { createSnackbar } = useSnackbar();

  const previousQuery = ref(null);
  const isSaving = ref(false);

  const isModalOpen = computed({
    get() {
      const modalParam = route.query.modal;
      return modalParam === Modals.NOTIFICATIONS;
    },
    set(value) {
      if (!value) {
        router.push({
          query: {
            ...(previousQuery.value || {}),
            modal: undefined,
          },
        });
      }
    },
  });

  watch(
    isModalOpen,
    (newVal, oldVal) => {
      if (newVal && !oldVal) {
        // Store previous query params to restore when closing modal
        previousQuery.value = { ...route.query };
      } else if (!newVal && oldVal) {
        previousQuery.value = null;
      }
    },
    { immediate: true },
  );

  const selectedTab = ref(NotificationsTab.UNREAD);
  const filters = ref(null);

  const { notificationsLabel$, unreadNotificationsLabel$, allNotificationsLabel$ } =
    communityChannelsStrings;

  const lastReadNotificationDate = computed(() => {
    return store.state.session.currentUser?.last_read_notification_date;
  });

  const handleNotificationsRead = async () => {
    isSaving.value = true;
    try {
      const [newestNotification] = notifications.value;
      if (newestNotification) {
        // Add 1 second to avoid precision issues
        const timestamp = new Date(newestNotification.date);
        timestamp.setSeconds(timestamp.getSeconds() + 1);

        await store.dispatch('markNotificationsRead', timestamp.toISOString());
      }
    } catch (error) {
      createSnackbar(commonStrings.genericErrorMessage$());
    } finally {
      isSaving.value = false;
    }
  };

  const isBusy = computed(() => {
    return isSaving.value || isLoading.value || isLoadingMore.value;
  });

  const lastReadFilter = computed(() => {
    if (selectedTab.value !== NotificationsTab.UNREAD) {
      return null;
    }
    return lastReadNotificationDate.value;
  });

  const queryParams = computed(() => {
    if (!filters.value || !isModalOpen.value) {
      // Filters not set yet or modal is closed
      // Adding `filters` and `isModalOpen` as dependencies to re-trigger the `fetchData` watcher
      // when modal is opened or filters are applied for the first time
      return null;
    }
    return {
      ...filters.value,
      lastRead: lastReadFilter.value,
    };
  });

  const {
    hasMore,
    submissionsUpdates: notifications,
    isLoading,
    isLoadingMore,
    fetchData,
    fetchMore,
  } = useCommunityLibraryUpdates({ queryParams });

  watch(queryParams, (newValue, oldValue) => {
    if (isEqual(newValue, oldValue) || newValue === null) {
      return;
    }
    fetchData();
  });

  const hasFiltersApplied = computed(() => {
    return Object.keys(filters.value || {}).length > 0;
  });

  const { windowIsSmall } = useKResponsiveWindow();

  const containerStyles = computed(() => {
    if (windowIsSmall.value) {
      return {
        padding: '16px 8px',
      };
    }
    return {
      padding: '24px 48px',
    };
  });

  const contentWrapperStyles = computed(() => {
    if (windowIsSmall.value) {
      return {
        padding: '0 16px',
      };
    }
    return {
      padding: '0 48px',
    };
  });

</script>


<style scoped lang="scss">

  .notifications-page-container {
    max-width: 1000px;
    margin: 0 auto;
  }

  .notifications-page-content {
    margin-top: 16px;
  }

</style>
