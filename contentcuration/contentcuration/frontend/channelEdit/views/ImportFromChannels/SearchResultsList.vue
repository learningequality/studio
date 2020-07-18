<template>

  <div>
    <!-- Filters -->
    <SearchFilterBar />
    <VLayout row>
      <VFlex class="px-2" sm3>
        <ActionLink
          class="mb-3"
          :text="$tr('savedSearchesLabel')"
          @click="showSavedSearches = true"
        />
        <SearchFilters
          :searchResults="nodes"
        />
      </VFlex>

      <!-- Main area with cards -->
      <VFlex sm9>
        <VProgressLinear v-if="loading" indeterminate />
        <VLayout v-else row align-center>
          <VFlex grow>
            <span class="subheading font-weight-bold">
              {{ $tr('searchResultsCount', {
                count: totalCount,
                searchTerm: currentSearchTerm })
              }}
            </span>
            <ActionLink
              class="mx-2"
              :text="$tr('saveSearchAction')"
              @click="handleClickSaveSearch"
            />
          </VFlex>
          <VFlex v-if="searchIsNotEmpty" style="max-width: 100px;">
            <span>
              <VSelect
                v-model="pageSize"
                :label="$tr('resultsPerPageLabel')"
                :items="pageSizeOptions"
                :fullWidth="false"
                :menu-props="{offsetY: true}"
              />
            </span>
          </VFlex>
        </VLayout>

        <div class="px-4">
          <VLayout v-for="node in nodes" :key="node.id" row align-center>
            <VFlex shrink>
              <Checkbox
                :key="`checkbox-${node.id}`"
                :input-value="isSelected(node)"
                @change="toggleSelected(node)"
              />
            </VFlex>
            <VFlex class="pa-4" grow>
              <BrowsingCard
                :node="node"
                :inSearch="true"
                @preview="$emit('preview', node)"
                @click="toggleSelected(node)"
              />
            </VFlex>
          </VLayout>
          <div v-if="pageCount > 1" class="text-xs-center mt-4">
            <Pagination :totalPages="pageCount" />
          </div>
        </div>
      </VFlex>
    </VLayout>
    <SavedSearchesModal v-model="showSavedSearches" />
  </div>

</template>

<script>

  import { mapActions, mapState } from 'vuex';
  import find from 'lodash/find';
  import BrowsingCard from './BrowsingCard';
  import SavedSearchesModal from './SavedSearchesModal';
  import SearchFilters from './SearchFilters';
  import SearchFilterBar from './SearchFilterBar';
  import Pagination from 'shared/views/Pagination';
  import Checkbox from 'shared/views/form/Checkbox';
  import { constantsTranslationMixin } from 'shared/mixins';

  export default {
    name: 'SearchResultsList',
    components: {
      BrowsingCard,
      Pagination,
      SavedSearchesModal,
      SearchFilters,
      SearchFilterBar,
      Checkbox,
    },
    mixins: [constantsTranslationMixin],
    props: {
      selected: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        loading: false,
        showSavedSearches: false,
        nodes: [],
        pageCount: 0,
        totalCount: 0,
      };
    },
    computed: {
      ...mapState('currentChannel', ['currentChannelId']),
      pageSize: {
        get() {
          return Number(this.$route.query.page_size) || 25;
        },
        set(page_size) {
          this.$router.push({
            ...this.$route,
            query: {
              ...this.$route.query,
              page: 1,
              page_size,
            },
          });
        },
      },
      pageSizeOptions() {
        return [25, 50, 100];
      },
      isSelected() {
        return function(node) {
          return Boolean(find(this.selected, { id: node.id }));
        };
      },
      currentSearchTerm() {
        return this.$route.params.searchTerm;
      },
      searchIsNotEmpty() {
        return this.nodes.length > 0;
      },
    },
    watch: {
      '$route.query'() {
        this.fetch();
      },
    },
    beforeRouteUpdate(to, from, next) {
      this.showSavedSearches = false;
      next();
    },
    mounted() {
      this.fetch();
    },
    methods: {
      ...mapActions('importFromChannels', ['fetchResourceSearchResults']),
      fetch() {
        this.loading = true;
        this.fetchResourceSearchResults({
          ...this.$route.query,
          keywords: this.currentSearchTerm,
          exclude_channel: this.currentChannelId,
          last: undefined,
        }).then(page => {
          this.loading = false;
          this.nodes = page.results;
          this.pageCount = page.total_pages;
          this.totalCount = page.count;
        });
      },
      handleClickSaveSearch() {
        // Saves search somewhere
        this.$store.dispatch('showSnackbarSimple', this.$tr('searchSavedSnackbar'));
      },
      toggleSelected(node) {
        this.$emit('change_selected', { nodes: [node], isSelected: !this.isSelected(node) });
      },
    },
    $trs: {
      searchResultsCount: `{count, number} {count, plural, one {result} other {results}} for '{searchTerm}'`,
      resultsPerPageLabel: 'Results per page',
      saveSearchAction: 'Save search',
      savedSearchesLabel: 'Saved searches',
      searchSavedSnackbar: 'Search saved',
    },
  };

</script>


<style lang="less" scoped></style>
