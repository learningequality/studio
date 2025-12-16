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
              @click="selectedTab = NotificationsTab.UNREAD"
            >
              {{ unreadNotificationsLabel$() }}
            </VTab>
            <VTab
              class="px-3"
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
          <NotificationFilters />
        </div>
      </div>
    </template>
  </FullscreenModal>

</template>


<script setup>

  import { computed, ref } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  import FullscreenModal from '../FullscreenModal.vue';
  import NotificationFilters from './NotificationFilters.vue';
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
