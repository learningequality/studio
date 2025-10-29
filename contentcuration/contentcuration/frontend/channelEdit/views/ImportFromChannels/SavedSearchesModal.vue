<template>
  <div>
    <!-- Header -->
    <div class="saved-searches-header">
      <h1 class="saved-searches-title">{{ $tr('savedSearchesTitle') }}</h1>
      <button
        class="close-button"
        :aria-label="$tr('closeButtonLabel')"
        @click="close"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-state" role="status" aria-live="polite">
      <div class="spinner"></div>
      <p>{{ $tr('loadingLabel') }}</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="!savedSearches.length" class="empty-state">
      <p>{{ $tr('noSavedSearches') }}</p>
    </div>

    <!-- Saved searches list -->
    <nav v-else class="saved-searches-list" role="region" :aria-label="$tr('savedSearchesTitle')">
      <ul class="search-items">
        <li v-for="savedSearch in savedSearches" :key="savedSearch.id" class="search-item">
          <button
            class="search-item-button"
            @click="goToSearch(savedSearch)"
          >
            <span class="search-term">{{ savedSearch.name }}</span>
            <span class="metadata">
              <span class="filter-count">{{ formatFilterCount(savedSearch) }}</span>
            </span>
          </button>
          <button
            class="delete-button"
            :aria-label="$tr('deleteButtonLabel', { name: savedSearch.name })"
            @click="deleteSavedSearch(savedSearch)"
          >
            <span aria-hidden="true">🗑</span>
          </button>
        </li>
      </ul>
    </nav>

    <!-- Delete confirmation dialog -->
    <MessageDialog
      v-if="showDeleteConfirmation"
      :title="$tr('deleteSearchTitle')"
      :message="$tr('deleteConfirmation')"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirmation = false"
    />
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import MessageDialog from 'shared/views/MessageDialog';

const RouteNames = {
  IMPORT_FROM_CHANNELS_SEARCH: 'IMPORT_FROM_CHANNELS_SEARCH',
};

export default {
  name: 'SavedSearchesModal',
  components: {
    MessageDialog,
  },
  data() {
    return {
      showDeleteConfirmation: false,
      searchToDelete: null,
      loading: false,
    };
  },
  computed: {
    ...mapGetters('channelEdit', ['savedSearches']),
  },
  methods: {
    close() {
      this.$emit('close');
    },
    goToSearch(savedSearch) {
      const { name, params, query } = savedSearch;
      this.$router.push({
        name: RouteNames.IMPORT_FROM_CHANNELS_SEARCH,
        params: {
          ...this.$route.params,
          searchTerm: name,
        },
        query,
      });
    },
    deleteSavedSearch(savedSearch) {
      this.searchToDelete = savedSearch;
      this.showDeleteConfirmation = true;
    },
    confirmDelete() {
      if (this.searchToDelete) {
        this.$store.dispatch('channelEdit/deleteSavedSearch', this.searchToDelete.id);
        this.showDeleteConfirmation = false;
        this.$emit('deleted');
      }
    },
    formatFilterCount(savedSearch) {
      const count = Object.entries(savedSearch.params).reduce((sum, [key, val]) => {
        if (key === 'keywords' || val === null) {
          return sum;
        }
        if (typeof val === 'boolean') {
          return sum + 1;
        }
        return sum + val.split(',').length;
      }, 0);
      return this.$tr('filterCount', { count });
    },
    loadingLabel() {
      return 'Loading saved searches...';
    },
  },
  $trs: {
    closeButtonLabel: 'Close',
    deleteButtonLabel: 'Delete {name}',
    deleteAction: 'Delete',
    savedSearchesTitle: 'Saved searches',
    noSavedSearches: 'You do not have any saved searches',
    searchDeletedSnackbar: 'Saved search deleted',
    filterCount: '{count, number} {count, plural, one {filter} other {filters}}',
    // Delete strings
    deleteSearchTitle: 'Delete saved search',
    deleteConfirmation: 'Are you sure you want to delete this saved search?',
    cancelAction: 'Cancel',
    loadingLabel: 'Loading saved searches...',
  },
};
</script>

<style scoped lang="scss">
// Use CSS custom properties for colors instead of Vuetify variables
.saved-searches-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.saved-searches-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;

  &:hover {
    opacity: 0.7;
  }

  &:focus {
    outline: 2px solid #1976d2;
    outline-offset: 2px;
  }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 1rem;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #1976d2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #666;
}

.saved-searches-list {
  padding: 0;
  margin: 0;
}

.search-items {
  list-style: none;
  padding: 0;
  margin: 0;
}

.search-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;

  &:hover {
    background-color: #fafafa;
  }
}

.search-item-button {
  flex: 1;
  background: none;
  border: none;
  text-align: left;
  padding: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  &:focus {
    outline: 2px solid #1976d2;
    outline-offset: -2px;
  }
}

.search-term {
  font-weight: 500;
  color: #333;
}

.metadata {
  color: #999;
  font-size: 0.875rem;

  span:not(:last-child)::after {
    margin: 0 4px;
    color: #ccc;
    content: '•';
  }
}

.filter-count {
  display: inline;
}

.delete-button {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    opacity: 0.7;
  }

  &:focus {
    outline: 2px solid #1976d2;
    outline-offset: 2px;
  }
}
</style>
