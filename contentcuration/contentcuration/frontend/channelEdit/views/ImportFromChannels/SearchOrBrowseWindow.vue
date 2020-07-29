<template>

  <VSheet>
    <div v-if="!isBrowsing" class="my-2">
      <ActionLink
        :text="$tr('backToBrowseAction')"
        @click="handleBackToBrowse"
      />
    </div>

    <!-- Search bar -->
    <VLayout row wrap class="mt-4">
      <VFlex md7 sm12>
        <VForm ref="search" @submit.prevent="handleSearchTerm">
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
            <template #append-outer>
              <VBtn
                class="search-btn"
                color="primary"
                type="submit"
                :disabled="!searchIsValid"
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
      @preview="$emit('preview', $event)"
      @change_selected="handleChangeSelected"
      @copy_to_clipboard="handleCopyToClipboard"
    />
    <SearchResultsList
      v-else
      :selected.sync="selected"
      @preview="$emit('preview', $event)"
      @change_selected="handleChangeSelected"
      @copy_to_clipboard="handleCopyToClipboard"
    />
  </VSheet>

</template>


<script>

  import { mapActions } from 'vuex';
  import differenceBy from 'lodash/differenceBy';
  import uniqBy from 'lodash/uniqBy';
  import ChannelList from './ChannelList';
  import ContentTreeList from './ContentTreeList';
  import SearchResultsList from './SearchResultsList';
  import { withChangeTracker } from 'shared/data/changes';

  export default {
    name: 'SearchOrBrowseWindow',
    inject: ['RouterNames'],
    components: {
      ContentTreeList,
      SearchResultsList,
      ChannelList,
    },
    props: {
      selected: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        searchTerm: '',
        topicNode: null,
        copyNode: null,
      };
    },
    computed: {
      isBrowsing() {
        return this.$route.name === this.RouterNames.IMPORT_FROM_CHANNELS_BROWSE;
      },
      backToBrowseRoute() {
        if (this.$route.query.last) {
          return { path: this.$route.query.last };
        }
        return {
          name: this.RouterNames.IMPORT_FROM_CHANNELS_BROWSE,
        };
      },
      searchIsValid() {
        return (this.searchTerm || '').trim().length > 0;
      },
    },
    mounted() {
      this.searchTerm = this.$route.params.searchTerm || '';
    },
    methods: {
      ...mapActions('clipboard', ['copy']),
      handleBackToBrowse() {
        this.$router.push(this.backToBrowseRoute);
        this.$emit('update:selected', []); // Clear selection
      },
      handleSearchTerm() {
        if (this.searchIsValid) {
          this.$router.push({
            name: this.RouterNames.IMPORT_FROM_CHANNELS_SEARCH,
            params: {
              searchTerm: this.searchTerm.trim(),
            },
            query: {
              ...this.$route.query,
              last: this.$route.query.last || this.$route.path,
            },
          });
          this.$emit('update:selected', []); // Clear selection
        }
      },
      handleChangeSelected({ isSelected, nodes }) {
        let newSelected;
        if (isSelected) {
          newSelected = uniqBy(this.selected.concat(nodes), 'id');
        } else {
          newSelected = differenceBy(this.selected, nodes, 'id');
        }
        this.$emit('update:selected', newSelected);
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
        return this.copy({ id: this.copyNode.id })
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

  .search-btn {
    top: -12px;
  }

  .over-app-bar {
    z-index: 3;
  }

</style>
