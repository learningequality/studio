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
            <p
              class="disclaimer"
              :style="{ color: $themeTokens.error }"
            >
              {{ $tr('channelSetsDisclaimer') }}
            </p>
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
      <KTable
        class="collections-table"
        :stickyColumns="stickyColumns"
        caption=""
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
              :loading="!content"
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

  export default {
    name: 'StudioCollectionsTable',
    components: {
      StudioCopyToken,
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
            minWidth: '200px',
            width: '40%',
            columnId: 'name',
          },
          {
            label: this.$tr('token'),
            dataType: 'string',
            minWidth: '200px',
            width: '30%',
            columnId: 'tokens',
          },
          {
            label: this.$tr('channelNumber'),
            dataType: 'number',
            minWidth: '100px',
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
          const channelSet = this.getChannelSet(collection.id);
          const channelCount = channelSet?.channels?.length || 0;

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
          this.collectionToDelete =
            this.getChannelSet(collectionId) ||
            this.channelSets.find(c => c.id === collectionId) ||
            null;
          if (this.collectionToDelete) this.deleteDialog = true;
        }
      },

      confirmDelete() {
        if (this.collectionToDelete) {
          this.deleteChannelSet(this.collectionToDelete)
            .then(() => {
              this.loadChannelSetList();
              this.deleteDialog = false;
              this.collectionToDelete = null;
            })
            .catch(() => {
              this.deleteDialog = false;
              this.collectionToDelete = null;
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

  .info-content {
    line-height: 1.5;
  }

  .info-content p {
    margin-bottom: 16px;
  }

</style>
