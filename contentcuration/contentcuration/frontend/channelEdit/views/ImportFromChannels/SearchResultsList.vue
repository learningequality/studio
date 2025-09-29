<template>

  <div>
    <!-- Filters -->
    <SearchFilterBar />
    <VLayout row>
      <VFlex shrink>
        <SearchFilters :searchResults="nodes" />
      </VFlex>

      <!-- Main area with cards -->
      <VFlex class="pl-4">
        <VContainer v-if="loadFailed">
          <p class="text-xs-center">
            <Icon icon="error" />
          </p>
          <p class="text-xs-center">
            {{ $tr('failedToLoad') }}
          </p>
        </VContainer>
        <VContainer
          v-else
          class="mx-0 px-1"
        >
          <LoadingText
            v-if="loading"
            ref="loading"
          />
          <VLayout
            v-else
            row
            align-center
          >
            <VFlex grow>
              <span class="font-weight-bold subheading">
                {{
                  $tr('searchResultsCount', {
                    count: totalCount,
                    searchTerm: currentSearchTerm,
                  })
                }}
              </span>
              <ActionLink
                class="mx-2"
                :disabled="currentSearchSaved"
                :text="currentSearchSaved ? $tr('searchSavedSnackbar') : $tr('saveSearchAction')"
                @click="handleClickSaveSearch"
              />
            </VFlex>
            <VFlex
              v-if="searchIsNotEmpty"
              style="max-width: 100px"
            >
              <span>
                <VSelect
                  v-model="pageSize"
                  :label="$tr('resultsPerPageLabel')"
                  :items="pageSizeOptions"
                  :fullWidth="false"
                  :menu-props="{ offsetY: true }"
                />
              </span>
            </VFlex>
          </VLayout>
          <div v-if="!loading">
            <VLayout
              v-for="node in nodes"
              :key="node.id"
              row
              align-center
              class="py-2"
            >
              <VFlex
                class="px-1"
                shrink
              >
                <Checkbox
                  :key="`checkbox-${node.id}`"
                  :ref="setFirstCardCheckboxRef"
                  :inputValue="isSelected(node)"
                  class="mt-0 pt-0"
                  @input="toggleSelected(node)"
                />
              </VFlex>
              <VFlex
                shrink
                grow
                style="width: 100%"
              >
                <BrowsingCard
                  :node="node"
                  :inSearch="true"
                  @preview="$emit('preview', node)"
                  @click="toggleSelected(node)"
                  @copy_to_clipboard="$emit('copy_to_clipboard', node)"
                />
              </VFlex>
            </VLayout>
            <div
              v-if="pageCount > 1"
              class="mt-4 text-xs-center"
            >
              <Pagination :totalPages="pageCount" />
            </div>
          </div>
        </VContainer>
      </VFlex>
    </VLayout>
  </div>

</template>


<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import debounce from 'lodash/debounce';
  import find from 'lodash/find';
  import pickBy from 'lodash/pickBy';
  import { ImportSearchPageSize } from '../../constants';
  import BrowsingCard from './BrowsingCard';
  import SearchFilters from './SearchFilters';
  import SearchFilterBar from './SearchFilterBar';
  import logging from 'shared/logging';
  import Pagination from 'shared/views/Pagination';
  import Checkbox from 'shared/views/form/Checkbox';
  import LoadingText from 'shared/views/LoadingText';
  import { constantsTranslationMixin } from 'shared/mixins';

  export default {
    name: 'SearchResultsList',
    components: {
      BrowsingCard,
      Pagination,
      SearchFilters,
      SearchFilterBar,
      Checkbox,
      LoadingText,
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
        loadFailed: false,
        hasLoaded: false,
        nodeIds: [],
        pageCount: 0,
        totalCount: 0,
        firstCardCheckboxRef: null,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNodes']),
      ...mapGetters('importFromChannels', ['getSavedSearch']),
      ...mapState('currentChannel', ['currentChannelId']),
      nodes() {
        return this.getContentNodes(this.nodeIds) || [];
      },
      pageSizeOptions() {
        return [10, 15, 25];
      },
      pageSize: {
        get() {
          const pageSize = Number(this.$route.query.page_size);
          return this.pageSizeOptions.find(p => p === pageSize) || ImportSearchPageSize;
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
      isSelected() {
        return function (node) {
          return Boolean(find(this.selected, { id: node.id }));
        };
      },
      currentSearchTerm() {
        return this.$route.params.searchTerm;
      },
      searchIsNotEmpty() {
        return this.nodes.length > 0;
      },
      savedSearchParams() {
        const params = { ...this.$route.query };
        delete params.last;
        delete params.page_size;
        delete params.page;
        return pickBy({
          ...params,
          keywords: this.$route.params.searchTerm,
        });
      },
      currentSearchSaved() {
        return Boolean(this.getSavedSearch(this.savedSearchParams));
      },
    },
    watch: {
      '$route.query'() {
        this.fetch();
      },
    },
    created() {
      this.fetch();
    },
    methods: {
      ...mapActions('importFromChannels', [
        'fetchResourceSearchResults',
        'createSearch',
        'loadSavedSearches',
      ]),
      fetch() {
        this.loading = true;
        this.loadFailed = false;
        this.firstCardCheckboxRef = null;
        this.fetchResultsDebounced();
        this.loadSavedSearches();
        // Ensure loading spinner is in view after initial load
        if (this.hasLoaded) {
          this.$nextTick(() => {
            this.$refs.loading.$el.scrollIntoView();
          });
        }
      },
      fetchResultsDebounced: debounce(
        function () {
          this.fetchResourceSearchResults({
            ...this.$route.query,
            page_size: this.pageSize,
            keywords: this.currentSearchTerm,
            exclude_channel: this.currentChannelId,
            last: undefined,
          })
            .then(page => {
              this.loading = false;
              this.nodeIds = page.results.map(n => n.id);
              this.pageCount = page.total_pages;
              this.totalCount = page.count;
              this.hasLoaded = true;
              this.$nextTick(() => this.focus());
            })
            .catch(e => {
              this.loadFailed = true;
              logging.error(e);
            });
        },
        1000,
        { trailing: true },
      ),
      handleClickSaveSearch() {
        this.createSearch(this.savedSearchParams).then(() => {
          this.$store.dispatch('showSnackbarSimple', this.$tr('searchSavedSnackbar'));
        });
      },
      toggleSelected(node) {
        this.$emit('change_selected', { nodes: [node], isSelected: !this.isSelected(node) });
      },
      setFirstCardCheckboxRef(ref) {
        if (!this.firstCardCheckboxRef) {
          this.firstCardCheckboxRef = ref;
        }
      },
      /**
       * @public
       */
      focus() {
        if (this.firstCardCheckboxRef) {
          this.firstCardCheckboxRef.focus();
        }
      },
    },
    $trs: {
      searchResultsCount:
        "{count, number} {count, plural, one {result} other {results}} for '{searchTerm}'",
      resultsPerPageLabel: 'Results per page',
      saveSearchAction: 'Save search',
      searchSavedSnackbar: 'Search saved',
      failedToLoad: 'Failed to load search results',
    },
  };

</script>


<style lang="scss" scoped></style>
