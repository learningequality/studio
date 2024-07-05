<template>

  <div>
    <KModal
      v-if="dialog"
      :title="$tr('savedSearchesTitle')"
      :cancelText="$tr('closeButtonLabel')"
      @cancel="dialog = false"
    >
      <KCircularLoader v-if="loading" :size="40" />
      <p v-else-if="savedSearches.length === 0" class="grey--text pa-2">
        {{ $tr('noSavedSearches') }}
      </p>
      <VList v-else>
        <template v-for="(search, index) in savedSearches">
          <VListTile :key="index" class="py-2">
            <VListTileContent>
              <VListTileTitle>
                <ActionLink
                  class="font-weight-bold"
                  :to="searchResultsRoute(search)"
                  :text="search.name"
                  @click="dialog = false"
                />
              </VListTileTitle>
              <VListTileSubTitle class="metadata">
                <span>
                  {{ $formatRelative(search.created, { now: new Date() }) }}
                </span>
                <span>
                  {{ $tr('filterCount', { count: searchFilterCount(search) }) }}
                </span>
              </VListTileSubTitle>
            </VListTileContent>

            <VListTileAction>
              <KIconButton
                icon="edit"
                :color="$themeTokens.annotation"
                :tooltip="$tr('editAction')"
                :ariaLabel="$tr('editAction')"
                @click="handleClickEdit(search.id)"
              />
            </VListTileAction>

            <VListTileAction>
              <KIconButton
                icon="clear"
                :color="$themeTokens.annotation"
                :tooltip="$tr('deleteAction')"
                :ariaLabel="$tr('deleteAction')"
                @click="handleClickDelete(search.id)"
              />
            </VListTileAction>
          </VListTile>
          <VDivider v-if="index < savedSearches.length - 1" :key="index + 'divider'" />
        </template>
      </VList>
    </KModal>

    <MessageDialog
      v-model="showDelete"
      :header="$tr('deleteSearchTitle')"
      :text="$tr('deleteConfirmation')"
    >
      <template #buttons>
        <VBtn flat @click="handleCancel">
          {{ $tr('cancelAction') }}
        </VBtn>
        <VBtn color="primary" @click="handleDeleteConfirm">
          {{ $tr('deleteAction') }}
        </VBtn>
      </template>
    </MessageDialog>

    <EditSearchModal
      v-if="searchId"
      v-model="showEdit"
      :searchId="searchId"
      @submit="showEdit = false"
      @cancel="showEdit = false"
    />
  </div>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import EditSearchModal from './EditSearchModal';
  import MessageDialog from 'shared/views/MessageDialog';

  export default {
    name: 'SavedSearchesModal',
    inject: ['RouteNames'],
    components: {
      EditSearchModal,
      MessageDialog,
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        loading: true,
        showDelete: false,
        showEdit: false,
        searchId: null,
      };
    },
    computed: {
      ...mapGetters('importFromChannels', ['savedSearches']),
      dialog: {
        get() {
          return this.value && !this.showDelete && !this.showEdit;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
    },
    mounted() {
      this.loading = true;
      this.loadSavedSearches().then(() => {
        this.loading = false;
      });
    },
    methods: {
      ...mapActions('importFromChannels', ['loadSavedSearches', 'deleteSearch']),
      handleCancel() {
        this.searchId = null;
        this.showEdit = false;
        this.showDelete = false;
      },
      handleClickEdit(searchId) {
        this.searchId = searchId;
        this.showEdit = true;
      },
      handleClickDelete(searchId) {
        this.searchId = searchId;
        this.showDelete = true;
      },
      handleDeleteConfirm() {
        this.deleteSearch(this.searchId).then(() => {
          this.$store.dispatch('showSnackbarSimple', this.$tr('searchDeletedSnackbar'));
          this.showDelete = false;
          this.searchId = null;
        });
      },
      searchResultsRoute(savedSearch) {
        const query = { ...savedSearch.params };
        const searchTerm = query.keywords;
        delete query.keywords;

        return {
          name: this.RouteNames.IMPORT_FROM_CHANNELS_SEARCH,
          params: {
            ...this.$route.params,
            searchTerm,
          },
          query,
        };
      },
      searchFilterCount(savedSearch) {
        return Object.entries(savedSearch.params).reduce((sum, [key, val]) => {
          if (key === 'keywords' || val === null) {
            return sum;
          } else if (typeof val === 'boolean') {
            return sum + 1;
          }
          return sum + val.split(',').length;
        }, 0);
      },
    },
    $trs: {
      closeButtonLabel: 'Close',
      editAction: 'Edit',
      deleteAction: 'Delete',
      savedSearchesTitle: 'Saved searches',
      noSavedSearches: 'You do not have any saved searches',
      searchDeletedSnackbar: 'Saved search deleted',
      filterCount: '{count, number} {count, plural, one {filter} other {filters}}',

      // Delete strings
      deleteSearchTitle: 'Delete saved search',
      deleteConfirmation: 'Are you sure you want to delete this saved search?',
      cancelAction: 'Cancel',
    },
  };

</script>

<style scoped lang="less">

  .metadata {
    color: var(--v-grey-darken2);

    span:not(:last-child)::after {
      margin: 0 4px;
      color: var(--v-grey-base);
      content: '•';
    }
  }

</style>
