<template>

  <div>
    <!-- SEARCH FORM -->
    <div v-if="!isImportPreview">
      <form @submit="submitSearch" :disabled="!searchTermIsValid" class="SearchForm">
        <input
          class="search-input"
          v-model="searchTerm"
          type="text"
          :placeholder="$tr('searchPrompt')"
        />
        <button
          type="submit"
          class="action-button modal-main-action-button"
          @click.prevent="submitSearch"
          :disabled="!searchTermIsValid"
        >
          {{ $tr('searchButtonLabel')  }}
        </button>
      </form>
    </div>

    <!-- SLOT FOR TREE VIEW OR SEARCH RESULTS -->
    <div id="import_from_channel_box" class="modal-content-default">
      <slot />
    </div>

    <br/>

    <div id="import_bottom_container" class="modal-bottom-content-default">
      <a class="action-text uppercase" data-dismiss="modal">
        <span>{{ $tr('cancelButtonLabel')  }}</span>
      </a>
      <button
        class="action-button pull-right modal-main-action-button"
        id="import_content_submit"
        @click="handleClickImport"
        v-if="importIsEnabled"
      >
        <span class="uppercase">
          {{ submitButtonLabel }}
        </span>
      </button>
      <span v-show="!isImportPreview" id="import_file_metadata" class="pull-right">
        <span id="import_file_count">
          {{ $tr('importCountText', {'topicCount': topicCount, 'resourceCount': resourceCount})  }}
        </span>
      </span>
    </div>
  </div>

</template>


<script>

// const { hasRelatedContent } = require('../util');
const { mapGetters, mapState, mapActions, mapMutations } = require('vuex');
const  { pluralize } = require('./filters');

module.exports = {
  name: 'ImportDialogue',
  $trs: {
    cancelButtonLabel: 'Cancel',
    continue: 'Continue',
    import: 'Import',
    importCountText: '{topicCount, plural, =1 {# Topic} other {# Topics}}, {resourceCount, plural, =1 {# Resource} other {# Resources}}',
    searchButtonLabel: 'Search',
    searchPrompt: 'What are you looking for?',
    selectContentPrompt: 'Select content to import...',
  },
  components: {
    ImportChannelList: require('./ImportChannelList.vue'),
  },
  data() {
    return {
      searchTerm: '',
    };
  },
  computed: Object.assign(
    mapState('import', [
      'itemsToImport',
    ]),
    mapGetters('import', [
      'importedItemCounts',
      'currentSearchTerm',
      'currentImportPage',
    ]),
    {
      searchTermIsValid() {
        return this.searchTerm.length > 0;
      },
      importIsEnabled() {
        return this.itemsToImport.length > 0;
      },
      topicCount() {
        return this.importedItemCounts.topics;
      },
      resourceCount() {
        return this.importedItemCounts.resources;
      },
      isImportPreview() {
        return this.currentImportPage === 'import_preview';
      },
      submitButtonLabel() {
        if (this.isImportPreview) {
          return this.$tr('import');
        }
        return this.$tr('continue');
      },
    }
  ),
  watch: {
    currentImportPage(newVal, oldVal) {
      // HACK to clear out search terms when user clicks 'back' on results
      if (newVal === 'tree_view' && oldVal === 'search_results') {
        this.searchTerm = '';
      }
    }
  },
  methods: Object.assign(
    mapMutations('import', {
      updateImportStatus: 'UPDATE_IMPORT_STATUS',
    }),
    mapActions('import', [
      'goToSearchResults',
      'goToImportPreview',
    ]),
    {
      submitSearch() {
        // Do nothing if searching for what's currently in results, or double clicking
        if (this.currentSearchTerm === this.searchTerm) return;
        this.goToSearchResults({ searchTerm: this.searchTerm });
      },
      handleClickImport() {
        // Check to see if imports have related content
        this.goToImportPreview();
        // if (hasRelatedContent(this.itemsToImport)) {
        //   this.updateImportStatus('show_warning');
        // } else {
        //   // Triggers import action from ImportModal BB View
        //   this.updateImportStatus('import_confirmed');
        // }
      }
    }
  ),
  filters: {
    pluralize,
  },
}

</script>

<style lang="less" scoped>

@import "../../../../less/modal-styles.less";
@import "../../../../less/global-variables.less";

#import_from_channel_box {
  width: @uploader-width - 30px;
}

#import_content_submit {
  margin-right: 20px;
}

#import_file_metadata {
  padding-right: 20px;
  font-size: 12pt;
  margin-top: 2px;
}

#import_bottom_container {
  height: 50px;
}

.search-input {
  width: 50%;
  padding: 2px 0;
  font-size: @larger-body-text;
  color: @body-font-color;
  background: transparent;
  border: none;
  border-bottom: 1px solid #BDBDBD;
  &:focus {
    outline: none;
    border-bottom: 2px solid @blue-700;
  }
}

.SearchForm {
  padding: 5px 0;
}

button.action-button[disabled] {
  opacity: 0.75;
}

</style>
