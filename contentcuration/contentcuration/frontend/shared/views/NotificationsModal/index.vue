<template>

  <FullscreenModal
    :value="isModalOpen"
    @input="isModalOpen = false"
  >
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
        class="notifications-page-container"
        :style="containerStyles"
      >
        <h1>{{ notificationsLabel$() }}</h1>
        <ToolBar color="white">
          <Tabs
            v-model="selectedTab"
            slider-color="primary"
            height="64px"
            :showArrows="false"
          >
            <VTab
              class="px-3"
              :disabled="isLoading || isLoadingMore"
              @click="selectedTab = NotificationsTab.UNREAD"
            >
              {{ unreadNotificationsLabel$() }}
            </VTab>
            <VTab
              class="px-3"
              :disabled="isLoading || isLoadingMore"
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
            :disabled="isLoading || isLoadingMore"
            @update:queryParams="queryParams = $event"
          />
          <NotificationList
            :hasMore="hasMore"
            :notifications="notifications"
            :isLoading="isLoading"
            :isLoadingMore="isLoadingMore"
            :hasFiltersApplied="hasFiltersApplied"
            @fetchData="fetchData"
            @fetchMore="fetchMore"
          />
        </div>
      </div>
    </template>
  </FullscreenModal>

</template>


<script setup>

  import { computed, ref, watch } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  import FullscreenModal from '../FullscreenModal.vue';
  import NotificationFilters from './NotificationFilters.vue';
  import NotificationList from './NotificationList.vue';
  import useCommunityLibraryUpdates from './composables/useCommunityLibraryUpdates';
  import Tabs from 'shared/views/Tabs';
  import ToolBar from 'shared/views/ToolBar';
  import { commonStrings } from 'shared/strings/commonStrings';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

  const NotificationsTab = {
    UNREAD: 0,
    ALL: 1,
  };

  const isModalOpen = ref(true);
  const selectedTab = ref(NotificationsTab.UNREAD);
  const queryParams = ref({});

  const { notificationsLabel$, unreadNotificationsLabel$, allNotificationsLabel$ } =
    communityChannelsStrings;

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

  const {
    hasMore,
    submissionsUpdates: notifications,
    isLoading,
    isLoadingMore,
    fetchData,
    fetchMore,
  } = useCommunityLibraryUpdates({ queryParams });

  const hasFiltersApplied = computed(() => {
    return Object.keys(queryParams.value).length > 0;
  });

  watch(queryParams, () => {
    fetchData();
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
    padding: 24px;
    margin: 0 auto;
  }

  .notifications-page-content {
    margin-top: 16px;
  }

</style>
