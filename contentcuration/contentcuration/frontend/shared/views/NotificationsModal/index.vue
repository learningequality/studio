<template>

  <FullscreenModal :value="isModalOpen">
    <template #close>
      <div class="back-action">
        <KIconButton
          icon="back"
          :ariaLabel="commonStrings.backAction$()"
          :color="$themeTokens.textInverted"
          @click="isModalOpen = false"
        />

        <span>
          {{ commonStrings.backAction$() }}
        </span>
      </div>
    </template>
    <template #default>
      <div
        v-if="isModalOpen"
        class="notifications-page-container"
        :style="containerStyles"
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
              @click="selectedTab = NotificationsTab.UNREAD"
            >
              {{ unreadNotificationsLabel$() }}
            </VTab>
            <VTab
              class="px-3"
              :disabled="isBusy"
              @click="selectedTab = NotificationsTab.ALL"
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
            :lastReadFilter="lastReadFilter"
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
  </FullscreenModal>

</template>


<script setup>

  import { computed, ref, watch } from 'vue';
  import isEqual from 'lodash/isEqual';
  import { useRoute, useRouter } from 'vue-router/composables';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  import FullscreenModal from '../FullscreenModal.vue';
  import NotificationFilters from './NotificationFilters.vue';
  import NotificationList from './NotificationList.vue';
  import useCommunityLibraryUpdates from './composables/useCommunityLibraryUpdates';
  import Tabs from 'shared/views/Tabs';
  import ToolBar from 'shared/views/ToolBar';
  import { commonStrings } from 'shared/strings/commonStrings';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import { Modals } from 'shared/constants';
  import useStore from 'shared/composables/useStore';
  import { User } from 'shared/data/resources';

  const NotificationsTab = {
    UNREAD: 0,
    ALL: 1,
  };

  const router = useRouter();
  const route = useRoute();
  const store = useStore();

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

  const waitForLastReadUpdate = async () => {
    return new Promise(resolve => {
      let timeoutId = null;

      const unwatch = watch(lastReadNotificationDate, (newValue, oldValue) => {
        if (newValue !== oldValue) {
          clearTimeout(timeoutId);
          unwatch();
          resolve();
        }
      });

      // Set timeout for 5 seconds
      timeoutId = setTimeout(() => {
        unwatch();
        resolve();
      }, 5000);
    });
  };

  const handleNotificationsRead = async () => {
    isSaving.value = true;
    const [newestNotification] = notifications.value;
    if (newestNotification) {
      // Add 1 second to avoid precisision issues
      const timestamp = new Date(newestNotification.date);
      timestamp.setSeconds(timestamp.getSeconds() + 1);
      await User.markNotificationsRead(timestamp.toISOString());

      // Refresh the notifications list after notifications read timestamp is updated
      // in the vuex store
      await waitForLastReadUpdate();
    }
    isSaving.value = false;
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
        padding: '16px',
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

  .back-action {
    display: flex;
    gap: 16px;
    align-items: center;
    font-size: 14px;
  }

  .notifications-page-container {
    max-width: 1000px;
    margin: 0 auto;
  }

  .notifications-page-content {
    margin-top: 16px;
  }

</style>
