<template>

  <ImportFromChannelsModal>
    <template #default="{ preview }">
      <VSheet>
        <div v-if="!isBrowsing" class="my-2">
          <ActionLink
            :text="$tr('backToBrowseAction')"
            @click="handleBackToBrowse"
          />
        </div>

        <!-- Search bar -->
        <VLayout row wrap class="mt-4">
          <VFlex xl4 lg5 md7 sm12>
            <VForm ref="search" @submit.prevent="handleSearchTerm">
              <VTextField
                v-model="searchTerm"
                class="searchtext"
                color="primary"
                :label="$tr('searchLabel')"
                box
                clearable
                hideDetails
              >
                <template #prepend-inner>
                  <Icon>
                    search
                  </Icon>
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

        <!-- Search or Topics Browsing -->
        <ChannelList
          v-if="isBrowsing && !$route.params.channelId"
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
    </template>
  </ImportFromChannelsModal>

</template>


<script>

  import { mapActions, mapMutations, mapState } from 'vuex';
  import { RouterNames } from '../../constants';
  import ChannelList from './ChannelList';
  import ContentTreeList from './ContentTreeList';
  import SearchResultsList from './SearchResultsList';
  import ImportFromChannelsModal from './ImportFromChannelsModal';
  import { withChangeTracker } from 'shared/data/changes';

  export default {
    name: 'SearchOrBrowseWindow',
    components: {
      ImportFromChannelsModal,
      ContentTreeList,
      SearchResultsList,
      ChannelList,
    },
    data() {
      return {
        searchTerm: '',
        topicNode: null,
        copyNode: null,
      };
    },
    computed: {
      ...mapState('importFromChannels', ['selected']),
      isBrowsing() {
        return this.$route.name === RouterNames.IMPORT_FROM_CHANNELS_BROWSE;
      },
      backToBrowseRoute() {
        const query = {
          channel_list: this.$route.query.channel_list,
        };
        if (this.$route.query.last) {
          return { path: this.$route.query.last, query };
        }
        return {
          name: RouterNames.IMPORT_FROM_CHANNELS_BROWSE,
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
    mounted() {
      this.searchTerm = this.$route.params.searchTerm || '';
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
      handleSearchTerm() {
        if (this.searchIsValid) {
          this.$router.push({
            name: RouterNames.IMPORT_FROM_CHANNELS_SEARCH,
            params: {
              searchTerm: this.searchTerm.trim(),
            },
            query: {
              ...this.$route.query,
              last: this.$route.query.last || this.$route.path,
            },
          });
          this.clearNodes();
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
        this.$store.dispatch('showSnackbar', {
          duration: null,
          text: this.$tr('copyingToClipboard'),
          actionText: this.$tr('cancel'),
          actionCallback: () => changeTracker.revert(),
        });
        return this.copy({ node_id: this.copyNode.node_id, channel_id: this.copyNode.channel_id })
          .then(() => {
            return this.$store.dispatch('showSnackbar', {
              text: this.$tr('copiedToClipboard'),
              actionText: this.$tr('undo'),
              actionCallback: () => changeTracker.revert(),
            });
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

      // Copy strings
      undo: 'Undo',
      cancel: 'Cancel',
      copyingToClipboard: 'Copying to clipboard...',
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
