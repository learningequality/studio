<template>

  <div>
    <!-- Filter Chips -->
    <div class="py-2">
      <VChip
        v-for="(filter, idx) in allFilters"
        :key="idx"
        close
        @input="handleCloseChip(filter)"
      >
        {{ $tr('filterLabel', { label: translateKey(filter.key), count: filter.results }) }}
      </VChip>
    </div>

    <div>
      <VLayout row>

        <!-- Filters -->
        <VFlex sm3>
          <div class="mb-3">
            <a @click="showSavedSearches = true">
              {{ $tr('savedSearchesLabel') }}
            </a>
          </div>
          <SearchFilters
            v-if="searchIsNotEmpty"
            :searchResults="nodes"
            :kindFilters.sync="kindFilters"
            :languageFilters.sync="languageFilters"
          />
        </VFlex>

        <!-- Main area with cards -->
        <VFlex sm9 class="ml-4">
          <VLayout row align-start>
            <VFlex sm8>
              <span class="subheading font-weight-bold">
                {{ $tr('searchResultsCount', {
                  count: nodes.length,
                  searchTerm: currentSearchTerm })
                }}
              </span>
              <RouterLink :to="{}">
                <a href="#" @click="handleClickSaveSearch">
                  {{ $tr('saveSearchAction') }}
                </a>
              </RouterLink>
            </VFlex>

            <VFlex v-if="searchIsNotEmpty" sm4>
              <span>
                <VSelect
                  :label="$tr('resultsPerPageLabel')"
                  :value="25"
                  :items="[25, 50, 100]"
                  :fullWidth="false"
                />
              </span>
            </VFlex>
          </VLayout>

          <div>
            <BrowsingCard
              v-for="node in nodes"
              v-show="nodePassesFilters(node)"
              :key="node.id"
              :node="node"
              :checked="isSelected(node)"
              :inSearch="true"
              class="mb-3"
              @change="handleCardChange($event, node)"
              @preview="$emit('preview', node)"
              @click_clipboard="handleClickClipboard"
            />
            <div v-if="searchIsNotEmpty">
              <Pagination :totalPages="totalPages" />
            </div>
          </div>
        </VFlex>
      </VLayout>
    </div>

    <SavedSearchesModal
      :isOpen="showSavedSearches"
      @cancel="showSavedSearches = false"
    />

  </div>

</template>


<script>

  import find from 'lodash/find';
  import some from 'lodash/some';
  import BrowsingCard from './BrowsingCard';
  import SavedSearchesModal from './SavedSearchesModal';
  import SearchFilters from './SearchFilters';
  import Pagination from 'shared/views/Pagination';
  import { constantsTranslationMixin } from 'shared/mixins';

  export default {
    name: 'SearchResultsList',
    components: {
      BrowsingCard,
      Pagination,
      SavedSearchesModal,
      SearchFilters,
    },
    mixins: [constantsTranslationMixin],
    props: {
      selected: {
        type: Array,
        required: true,
      },
      nodes: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        showSavedSearches: false,
        kindFilters: [],
        languageFilters: [],
      };
    },
    computed: {
      isSelected() {
        return function(node) {
          return find(this.selected, { id: node.id });
        };
      },
      totalPages() {
        return 10;
      },
      currentSearchTerm() {
        return this.$route.params.searchTerm;
      },
      allFilters() {
        return [...this.kindFilters, ...this.languageFilters];
      },
      searchIsNotEmpty() {
        return this.nodes.length > 0;
      },
    },
    watch: {
      allFilters() {
        this.$store.dispatch('showSnackbarSimple', this.$tr('resultsUpdatedSnackbar'));
      },
    },
    beforeRouteUpdate(to, from, next) {
      this.showSavedSearches = false;
      next();
    },
    methods: {
      handleCardChange(isSelected, node) {
        this.$emit('change_selected', { node, isSelected });
      },
      handleClickSaveSearch() {
        // Saves search somewhere
        this.$store.dispatch('showSnackbarSimple', this.$tr('searchSavedSnackbar'));
      },
      handleCloseChip(clearedFilter) {
        if (clearedFilter.type === 'kind') {
          this.kindFilters = this.kindFilters.filter(({ key }) => key !== clearedFilter.key);
        } else if (clearedFilter.type === 'language') {
          this.languageFilters = this.languageFilters.filter(
            ({ key }) => key !== clearedFilter.key
          );
        }
      },
      handleClickClipboard(node) {
        this.$emit('click_clipboard', node);
      },
      nodePassesFilters(node) {
        let passesFilter = true;
        if (this.kindFilters.length > 0) {
          passesFilter = passesFilter && some(this.kindFilters, { key: node.kind });
        }
        if (this.languageFilters.length > 0) {
          passesFilter = passesFilter && some(this.languageFilters, { key: String(node.language) });
        }
        return passesFilter;
      },
      translateKey(key) {
        return this.translateConstant(key) || this.$tr('unknownLabel');
      },
    },
    $trs: {
      searchResultsCount: `{count, number} {count, plural, one {result} other {results}} for '{searchTerm}'`,
      resultsPerPageLabel: 'Results per page',
      saveSearchAction: 'Save search',
      filterLabel: '{label} ({count, number})',
      savedSearchesLabel: 'Saved searches',
      searchSavedSnackbar: 'Search saved',
      resultsUpdatedSnackbar: 'Result updated',
      unknownLabel: 'Unknown',
    },
  };

</script>


<style lang="less" scoped></style>
