<template>

  <div class="channel-version-history">
    <div
      v-if="!isExpanded"
      class="toggle-section"
    >
      <KButton
        appearance="basic-link"
        :text="seeAllVersions$()"
        @click="handleExpand"
      />
    </div>
    <div
      v-if="isExpanded"
      class="versions-container"
    >
      <div
        v-if="isLoading && versions.length === 0"
        class="loading"
      >
        <KCircularLoader />
      </div>

      <div
        v-else-if="error && versions.length === 0"
        class="error"
      >
        {{ errorLoadingVersions$() }}
      </div>

      <div
        v-else
        class="versions-list"
      >
        <!-- Display each version -->
        <div
          v-for="version in versions"
          :key="version.id"
          class="version-item"
        >
          <span class="version-number">
            {{ versionLabel$({ version: version.version }) }}
          </span>
          <div
            v-if="version.version_notes"
            class="version-description"
          >
            <div class="description-label">
              {{ versionDescriptionLabel$() }}
            </div>
            <div class="description-body">
              {{ version.version_notes }}
            </div>
          </div>
        </div>

        <!-- "Show more" button - shown when more versions available -->
        <div
          v-if="hasMore"
          class="show-more-section"
        >
          <KButton
            appearance="basic-link"
            :text="showMore$()"
            :disabled="isLoadingMore"
            @click="handleShowMore"
          />
          <KCircularLoader
            v-if="isLoadingMore"
            class="inline-loader"
          />
          <div
            v-if="error && versions.length > 0"
            class="fetch-more-error"
          >
            {{ errorLoadingVersions$() }}
          </div>
        </div>

        <div class="collapse-section">
          <KButton
            appearance="basic-link"
            :text="seeLess$()"
            @click="handleCollapse"
          />
        </div>
      </div>
    </div>
  </div>

</template>


<script>

  import { ref, watch } from 'vue';
  import { useChannelVersionHistory } from 'shared/composables/useChannelVersionHistory';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

  export default {
    name: 'ChannelVersionHistory',
    setup(props) {
      const isExpanded = ref(false);
      const {
        seeAllVersions$,
        seeLess$,
        showMore$,
        versionLabel$,
        errorLoadingVersions$,
        versionDescriptionLabel$,
      } = communityChannelsStrings;

      const {
        versions,
        isLoading,
        isLoadingMore,
        error,
        hasMore,
        fetchVersions,
        fetchMore,
        reset,
      } = useChannelVersionHistory();

      watch(
        () => props.channelId,
        (newChannelId, oldChannelId) => {
          if (newChannelId !== oldChannelId) {
            reset();
            isExpanded.value = false;
          }
        },
      );

      const handleExpand = async () => {
        isExpanded.value = true;
        if (versions.value.length === 0) {
          await fetchVersions(props.channelId);
        }
      };
      const handleCollapse = () => {
        isExpanded.value = false;
      };
      const handleShowMore = async () => {
        await fetchMore();
      };

      return {
        isExpanded,
        versions,
        isLoading,
        isLoadingMore,
        error,
        hasMore,
        handleExpand,
        handleCollapse,
        handleShowMore,
        seeAllVersions$,
        seeLess$,
        showMore$,
        versionLabel$,
        errorLoadingVersions$,
        versionDescriptionLabel$,
      };
    },
    props: {
      channelId: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style scoped lang="scss">

  .channel-version-history {
    margin-top: 16px;

    .toggle-section {
      margin: 8px 0;
    }

    .versions-container {
      .loading,
      .error {
        padding: 8px 0;
        text-align: center;
      }

      .versions-list {
        .version-item {
          padding: 12px 0;
          border-bottom: 1px solid #e0e0e0;

          .version-number {
            font-weight: 500;
          }

          .version-description {
            padding: 12px;
            margin-top: 8px;
            background-color: #f5f5f5;
            border-radius: 6px;

            .description-label {
              margin-bottom: 6px;
              font-weight: 600;
            }

            .description-body {
              line-height: 1.4;
              color: #4a4a4a;
            }
          }
        }

        .show-more-section {
          display: flex;
          gap: 8px;
          align-items: center;
          margin: 8px 0;

          .inline-loader {
            width: 20px;
            height: 20px;
          }

          .fetch-more-error {
            font-size: 14px;
            color: #d32f2f;
          }
        }

        .collapse-section {
          margin: 8px 0;
        }
      }
    }
  }

</style>
