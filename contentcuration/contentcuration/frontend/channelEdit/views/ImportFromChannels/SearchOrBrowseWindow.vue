<template>

  <div>
    <VToolbar app fixed dark color="primary" class="over-app-bar">
      <VBtn icon :to="exitRoute" @click="$emit('close')">
        <VIcon>close</VIcon>
      </VBtn>
      <VToolbarTitle>
        {{ $tr('toolbarTitle') }}
      </VToolbarTitle>
    </VToolbar>

    <VSheet
      class="pa-5 ma-5"
      elevation="2"
    >
      <div v-if="currentView === 'search'" class="my-2">
        <RouterLink :to="backToBrowseRoute">
          {{ $tr('backToBrowseAction') }}
        </RouterLink>
      </div>

      <!-- Search bar -->
      <VLayout row wrap>
        <VFlex md7 sm12>
          <form @submit.prevent="handleSearchTerm">
            <VTextField
              v-model="searchTerm"
              color="primary"
              :label="$tr('searchLabel')"
              single-line
              outline
              clearable
              hideDetails
              prepend-inner-icon="search"
            >
              <template v-slot:append-outer>
                <VBtn class="search-btn" color="primary" type="submit">
                  {{ $tr('searchAction') }}
                </VBtn>
              </template>
            </VTextField>
            <VCheckbox
              v-model="searchTopics"
              :label="$tr('searchTopics')"
            />
          </form>
        </VFlex>
      </VLayout>

      <!-- Search or Topics Browsing -->
      <div>
        <VProgressLinear v-if="loading " :indeterminate="true" />
        <template v-else>
          <ContentTreeList
            v-if="currentView === 'browse'"
            ref="contentTreeList"
            :nodes="nodes"
            :topicNode="topicNode"
            :channelNode="channelNode"
            :selected.sync="selected"
            @preview="$emit('preview', $event)"
            @change_selected="handleChangeSelected"
            @change_select_all="handleChangeSelectAll"
            @click_clipboard="handleClickClipboard"
          />
          <SearchResultsList
            v-else
            :selected.sync="selected"
            :nodes="nodes"
            @preview="$emit('preview', $event)"
            @change_selected="handleChangeSelected"
            @click_clipboard="handleClickClipboard"
          />
        </template>
      </div>

    </VSheet>

    <BottomToolBar>
      <span>
        {{ $tr('resourcesSelected', { count: selectedResourcesCount }) }}
      </span>
      <VBtn
        :disabled="selected.length === 0"
        color="primary"
        :to="{ name: RouterNames.IMPORT_FROM_CHANNELS_REVIEW }"
      >
        {{ $tr('reviewAction') }}
      </VBtn>
    </BottomToolBar>
  </div>

</template>


<script>

  import differenceBy from 'lodash/differenceBy';
  import ContentTreeList from './ContentTreeList.vue';
  import SearchResultsList from './SearchResultsList';
  import BottomToolBar from 'shared/views/BottomToolBar';

  export default {
    name: 'SearchOrBrowseWindow',
    inject: ['RouterNames'],
    components: {
      BottomToolBar,
      ContentTreeList,
      SearchResultsList,
    },
    props: {
      selected: {
        type: Array,
        required: true,
      },
      currentView: {
        type: String,
        required: true,
      },
      selectedResourcesCount: {
        type: Number,
        default: 0,
      },
    },
    data() {
      return {
        searchTerm: '',
        searchTopics: false,
        topicNode: null,
        channelNode: null,
        nodes: [],
        loading: true,
      };
    },
    computed: {
      exitRoute() {
        return {
          name: this.RouterNames.TREE_VIEW,
          params: {
            nodeId: this.$route.params.destNodeId,
          },
        };
      },
      backToBrowseRoute() {
        if (this.$route.query.last) {
          return { path: this.$route.query.last };
        }
        return {
          name: this.RouterNames.IMPORT_FROM_CHANNELS_BROWSE,
        };
      },
    },
    beforeRouteEnter(to, from, next) {
      next(vm => {
        if (to.name === vm.RouterNames.IMPORT_FROM_CHANNELS_SEARCH) {
          vm.loadSearchResultsForRoute(to);
        } else {
          vm.loadNodesForRoute(to);
        }
      });
    },
    beforeRouteUpdate(to, from, next) {
      if (to.name === this.RouterNames.IMPORT_FROM_CHANNELS_SEARCH) {
        this.loadSearchResultsForRoute(to).then(next);
      } else {
        this.loadNodesForRoute(to).then(next);
      }
    },
    methods: {
      handleSearchTerm() {
        const term = this.searchTerm.trim();
        if (term) {
          this.$router.push({
            name: this.RouterNames.IMPORT_FROM_CHANNELS_SEARCH,
            params: {
              searchTerm: this.searchTerm,
            },
            query: {
              last: this.$route.query.last || this.$route.path,
              topics: Number(this.searchTopics),
            },
          });
        }
      },
      loadSearchResultsForRoute(toRoute) {
        this.searchTerm = toRoute.params.searchTerm;
        this.loading = true;
        if (toRoute.query.topics === '1') {
          this.searchTopics = true;
        }
        return this.$store
          .dispatch('importFromChannels/fetchResourceSearchResults', {
            searchTerm: toRoute.params.searchTerm,
            searchTopics: Number(toRoute.query.topics),
          })
          .then(data => {
            this.nodes = data || [];
            this.loading = false;
          })
          .catch(() => {
            this.nodes = [];
            this.loading = false;
          });
      },
      loadNodesForRoute(toRoute) {
        this.searchTerm = '';
        this.loading = true;
        this.topicNode = null;
        this.channelNode = null;
        // Need to get topic node for the ancestors
        if (toRoute.params.nodeId) {
          this.$store
            .dispatch('importFromChannels/getTopicContentNode', toRoute.params.nodeId)
            .then(node => {
              this.topicNode = node;
            });
        }
        this.$store
          .dispatch('importFromChannels/getChannelContentNode', toRoute.params.channelId)
          .then(node => {
            this.channelNode = node;
          });
        return this.$store
          .dispatch('importFromChannels/fetchContentNodes', {
            channelId: toRoute.params.channelId,
            topicId: toRoute.params.nodeId,
          })
          .then(data => {
            this.nodes = [...data];
            this.loading = false;
            if (this.$route.query.nodeId) {
              this.$nextTick().then(() => {
                this.$refs.contentTreeList.scrollToNode(this.$route.query.nodeId);
              });
            }
          });
      },
      handleChangeSelectAll(isSelected) {
        let newSelected;
        if (isSelected) {
          let newNodes = differenceBy(this.nodes, this.selected, 'id');
          newNodes = newNodes.map(this.appendBackRoute);
          newSelected = [...this.selected, ...newNodes];
        } else {
          newSelected = differenceBy(this.selected, this.nodes, 'id');
        }
        this.$emit('update:selected', newSelected);
      },
      handleChangeSelected({ isSelected, node }) {
        let newSelected;
        if (isSelected) {
          const newNode = this.appendBackRoute(node);
          newSelected = [...this.selected, newNode];
        } else {
          newSelected = this.selected.filter(x => x.id !== node.id);
        }
        this.$emit('update:selected', newSelected);
      },
      appendBackRoute(node) {
        if (this.currentView === 'browse') {
          return {
            ...node,
            channelName: this.channelNode.title,
            backRoute: {
              ...this.$route,
              query: {
                nodeId: node.id,
              },
            },
          };
        } else {
          return {
            ...node,
            // TODO get the channel name into search results somehow
            channelName: null,
            backRoute: {
              name: this.RouterNames.IMPORT_FROM_CHANNELS_BROWSE,
              params: {
                channelId: node.source_channel_id,
                nodeId: node.parent,
              },
              query: {
                nodeId: node.id,
              },
            },
          };
        }
      },
      handleClickClipboard() {
        this.$store.dispatch('showSnackbarSimple', this.$tr('savedToClipboardNotification'));
      },
    },
    $trs: {
      resourcesSelected:
        '{count, number} {count, plural, one {resource} other {resources}} selected',
      reviewAction: 'Review',
      backToBrowseAction: 'Back to browse',
      searchLabel: 'Search for resources…',
      searchAction: 'Search',
      // Temporary UI until we have a combined search endpoint
      searchTopics: 'Search topics',
      toolbarTitle: 'Import from other channels',
      savedToClipboardNotification: 'Saved to clipboard',
    },
  };

</script>


<style lang="less" scoped>

  .search-btn {
    top: -12px;
  }

  .over-app-bar {
    z-index: 3;
  }

</style>
