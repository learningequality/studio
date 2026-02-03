<template>

  <div>
    <KModal
      v-if="dialog"
      :title="$tr('savedSearchesTitle')"
      :cancelText="$tr('closeButtonLabel')"
      @cancel="dialog = false"
    >
      <KCircularLoader
        v-if="loading"
        :size="40"
      />
      <p
        v-else-if="savedSearches.length === 0"
        class="empty-state"
      >
        {{ $tr('noSavedSearches') }}
      </p>
      <ul
        v-else
        class="saved-searches-list"
      >
        <li
          v-for="(search, index) in savedSearches"
          :key="search.id"
          class="search-item"
        >
          <div class="search-content">
            <div class="search-title">
              <KRouterLink
                :to="searchResultsRoute(search)"
                class="notranslate saved-search-link"
                @click="dialog = false"
              >
                {{ search.name }}
              </KRouterLink>
            </div>
            <div class="metadata">
              <span>
                {{ $formatRelative(search.created, { now: new Date() }) }}
              </span>
              <span>
                {{ $tr('filterCount', { count: searchFilterCount(search) }) }}
              </span>
            </div>
          </div>

          <div class="search-actions">
            <KIconButton
              icon="clear"
              :color="$themeTokens.secondaryText"
              :tooltip="$tr('deleteAction')"
              @click="handleClickDelete(search.id)"
            />
          </div>
        </li>
      </ul>
    </KModal>

    <KModal
      v-if="showDelete"
      :title="$tr('deleteSearchTitle')"
      :cancelText="$tr('cancelAction')"
      :submitText="$tr('deleteAction')"
      @cancel="handleCancel"
      @submit="handleDeleteConfirm"
    >
      <p>{{ $tr('deleteConfirmation') }}</p>
    </KModal>
  </div>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';

  export default {
    name: 'SavedSearchesModal',
    inject: ['RouteNames'],
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
        searchId: null,
      };
    },
    computed: {
      ...mapGetters('importFromChannels', ['savedSearches']),
      dialog: {
        get() {
          return this.value && !this.showDelete;
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
        this.showDelete = false;
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


<style scoped lang="scss">

  .empty-state {
    padding: 8px;
    color: var(--v-grey-base);
  }

  .saved-searches-list {
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .search-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);

    &:last-child {
      border-bottom: none;
    }
  }

  .search-content {
    flex: 1;
    min-width: 0;
  }

  .search-title {
    margin-bottom: 4px;
  }

  .saved-search-link {
    font-weight: 600;
  }

  .metadata {
    font-size: 14px;
    color: var(--v-grey-darken2);

    span:not(:last-child)::after {
      margin: 0 4px;
      color: var(--v-grey-base);
      content: '•';
    }
  }

  .search-actions {
    flex-shrink: 0;
    margin-left: 16px;
  }

</style>
