<template>

  <ImportFromChannelsModal>
    <template #default="{ preview }">
      <VSheet>
        <div v-if="!isBrowsing" class="my-2 px-2">
          <ActionLink
            :text="$tr('backToBrowseAction')"
            @click="handleBackToBrowse"
          />
        </div>
        <!-- Search bar -->
        <VLayout row wrap class="mt-4 px-2">
          <VFlex style="max-width: 700px">
            <VForm ref="search" @submit.prevent="handleSearchTerm">
              <VTextField
                v-model="searchTerm"
                class="searchtext"
                color="primary"
                :label="$tr('searchLabel')"
                box
                clearable
                hideDetails
                @click:clear="handleBackToBrowse"
              >
                <template #prepend-inner>
                  <Icon icon="search" />
                </template>
                <template #append-outer>
                  <VBtn
                    class="px-4 search-btn"
                    color="primary"
                    type="submit"
                    :disabled="!searchIsValid"
                    depressed
                    large
                  >
                    {{ $tr('searchAction') }}
                  </VBtn>
                </template>
              </VTextField>
            </VForm>
          </VFlex>
        </VLayout>

        <div class="my-2 px-2">
          <ActionLink
            class="mb-3"
            :text="$tr('savedSearchesLabel')"
            :disabled="!savedSearchesExist"
            @click="showSavedSearches = true"
          />
        </div>

        <!-- Search or Topics Browsing -->
        <ChannelList
          v-if="isBrowsing && !$route.params.channelId"
          @update-language="updateLanguageQuery"
        />
        <ContentTreeList
          v-else-if="isBrowsing"
          ref="contentTreeList"
          :topicNode="topicNode"
          :selected.sync="selected"
          :topicId="$route.params.nodeId"
          @preview="preview($event)"
          @change_selected="handleChangeSelected"
          @copy_to_clipboard="handleCopyToClipboard"
        />
        <SearchResultsList
          v-else
          :selected.sync="selected"
          @preview="preview($event)"
          @change_selected="handleChangeSelected"
          @copy_to_clipboard="handleCopyToClipboard"
        />
      </VSheet>
      <SavedSearchesModal v-model="showSavedSearches" />
    </template>
  </ImportFromChannelsModal>

</template>


<script>

  import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
  import { RouteNames } from '../../constants';
  import ChannelList from './ChannelList';
  import ContentTreeList from './ContentTreeList';
  import SearchResultsList from './SearchResultsList';
  import SavedSearchesModal from './SavedSearchesModal';
  import ImportFromChannelsModal from './ImportFromChannelsModal';
  import { withChangeTracker } from 'shared/data/changes';

  export default {
    name: 'SearchOrBrowseWindow',
    components: {
      ImportFromChannelsModal,
      ContentTreeList,
      SearchResultsList,
      ChannelList,
      SavedSearchesModal,
    },
    data() {
      return {
        searchTerm: '',
        topicNode: null,
        copyNode: null,
        languageFromChannelList: null,
        showSavedSearches: false,
      };
    },
    computed: {
      ...mapGetters('importFromChannels', ['savedSearchesExist']),
      ...mapState('importFromChannels', ['selected']),
      isBrowsing() {
        return this.$route.name === RouteNames.IMPORT_FROM_CHANNELS_BROWSE;
      },
      backToBrowseRoute() {
        const query = {
          channel_list: this.$route.query.channel_list,
        };
        if (this.$route.query.last) {
          return { path: this.$route.query.last, query };
        }
        return {
          name: RouteNames.IMPORT_FROM_CHANNELS_BROWSE,
          query,
        };
      },
      searchIsValid() {
        return (
          (this.searchTerm || '').trim().length > 0 &&
          this.searchTerm.trim() !== this.$route.params.searchTerm
        );
      },
    },
    beforeRouteEnter(to, from, next) {
      next(vm => {
        vm.searchTerm = to.params.searchTerm || '';
        vm.showSavedSearches = false;
      });
    },
    beforeRouteUpdate(to, from, next) {
      this.searchTerm = to.params.searchTerm || '';
      this.showSavedSearches = false;
      next();
    },
    beforeRouteLeave(to, from, next) {
      // Clear selections if going back to TreeView
      if (to.name === RouteNames.TREE_VIEW) {
        this.$store.commit('importFromChannels/CLEAR_NODES');
      }
      next();
    },
    methods: {
      ...mapActions('clipboard', ['copy']),
      ...mapMutations('importFromChannels', {
        selectNodes: 'SELECT_NODES',
        deselectNodes: 'DESELECT_NODES',
        clearNodes: 'CLEAR_NODES',
      }),
      handleBackToBrowse() {
        this.$router.push(this.backToBrowseRoute);
      },
      updateLanguageQuery(language) {
        this.languageFromChannelList = language;
      },
      handleSearchTerm() {
        if (this.searchIsValid) {
          this.$router.push({
            name: RouteNames.IMPORT_FROM_CHANNELS_SEARCH,
            params: {
              searchTerm: this.searchTerm.trim(),
            },
            query: {
              ...this.$route.query,
              ...(this.isBrowsing ? { languages: this.languageFromChannelList } : {}),
              last: this.$route.query.last || this.$route.path,
              page: 1
            },
          });
          this.languageFromChannelList = null;
          this.clearNodes();
          this.$analytics.trackAction('import_modal', 'Search');
        }
      },
      handleChangeSelected({ isSelected, nodes }) {
        if (isSelected) {
          this.selectNodes(nodes);
        } else {
          this.deselectNodes(nodes);
        }
      },
      handleCopyToClipboard(node) {
        this.copyNode = node;
        return this.copyToClipboard();
      },
      copyToClipboard: withChangeTracker(function(changeTracker) {
        return this.copy({ node_id: this.copyNode.node_id, channel_id: this.copyNode.channel_id })
          .then(() => {
            this.$store
              .dispatch('showSnackbar', {
                text: this.$tr('copiedToClipboard'),
                // TODO: implement revert functionality for clipboard
                // actionText: this.$tr('undo'),
                // actionCallback: () => changeTracker.revert(),
              })
              .then(() => changeTracker.cleanUp());
          })
          .catch(error => {
            this.$store.dispatch('showSnackbarSimple', this.$tr('copyFailed'));
            throw error;
          });
      }),
    },
    $trs: {
      backToBrowseAction: 'Back to browse',
      searchLabel: 'Search for resources…',
      searchAction: 'Search',
      savedSearchesLabel: 'View saved searches',

      // Copy strings
      // undo: 'Undo',
      copiedToClipboard: 'Copied to clipboard',
      copyFailed: 'Failed to copy to clipboard',
    },
  };

</script>


<style lang="less" scoped>

  .v-form {
    max-width: 900px;
  }

  .searchtext /deep/ .v-input__append-outer {
    height: 57px;
    margin: 0;
    margin-top: 0 !important;
  }

  .search-btn {
    height: inherit;
    margin: 0;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  .over-app-bar {
    z-index: 3;
  }

</style>
