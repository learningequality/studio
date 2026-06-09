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
        :aria-label="loadingVersionHistory$()"
      >
        <KCircularLoader />
      </div>

      <div
        v-else-if="error && versions.length === 0"
        class="error"
        role="alert"
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
        <ul class="versions-list-items">
          <li
            v-for="version in versions"
            :key="version.id"
            class="version-item"
          >
            <div class="version-header">
              <span class="version-number">
                {{ versionLabel$({ version: version.version }) }}
              </span>
              <span :style="{ color: $themeTokens.annotation }">
                {{ $formatDate(version.date_published) }}
              </span>
            </div>
            <div
              class="version-description"
              :style="{ backgroundColor: $themePalette.grey.v_100 }"
            >
              <div class="description-label">
                {{ versionDescriptionLabel$() }}
              </div>
              <KOptionalText>
                <div
                  v-if="version.version_notes"
                  class="description-body"
                  :style="{ color: $themeTokens.annotation }"
                >
                  {{ version.version_notes }}
                </div>
              </KOptionalText>
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
            :text="hideVersions$()"
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
   * Versions are fetched on-demand when expanded and paginated with 5 versions per page.
   *
   * @component
   */
  export default {
    name: 'ChannelVersionHistory',
    setup(props) {
      const isExpanded = ref(false);
      const {
        seeAllVersions$,
        hideVersions$,
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
        hideVersions$,
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
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 0;
          margin: 0;
          list-style: none;
        }

        .version-item {
          .version-header {
            display: flex;
            align-items: center;
            justify-content: space-between;

            .version-number {
              font-weight: 600;
            }
          }

          .version-description {
            padding: 10px;
            margin-top: 4px;
            border-radius: 4px;

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
          justify-content: center;
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
