<template>

  <div class="channel-version-history">
    <div
      v-if="!isExpanded"
      class="toggle-section"
    >
      <KButton
        appearance="basic-link"
        :text="seeAllVersions$()"
        data-test="expand-versions-button"
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
        role="status"
        aria-live="polite"
        :aria-label="loadingVersionHistory$()"
      >
        <KCircularLoader />
      </div>

      <div
        v-else-if="error && versions.length === 0"
        class="error"
        role="alert"
        aria-live="assertive"
      >
        {{ errorLoadingVersions$() }}
      </div>

      <div
        v-else-if="!isLoading && versions.length === 0"
        class="empty-state"
      >
        {{ noVersionsAvailable$() }}
      </div>

      <div
        v-else
        class="versions-list"
      >
        <!-- Display each version -->
        <ul
          class="versions-list-items"
          role="list"
        >
          <li
            v-for="version in versions"
            :key="version.id"
            class="version-item"
            :style="{ borderBottom: `1px solid ${$themePalette.grey.v_200}` }"
          >
            <span class="version-number">
              {{ versionLabel$({ version: version.version }) }}
            </span>
            <div
              v-if="version.version_notes"
              class="version-description"
              :style="{ backgroundColor: $themePalette.grey.v_50 }"
            >
              <div class="description-label">
                {{ versionDescriptionLabel$() }}
              </div>
              <div
                class="description-body"
                :style="{ color: $themePalette.grey.v_800 }"
              >
                {{ version.version_notes }}
              </div>
            </div>
          </li>
        </ul>

        <!-- "Show more" button - shown when more versions available -->
        <div
          v-if="hasMore"
          class="show-more-section"
        >
          <!-- Show error with retry button if pagination failed -->
          <div
            v-if="error && versions.length > 0"
            class="fetch-more-error"
            role="alert"
            :style="{ color: $themeTokens.error }"
          >
            <span>{{ errorLoadingVersions$() }}</span>
            <KButton
              appearance="basic-link"
              :text="retry$()"
              data-test="retry-button"
              @click="handleShowMore"
            />
          </div>
          <template v-else>
            <KButton
              appearance="basic-link"
              :text="showMore$()"
              :disabled="isLoadingMore"
              data-test="show-more-button"
              @click="handleShowMore"
            />
            <KCircularLoader
              v-if="isLoadingMore"
              class="inline-loader"
            />
          </template>
        </div>

        <div class="collapse-section">
          <KButton
            appearance="basic-link"
            :text="seeLess$()"
            data-test="collapse-versions-button"
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

  /**
   * Displays channel version history with pagination
   *
   * Shows a collapsible list of channel versions with their descriptions.
   * Versions are fetched on-demand when expanded and paginated with 10 versions per page.
   *
   * @component
   */
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
        noVersionsAvailable$,
        retry$,
        loadingVersionHistory$,
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
        noVersionsAvailable$,
        retry$,
        loadingVersionHistory$,
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
      .error,
      .empty-state {
        padding: 8px 0;
        text-align: center;
      }

      .versions-list {
        .versions-list-items {
          padding: 0;
          margin: 0;
          list-style: none;
        }

        .version-item {
          padding: 12px 0;

          &:last-child {
            border-bottom: 0 !important;
          }

          .version-number {
            font-weight: 500;
          }

          .version-description {
            padding: 12px;
            margin-top: 8px;
            border-radius: 6px;

            .description-label {
              margin-bottom: 6px;
              font-weight: 600;
            }

            .description-body {
              max-height: 120px;
              overflow-y: auto;
              line-height: 1.4;
              word-break: break-word;
              word-wrap: break-word;
              overflow-wrap: break-word;
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
            display: flex;
            gap: 8px;
            align-items: center;
            font-size: 14px;
          }
        }

        .collapse-section {
          margin: 8px 0;
        }
      }
    }
  }

</style>
