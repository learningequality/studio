<template>

  <Accordion :title="activityHistoryLabel$()">
    <template #default="{ isOpen }">
      <KCircularLoader v-if="isLoading" />
      <div v-else>
        <div
          :style="{
            borderBottom: `1px solid ${$themeTokens.fineLine}`,
            width: '100%',
          }"
        >
          <strong>
            {{ newLabel$() }}
          </strong>
        </div>
        <ul class="activity-list">
          <li
            v-for="update in getUpdates(isOpen)"
            :key="`${update.id}-${update.type}`"
            :style="{
              border: `1px solid ${$themeTokens.fineLine}`,
              borderRadius: '8px',
              padding: '16px',
            }"
          >
            <div class="update-header">
              <strong> {{ getUpdateTitle(update) }}</strong>
              <div class="d-flex no-shrink">
                <CommunityLibraryStatusChip :status="update.status" />

                <span class="update-date">
                  {{ $formatRelative(update.date) }}
                </span>
              </div>
            </div>
            <div
              v-if="getUpdateContent(update)"
              class="update-content"
              :style="{
                flexDirection: windowBreakpoint < 3 ? 'column' : 'row',
              }"
            >
              <div class="no-shrink">
                <CommunityLibraryChip />
              </div>
              <p>
                <template
                  v-if="
                    update.resolution_reason && update.status === CommunityLibraryStatus.REJECTED
                  "
                >
                  <strong>
                    {{
                      reasonLabel$({
                        reason: getResolutionReasonLabel(update.resolution_reason),
                      })
                    }}
                  </strong>
                  <br >
                </template>
                <span>
                  {{ getUpdateContent(update) }}
                </span>
              </p>
              <KButton
                v-if="
                  [CommunityLibraryStatus.PENDING, CommunityLibraryStatus.SUPERSEDED].includes(
                    update.status,
                  ) && update.id.toString() !== props.submissionId
                "
                class="no-shrink"
                appearance="flat-button"
                :text="viewMoreAction$()"
                @click="goToSubmission(update)"
              />
            </div>
          </li>
        </ul>
        <div
          v-if="hasMore && isOpen"
          class="load-more"
        >
          <KButton
            :text="showOlderAction$()"
            appearance="basic-link"
            :disabled="isLoadingMore"
            @click="fetchMore"
          />
        </div>
      </div>
    </template>
  </Accordion>

</template>


<script setup>

  import { computed, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router/composables';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import CommunityLibraryStatusChip from '../CommunityLibraryStatusChip.vue';
  import CommunityLibraryChip from '../CommunityLibraryChip.vue';
  import Accordion from './Accordion.vue';
  import { CommunityLibraryStatus } from 'shared/constants';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import useCommunityLibraryUpdates from 'shared/views/NotificationsModal/composables/useCommunityLibraryUpdates';

  import { getResolutionReasonLabel } from 'shared/utils/communityLibrary';

  const props = defineProps({
    channelId: {
      type: String,
      required: true,
    },
    submissionId: {
      type: String,
      required: true,
    },
  });
  const { hasMore, submissionsUpdates, isLoading, isLoadingMore, fetchData, fetchMore } =
    useCommunityLibraryUpdates({
      channel: props.channelId,
    });

  const getUpdates = isOpen => {
    if (isOpen) {
      return submissionsUpdates.value;
    }
    return truncatedUpdates.value;
  };
  const truncatedUpdates = computed(() => submissionsUpdates.value.slice(0, 2));

  const route = useRoute();
  const router = useRouter();

  const { windowBreakpoint } = useKResponsiveWindow();

  const {
    newLabel$,
    adminLabel$,
    editorLabel$,
    reasonLabel$,
    viewMoreAction$,
    channelVersion$,
    showOlderAction$,
    flaggedNotification$,
    activityHistoryLabel$,
    submissionNotification$,
    approvedNotification$,
  } = communityChannelsStrings;

  const goToSubmission = update => {
    router.replace({
      name: route.name,
      params: {
        ...route.params,
        submissionId: update.id.toString(),
      },
      query: route.query,
    });
  };

  const getUpdateTitle = update => {
    const channelVersionText = channelVersion$({
      name: update.channel_name,
      version: update.channel_version,
    });
    switch (update.status) {
      case CommunityLibraryStatus.PENDING:
      case CommunityLibraryStatus.SUPERSEDED:
        return submissionNotification$({
          channelVersion: channelVersionText,
          author: update.author_name,
          userType: editorLabel$(),
        });
      case CommunityLibraryStatus.APPROVED:
      case CommunityLibraryStatus.LIVE:
        return approvedNotification$({
          channelVersion: channelVersionText,
          author: update.resolved_by_name,
          userType: adminLabel$(),
        });
      case CommunityLibraryStatus.REJECTED:
        return flaggedNotification$({
          channelVersion: channelVersionText,
          author: update.resolved_by_name,
          userType: adminLabel$(),
        });
      default:
        return '';
    }
  };

  const getUpdateContent = update => {
    switch (update.status) {
      case CommunityLibraryStatus.PENDING:
      case CommunityLibraryStatus.SUPERSEDED:
        return update.description;
      case CommunityLibraryStatus.APPROVED:
      case CommunityLibraryStatus.LIVE:
      case CommunityLibraryStatus.REJECTED:
        return update.feedback_notes;
      default:
        return '';
    }
  };

  watch(
    () => props.channelId,
    () => {
      fetchData();
    },
    { immediate: true },
  );

</script>


<style scoped lang="scss">

  .no-shrink {
    flex-shrink: 0;
  }

  .d-flex {
    display: flex;
    gap: 8px;
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 0;
    margin: 16px 0 0;
    list-style: none;

    li {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .update-header {
      display: flex;
      gap: 16px;
      align-items: center;
      justify-content: space-between;

      .update-date {
        color: v-bind('$themeTokens.annotation');
      }
    }

    .update-content {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      padding: 16px;
      background-color: v-bind('$themePalette.grey.v_100');
      border-radius: 8px;

      p {
        flex-grow: 1;
        margin: 0;
      }
    }
  }

  .load-more {
    display: flex;
    justify-content: center;
    margin-top: 8px;
  }

</style>
