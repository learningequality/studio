<template>

  <ResponsiveDialog
    v-model="dialog"
    width="600px"
    :header="$tr('savedSearchesTitle')"
  >
    <LoadingText v-if="loading" />
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
            <IconButton
              icon="edit"
              color="grey"
              :text="$tr('editAction')"
              @click="handleClickEdit(search.id)"
            />
          </VListTileAction>

          <VListTileAction>
            <IconButton
              icon="clear"
              color="grey"
              :text="$tr('deleteAction')"
              @click="handleClickDelete(search.id)"
            />
          </VListTileAction>
        </VListTile>
        <VDivider v-if="index < savedSearches.length - 1" :key="index + 'divider'" />
      </template>
    </VList>

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
  </ResponsiveDialog>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import EditSearchModal from './EditSearchModal';
  import MessageDialog from 'shared/views/MessageDialog';
  import IconButton from 'shared/views/IconButton';
  import LoadingText from 'shared/views/LoadingText';
  import ResponsiveDialog from 'shared/views/ResponsiveDialog';

  export default {
    name: 'SavedSearchesModal',
    inject: ['RouteNames'],
    components: {
      EditSearchModal,
      MessageDialog,
      IconButton,
      LoadingText,
      ResponsiveDialog,
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
          if (key === 'keywords') {
            return sum;
          } else if (typeof val === 'boolean') {
            return sum + 1;
          }
          return sum + val.split(',').length;
        }, 0);
      },
    },
    $trs: {
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
