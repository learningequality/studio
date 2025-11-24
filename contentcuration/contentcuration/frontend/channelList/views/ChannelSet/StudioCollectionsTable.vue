<template>

  <KPageContainer class="page-container">
    <div class="table-header">
      <div class="header-left">
        <KButton
          appearance="basic-link"
          :text="$tr('aboutChannelSetsLink')"
          @click="infoDialog = true"
        />
        <KModal
          v-if="infoDialog"
          :title="$tr('aboutChannelSets')"
          :cancelText="$tr('cancelButtonLabel')"
          @cancel="infoDialog = false"
        >
          <div>
            <p>{{ $tr('channelSetsDescriptionText') }}</p>
            <p>{{ $tr('channelSetsInstructionsText') }}</p>
            <p :style="{ color: $themeTokens.error }">
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
          :text="$tr('addChannelSetTitle')"
          @click="newChannelSet"
        />
      </div>
    </div>

    <KTable
      :stickyColumns="stickyColumns"
      caption=""
      :headers="tableHeaders"
      :rows="tableRows"
      :dataLoading="loading"
      sortable
      :defaultSort="{ columnId: 'name', direction: 'asc' }"
      :emptyMessage="$tr('noChannelSetsFound')"
    >
      <template #cell="{ content, colIndex }">
        <!-- Column 0: Collection Name -->
        <div v-if="colIndex === 0">
          <div>
            <h3 dir="auto">
              {{ content }}
            </h3>
          </div>
        </div>

        <!-- Column 1: Tokens -->
        <div v-else-if="colIndex === 1">
          <StudioCopyToken
            v-if="content"
            :token="content"
            :loading="!content"
          />
          <em
            v-else
            :style="{ color: $themeTokens.annotation }"
          >
            {{ $tr('saving') }}
          </em>
        </div>

        <!-- Column 2: Channel Count -->
        <div v-else-if="colIndex === 2">
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
            width: '55%',
            columnId: 'name',
          },
          {
            label: this.$tr('token'),
            dataType: 'string',
            minWidth: '200px',
            width: '20%',
            columnId: 'tokens',
          },
          {
            label: this.$tr('channelNumber'),
            dataType: 'number',
            minWidth: '100px',
            width: '15%',
            columnId: 'channel_count',
          },
          {
            label: '',
            dataType: 'undefined',
            width: '10%',
            columnId: 'actions',
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
              this.$store.dispatch('showSnackbarSimple', this.$tr('collectionDeleted'));
            })
            .catch(() => {
              this.deleteDialog = false;
              this.collectionToDelete = null;
              this.$store.dispatch('showSnackbarSimple', this.$tr('deleteError'));
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
      collectionDeleted: 'Collection  deleted',
      deleteError: 'Error deleting collection',
    },
  };

</script>


<style lang="scss" scoped>

  .page-container {
    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
    text-align: center;
  }

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

  .actions-cell {
    display: flex;
    justify-content: flex-end;
  }
  @media (max-width: 500px) {
    .table-header {
      justify-content: center;
    }
  }

</style>
