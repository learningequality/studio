<template>

  <KPageContainer class="page-container">
    <div
      :class="{ 'table-header-mobile': isMobile() }"
      :style="{
        marginTop: windowIsSmall ? '24px' : '32px',
      }"
    >
      <div class="header-top">
        <h1 class="page-title">{{ $tr('pageTitle') }}</h1>
        <KButton
          v-if="!loading"
          appearance="raised-button"
          primary
          :text="$tr('addChannelSetTitle')"
          @click="newChannelSet"
        />
      </div>

      <div class="header-bottom">
        <KButton
          v-if="tableRows.length > 0"
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
    </div>

    <div v-if="show('loader', loading, 500)">
      <KCircularLoader />
    </div>

    <div
      v-else-if="tableRows.length === 0"
      class="empty-state"
    >
      <p class="mb-0">{{ $tr('noChannelSetsFound') }}</p>
      <KButton
        appearance="basic-link"
        :text="$tr('aboutChannelSetsLink')"
        @click="infoDialog = true"
      />
    </div>

    <KTable
      v-else
      :stickyColumns="stickyColumns"
      :caption="$tr('tableCaption')"
      :headers="tableHeaders"
      :rows="tableRows"
      sortable
      :defaultSort="{ columnId: 'name', direction: 'asc' }"
    >
      <template #cell="{ content, colIndex }">
        <!-- Column 0: Collection Name -->
        <div v-if="colIndex === 0">
          <div>
            <h3
              dir="auto"
              class="collection-name"
            >
              {{ content }}
            </h3>
          </div>
        </div>

        <!-- Column 1: Tokens -->
        <div v-else-if="colIndex === 1">
          <StudioCopyToken
            v-if="content"
            :token="content"
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
          <KButton
            v-if="!isSmallScreen()"
            :text="$tr('options')"
            appearance="flat-button"
            :hasDropdown="true"
          >
            <template #menu>
              <KDropdownMenu
                :options="dropdownOptions"
                :hasIcons="true"
                @select="option => handleOptionSelect(option, content)"
              />
            </template>
          </KButton>

          <KIconButton
            v-else
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
  import useKShow from 'kolibri-design-system/lib/composables/useKShow';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { RouteNames } from '../../constants';
  import StudioCopyToken from '../../../settings/pages/Account/StudioCopyToken';

  export default {
    name: 'StudioCollectionsTable',
    components: {
      StudioCopyToken,
    },
    setup() {
      const { show } = useKShow();
      const { windowBreakpoint, windowIsSmall } = useKResponsiveWindow();

      return {
        show,
        windowBreakpoint,
        windowIsSmall,
      };
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

      isMobile() {
        return this.windowBreakpoint <= 0;
      },

      isSmallScreen() {
        return this.windowBreakpoint <= 2;
      },

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
      pageTitle: 'Collections',
      tableCaption: 'List of collections',
      aboutChannelSetsLink: 'Learn more about collections',
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

  .header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .collection-name {
    display: inline-block;
    font-size: 16px;
    font-weight: 500;
    border-radius: 2px;
  }

  .header-bottom {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }

  .page-title {
    margin: 0;
  }

  .actions-cell {
    display: flex;
    justify-content: flex-end;
  }

  .table-header-mobile {
    .header-top {
      flex-direction: column;
      gap: 12px;
      text-align: center;
    }

    .header-bottom {
      justify-content: center;
    }
  }

</style>
