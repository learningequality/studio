<template>

  <KPageContainer
    class="page-container"
    :class="{ 'larger-window': !windowIsSmall }"
  >
    <div class="header">
      <div>
        <h1>{{ $tr('pageTitle') }}</h1>
        <KButton
          v-if="tableRows.length > 0"
          appearance="basic-link"
          :text="$tr('aboutChannelSetsLink')"
          @click="infoDialog = true"
        />
      </div>
      <KButton
        v-if="!loading"
        appearance="raised-button"
        primary
        class="new-collection-button"
        :text="$tr('addChannelSetTitle')"
        @click="newChannelSet"
      />
    </div>

    <!-- Two wrapping divs needed to prevent brief loader shift after content displayed  -->
    <div v-if="show('loader', loading, 500)">
      <div class="loader">
        <KCircularLoader />
      </div>
    </div>

    <div
      v-else-if="tableRows.length === 0"
      class="no-channels"
    >
      <div>
        {{ $tr('noChannelSetsFound') }}
        <KButton
          appearance="basic-link"
          :text="$tr('aboutChannelSetsLink')"
          @click="infoDialog = true"
        />
      </div>
    </div>

    <KTable
      v-else
      class="table"
      :stickyColumns="stickyColumns"
      :caption="$tr('tableCaption')"
      :headers="tableHeaders"
      :rows="tableRows"
      sortable
      :defaultSort="{ columnId: 'name', direction: 'asc' }"
    >
      <template #cell="{ content, colIndex }">
        <!-- Collection name column -->
        <div v-if="colIndex === 0">
          <div>
            <h3
              dir="auto"
              class="collection-name notranslate"
            >
              {{ content }}
            </h3>
          </div>
        </div>

        <!-- Token column -->
        <div v-else-if="colIndex === 1">
          <StudioCopyToken
            v-if="content"
            :token="content"
            :style="copyTokenStyle"
            :showLabel="false"
            :showCopyButton="showCopyTokenButton"
          />
          <em
            v-else
            :style="{
              color: $themeTokens.annotation,
              paddingLeft: '8px',
            }"
          >
            {{ $tr('saving') }}
          </em>
        </div>

        <!-- Channel count column -->
        <div v-else-if="colIndex === 2">
          {{ $formatNumber(content) }}
        </div>

        <!-- Dropdown column -->
        <div
          v-else-if="colIndex === 3"
          class="dropdown-cell"
        >
          <KButton
            v-if="windowBreakpoint > 2"
            :text="$tr('options')"
            appearance="flat-button"
            :hasDropdown="true"
            class="dropdown-button"
          >
            <template #menu>
              <KDropdownMenu
                :options="dropdownOptions(content)"
                :hasIcons="true"
                @select="option => handleOptionSelect(option, content)"
              />
            </template>
          </KButton>

          <KIconButton
            v-else
            icon="optionsVertical"
            :aria-label="$tr('options')"
            class="dropdown-button"
          >
            <template #menu>
              <KDropdownMenu
                :options="dropdownOptions(content)"
                :hasIcons="true"
                @select="option => handleOptionSelect(option, content)"
              />
            </template>
          </KIconButton>
        </div>
      </template>
    </KTable>

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
  </KPageContainer>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import useKShow from 'kolibri-design-system/lib/composables/useKShow';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useToken from '../../../shared/composables/useToken';
  import { RouteNames } from '../../constants';
  import StudioCopyToken from '../../../shared/views/StudioCopyToken';

  export default {
    name: 'StudioCollectionsTable',
    components: {
      StudioCopyToken,
    },
    setup() {
      const { show } = useKShow();
      const { windowIsSmall, windowBreakpoint } = useKResponsiveWindow();
      const { copyTokenToClipboard } = useToken();

      return {
        show,
        windowIsSmall,
        windowBreakpoint,
        copyTokenToClipboard,
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
      showCopyTokenButton() {
        return this.windowBreakpoint > 2;
      },
      tokenInputWidth() {
        return this.showCopyTokenButton ? '170px' : '110px';
      },
      copyTokenStyle() {
        return {
          minWidth: this.tokenInputWidth,
        };
      },
      tableHeaders() {
        return [
          {
            label: this.$tr('title'),
            dataType: 'string',
            minWidth: '200px',
            width: '50%',
            columnId: 'name',
          },
          {
            label: this.$tr('token'),
            dataType: 'string',
            minWidth: this.tokenInputWidth,
            width: this.tokenInputWidth,
            columnId: 'tokens',
          },
          {
            label: this.$tr('channelNumber'),
            dataType: 'number',
            minWidth: '200px',
            width: '20%',
            columnId: 'channel_count',
          },
          {
            label: '',
            dataType: 'undefined',
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
        if (this.windowBreakpoint < 2) {
          return ['last'];
        }
        return ['first', 'last'];
      },
    },
    mounted() {
      this.loadChannelSetList().then(() => {
        this.loading = false;
      });
    },
    methods: {
      ...mapActions('channelSet', ['loadChannelSetList', 'deleteChannelSet']),
      dropdownOptions(collectionId) {
        const options = [
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
        if (this.getChannelSet(collectionId)?.secret_token) {
          options.unshift({
            label: this.$tr('copyToken'),
            value: 'copy-token',
            icon: 'copy',
          });
        }
        return options;
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
        } else if (option.value === 'copy-token') {
          const collection =
            this.getChannelSet(collectionId) ||
            this.channelSets.find(c => c.id === collectionId) ||
            null;
          if (collection && collection.secret_token) {
            this.handleCopyToken(collection.secret_token);
          }
        }
      },
      handleCopyToken(value) {
        this.copyTokenToClipboard(value, {
          hyphenate: true,
          successMessage: this.$tr('copiedTokenId'),
          errorMessage: this.$tr('copyFailed'),
        });
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
      copyToken: 'Copy token',
      copiedTokenId: 'Token copied',
      copyFailed: 'Copy failed',
    },
  };

</script>


<style lang="scss" scoped>

  // Remove default cell padding from token column
  // KTable doesn't offer a better way to set padding until
  // its public interface is improved to provide `KTableCell`
  // as proposed in the commnets section of
  // https://github.com/learningequality/kolibri-design-system/issues/743
  ::v-deep td:nth-child(2) {
    padding: 0;
  }

  .page-container {
    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    flex-direction: column;
    margin-top: 16px;

    .new-collection-button {
      align-self: flex-start;
      margin-top: 16px;
    }
  }

  .larger-window .header {
    flex-direction: row;
    align-items: top;
    justify-content: space-between;

    .new-collection-button {
      margin-top: 0;
    }
  }

  .no-channels,
  .loader {
    margin-top: 32px;
    margin-bottom: 32px;
  }

  .larger-window .no-channels {
    max-width: 800px;
    text-align: center;
  }

  .larger-window .no-channels,
  .larger-window .loader {
    margin: 84px auto;
  }

  .table {
    margin-top: 32px;
  }

  .collection-name {
    display: inline-block;
    font-size: 16px;
    font-weight: 500;
  }

  .dropdown-cell {
    display: flex;
    justify-content: flex-end;
  }

  .dropdown-button {
    margin-left: 12px;
  }

</style>
