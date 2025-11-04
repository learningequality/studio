<template>

  <KPageContainer>
    <div class="table-header">
      <div class="header-left">
        <KButton
          appearance="basic-link"
          class="info-link"
          @click="infoDialog = true"
        >
          {{ $tr('aboutChannelSetsLink') }}
        </KButton>

        <KModal
          v-if="infoDialog"
          :title="$tr('aboutChannelSets')"
          :cancelText="$tr('cancelButtonLabel')"
          @cancel="infoDialog = false"
        >
          <div class="info-content">
            <p>{{ $tr('channelSetsDescriptionText') }}</p>
            <p>{{ $tr('channelSetsInstructionsText') }}</p>
            <p class="disclaimer">{{ $tr('channelSetsDisclaimer') }}</p>
          </div>
        </KModal>
      </div>

      <div class="header-right">
        <KButton
          v-if="!loading"
          appearance="raised-button"
          primary
          data-test="add-channelset"
          :text="$tr('addChannelSetTitle')"
          @click="newChannelSet"
        />
      </div>
    </div>

    <div class="table-container">
      <template v-if="loading">
        <LoadingText />
      </template>

      <p
        v-else-if="!channelSets.length"
        class="no-collections-message"
      >
        {{ $tr('noChannelSetsFound') }}
      </p>

      <KTable
        v-else
        class="collections-table"
        :stickyColumns="stickyColumns"
        caption
        :headers="tableHeaders"
        :rows="tableRows"
        :dataLoading="loading"
        :emptyMessage="$tr('noChannelSetsFound')"
      >
        <template #cell="{ content, colIndex }">
          <!-- Column 0: Collection Name -->
          <div
            v-if="colIndex === 0"
            class="collection-name-cell"
          >
            <div class="collection-info">
              <h3
                class="collection-title notranslate"
                dir="auto"
              >
                {{ content }}
              </h3>
            </div>
          </div>

          <!-- Column 1: Tokens -->
          <div
            v-else-if="colIndex === 1"
            class="tokens-cell"
          >
            <StudioCopyToken
              v-if="content"
              :token="content"
              class="token-item"
            />
            <em
              v-else
              :style="{ color: $themeTokens.annotation }"
              class="saving-text"
            >
              {{ $tr('saving') }}
            </em>
          </div>

          <!-- Column 2: Channel Count -->
          <div
            v-else-if="colIndex === 2"
            class="channel-count"
          >
            {{ $formatNumber(content) }}
          </div>

          <!-- Column 3: Actions -->
          <div
            v-else-if="colIndex === 3"
            class="actions-cell"
          >
            <KIconButton
              icon="optionsVertical"
              :aria-label="$tr('options')"
            >
              <template #menu>
                <KDropdownMenu
                  :options="dropdownOptions"
                  :hasIcons="true"
                  @select="option => handleOptionSelect(option, content)"
                />
              </template>
            </KIconButton>
          </div>
        </template>
      </KTable>
    </div>

    <!-- Delete Confirmation Modal -->
    <KModal
      v-if="deleteDialog"
      :title="$tr('deleteChannelSetTitle')"
      :submitText="$tr('delete')"
      :cancelText="$tr('cancel')"
      @submit="confirmDelete"
      @cancel="deleteDialog = false"
    >
      <p>{{ $tr('deleteChannelSetText') }}</p>
    </KModal>
  </KPageContainer>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import { RouteNames } from '../../constants';
  import StudioCopyToken from '../../../settings/pages/Account/StudioCopyToken';
  import LoadingText from 'shared/views/LoadingText';

  export default {
    name: 'StudioCollectionsTable',
    components: {
      StudioCopyToken,
      LoadingText,
    },
    data() {
      return {
        loading: true,
        infoDialog: false,
        deleteDialog: false,
        collectionToDelete: null,
      };
    },
    computed: {
      ...mapGetters('channelSet', ['channelSets', 'getChannelSet']),

      tableHeaders() {
        return [
          {
            label: this.$tr('title'),
            dataType: 'string',
            minWidth: '300px',
            width: '40%',
            columnId: 'name',
          },
          {
            label: this.$tr('token'),
            dataType: 'string',
            minWidth: '224px',
            width: '30%',
            columnId: 'tokens',
          },
          {
            label: this.$tr('channelNumber'),
            dataType: 'number',
            minWidth: '120px',
            width: '15%',
            columnId: 'channel_count',
            align: 'right',
          },
          {
            label: '',
            dataType: 'undefined',
            width: '15%',
            columnId: 'actions',
            align: 'center',
          },
        ];
      },

      tableRows() {
        if (!this.channelSets || !Array.isArray(this.channelSets)) {
          return [];
        }

        return this.channelSets.map(collection => {
          // Use getChannelSet to get proper format with channels as array
          const channelSet = this.getChannelSet(collection.id);
          const channelCount = channelSet && channelSet.channels ? channelSet.channels.length : 0;

          return [
            collection.name || '',
            collection.secret_token || null,
            channelCount,
            collection.id,
          ];
        });
      },

      stickyColumns() {
        return ['first', 'last'];
      },

      dropdownOptions() {
        return [
          {
            label: this.$tr('edit'),
            value: 'edit',
            icon: 'edit',
          },
          {
            label: this.$tr('delete'),
            value: 'delete',
            icon: 'trash',
          },
        ];
      },
    },
    mounted() {
      this.loadChannelSetList().then(() => {
        this.loading = false;
      });
    },
    methods: {
      ...mapActions('channelSet', ['loadChannelSetList', 'deleteChannelSet']),

      handleOptionSelect(option, collectionId) {
        if (option.value === 'edit') {
          this.$router.push({
            name: RouteNames.CHANNEL_SET_DETAILS,
            params: { channelSetId: collectionId },
          });
        } else if (option.value === 'delete') {
          // Use the Vuex getter to get the proper channelSet object
          const channelSet = this.getChannelSet(collectionId);
          if (channelSet) {
            this.collectionToDelete = channelSet;
            this.deleteDialog = true;
          } else {
            // Fallback: try to find in the channelSets array
            const collection = this.channelSets.find(c => c.id === collectionId);
            if (collection) {
              this.collectionToDelete = collection;
              this.deleteDialog = true;
            }
          }
        }
      },

      confirmDelete() {
        if (this.collectionToDelete) {
          const collectionName = this.collectionToDelete.name || 'Collection';

          this.deleteChannelSet(this.collectionToDelete)
            .then(() => {
              this.deleteDialog = false;
              this.collectionToDelete = null;
              this.$store.dispatch('showSnackbar', {
                text: this.$tr('deleteSuccess', { name: collectionName }),
              });
            })
            .catch(() => {
              this.deleteDialog = false;
              this.collectionToDelete = null;
              this.$store.dispatch('showSnackbar', {
                text: this.$tr('deleteError', { name: collectionName }),
                autoDismiss: false,
              });
            });
        }
      },

      newChannelSet() {
        this.$router.push({
          name: RouteNames.NEW_CHANNEL_SET,
        });
      },
    },
    $trs: {
      aboutChannelSetsLink: 'Learn about collections',
      aboutChannelSets: 'About collections',
      channelSetsDescriptionText:
        'A collection contains multiple Kolibri Studio channels that can be imported at one time to Kolibri with a single collection token.',
      channelSetsInstructionsText:
        'You can make a collection by selecting the channels you want to be imported together.',
      channelSetsDisclaimer:
        'You will need Kolibri version 0.12.0 or higher to import channel collections',
      cancelButtonLabel: 'Close',
      addChannelSetTitle: 'New collection',
      noChannelSetsFound:
        'You can package together multiple channels to create a collection. The entire collection can then be imported to Kolibri at once by using a collection token.',

      title: 'Collection name',
      token: 'Token ID',
      channelNumber: 'Number of channels',
      options: 'Options',
      deleteChannelSetTitle: 'Delete collection',
      deleteChannelSetText: 'Are you sure you want to delete this collection?',
      cancel: 'Cancel',
      edit: 'Edit collection',
      delete: 'Delete collection',
      saving: 'Saving',
      deleteSuccess: "'{name}' deleted successfully",
      deleteError: "Failed to delete '{name}'. Please try again.",
    },
  };

</script>


<style scoped>

  .table-header {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .header-left,
  .header-right {
    display: flex;
    align-items: center;
  }

  .info-link {
    margin: 0;
  }

  .table-container {
    width: 100%;
  }

  .collections-table {
    position: relative;
  }

  .no-collections-message {
    margin: 40px 0;
    text-align: center;
  }

  .collection-name-cell {
    display: flex;
    align-items: flex-start;
  }

  .collection-info {
    flex: 1;
  }

  .collection-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
  }

  .tokens-cell {
    display: flex;
    align-items: center;
    min-height: 40px;
  }

  .token-item {
    margin-right: 8px;
  }

  .saving-text {
    font-style: italic;
  }

  .channel-count {
    font-size: 14px;
    text-align: right;
  }

  .actions-cell {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .info-content {
    line-height: 1.5;
  }

  .info-content p {
    margin-bottom: 16px;
  }

  .disclaimer {
    font-weight: 500;
    color: var(--red-500);
  }

</style>
