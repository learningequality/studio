<template>

  <StudioImmersiveModal
    v-model="isModalOpen"
    :title="communityLibrarySubmissionLabel$()"
  >
    <KCircularLoader v-if="isChannelLoading || isSubmissionLoading" />
    <div
      v-else-if="channel && submission"
      class="page-content"
    >
      <div class="channel-header">
        <div class="thumbnail-wrapper">
          <StudioThumbnail
            :src="channel.thumbnail_url"
            :encoding="channel.thumbnail_encoding"
          />
        </div>
        <div class="channel-info">
          <div>
            <h1
              class="notranslate"
              dir="auto"
            >
              {{
                channelVersion$({
                  name: channel.name,
                  version: submission.channel_version,
                })
              }}
            </h1>
            <p
              class="channel-description notranslate"
              dir="auto"
            >
              {{ channel.description }}
            </p>
          </div>
          <div class="submission-chips">
            <CommunityLibraryChip />
            <CommunityLibraryStatusChip :status="submission.status" />
          </div>
          <div
            v-if="submission.version_token"
            class="channel-token"
          >
            <strong>{{ channelVersionTokenLabel$() }}</strong>
            <StudioCopyToken
              :token="submission.version_token"
              :showLabel="false"
            />
          </div>
          <div
            v-if="liveSubmission && submission.id !== liveSubmission.id"
            class="live-version"
          >
            <span>{{ liveVersionLabel$() }}</span>
            <KButton
              appearance="basic-link"
              :text="
                channelVersion$({
                  name: liveSubmission.channel_name,
                  version: liveSubmission.channel_version,
                })
              "
              @click="goToLiveSubmission"
            />
          </div>
        </div>
        <div class="actions">
          <KButton
            v-if="adminReview && submission.status === CommunityLibraryStatus.PENDING"
            text="review"
            style="height: 40px"
          />
        </div>
      </div>
      <div
        :style="{
          width: '100%',
          height: '1px',
          margin: '24px 0 12px',
          backgroundColor: $themeTokens.fineLine,
        }"
      ></div>
      <ChannelDetails
        :channel="channel"
        :submission="submission"
        :channelVersion="channelVersion"
      />
      <ActivityHistory
        class="mt-16"
        :submissionId="submissionId"
        :channelId="channelId"
      />
    </div>
  </StudioImmersiveModal>

</template>


<script setup>

  import { useRoute, useRouter } from 'vue-router/composables';
  import { computed, ref, watch } from 'vue';
  import CommunityLibraryChip from '../CommunityLibraryChip.vue';
  import CommunityLibraryStatusChip from '../CommunityLibraryStatusChip.vue';
  import ChannelDetails from './ChannelDetails.vue';
  import ActivityHistory from './ActivityHistory.vue';
  import StudioCopyToken from 'shared/views/StudioCopyToken/index.vue';
  import StudioThumbnail from 'shared/views/files/StudioThumbnail.vue';
  import { useFetch } from 'shared/composables/useFetch';
  import StudioImmersiveModal from 'shared/views/StudioImmersiveModal.vue';
  import useStore from 'shared/composables/useStore';
  import {
    AdminCommunityLibrarySubmission,
    ChannelVersion,
    CommunityLibrarySubmission,
  } from 'shared/data/resources';
  import { CommunityLibraryStatus } from 'shared/constants';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import logging from 'shared/logging';

  const props = defineProps({
    adminReview: {
      type: Boolean,
      default: false,
    },
    channelId: {
      type: String,
      required: true,
    },
    submissionId: {
      type: String,
      required: true,
    },
  });

  const previousQuery = ref(null);

  const route = useRoute();
  const router = useRouter();
  const store = useStore();

  const isModalOpen = computed({
    get() {
      return true;
    },
    set(value) {
      if (!value) {
        const backURL = route.query.back || '/';
        window.location.href = decodeURIComponent(backURL);
      }
    },
  });

  const closeModal = () => {
    isModalOpen.value = false;
  };

  const {
    data: channel,
    isLoading: isChannelLoading,
    fetchData: fetchChannel,
  } = useFetch({
    asyncFetchFunc: async () => {
      try {
        const channel = await store.dispatch('channel/loadChannel', props.channelId);
        if (!channel) {
          closeModal();
          return;
        }
        return channel;
      } catch (error) {
        store.dispatch('errors/handleAxiosError', error);
      }
    },
  });

  const {
    data: submissionData,
    isLoading: isSubmissionLoading,
    fetchData: fetchSubmission,
  } = useFetch({
    asyncFetchFunc: async () => {
      try {
        const Resource = props.adminReview
          ? AdminCommunityLibrarySubmission
          : CommunityLibrarySubmission;
        const submission = await Resource.fetchModel(props.submissionId);

        const [channelVersion] = await ChannelVersion.fetchCollection({
          channel: submission.channel_id,
          version: submission.channel_version,
        });

        return { submission, channelVersion };
      } catch (error) {
        store.dispatch('errors/handleAxiosError', error);
      }
    },
  });

  const submission = computed(() => submissionData.value?.submission);
  const channelVersion = computed(() => submissionData.value?.channelVersion);

  const { data: liveSubmission, fetchData: fetchLiveSubmission } = useFetch({
    asyncFetchFunc: async () => {
      try {
        const response = await CommunityLibrarySubmission.fetchCollection({
          channel: props.channelId,
          status__in: [CommunityLibraryStatus.LIVE],
          max_results: 1,
        });

        const [data] = response.results;

        return data;
      } catch (error) {
        logging.error('Fetching live version failed', error);
      }
    },
  });

  const goToLiveSubmission = () => {
    if (!liveSubmission.value) {
      return;
    }
    router.replace({
      name: route.name,
      params: {
        channelId: liveSubmission.value.channel_id,
        submissionId: liveSubmission.value.id.toString(),
      },
      query: route.query,
    });
  };

  watch(
    [() => props.channelId, () => props.submissionId],
    ([newChannelId, newSubmissionId], [oldChannelId, oldSubmissionId]) => {
      if (!newChannelId || !newSubmissionId) {
        closeModal();
        return;
      }
      if (newChannelId !== oldChannelId) {
        fetchChannel();
        fetchLiveSubmission();
      }
      if (newSubmissionId !== oldSubmissionId) {
        fetchSubmission();
      }
    },
    { immediate: true },
  );

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

  const {
    communityLibrarySubmissionLabel$,
    channelVersion$,
    channelVersionTokenLabel$,
    liveVersionLabel$,
  } = communityChannelsStrings;

</script>


<style scoped lang="scss">

  .page-content {
    margin-top: 24px;
  }

  .channel-header {
    display: flex;
    gap: 24px;

    .thumbnail-wrapper {
      flex-grow: 1;
      max-width: 300px;
    }
  }

  .channel-info {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 16px;

    .channel-description {
      margin: 0;
    }

    .submission-chips {
      display: flex;
      gap: 8px;
    }

    .channel-token {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .live-version {
      display: flex;
      gap: 4px;
    }
  }

  .mt-16 {
    margin-top: 16px;
  }

</style>
