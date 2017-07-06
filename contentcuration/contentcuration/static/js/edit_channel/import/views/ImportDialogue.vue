<template>

  <div>
    <!-- SEARCH FORM -->
    <div>
      <form @submit="submitSearch" :disabled="!searchTermIsValid" class="SearchForm">
        <input
          class="search-input"
          v-model="searchTerm"
          type="text"
          placeholder="What are you looking for?"
        />
        <button
          type="submit"
          class="action-button modal-main-action-button"
          @click.prevent="submitSearch"
          :disabled="!searchTermIsValid"
        >
          Search
        </button>
      </form>
    </div>

    <!-- SLOT FOR TREE VIEW OR SEARCH RESULTS -->
    <div id="import_from_channel_box" class="modal-content-default">
      <slot />
    </div>

    <br/>

    <div id="import_bottom_container" class="modal-bottom-content-default">
      <a class="action-text" data-dismiss="modal">
        <span>CANCEL</span>
      </a>
      <button
        class="action-button pull-right modal-main-action-button"
        id="import_content_submit"
        @click="handleClickImport"
        :disabled="!importIsEnabled"
      >
        <span v-if="!importIsEnabled">
          Select content to import...
        </span>
        <span v-else>
          IMPORT
        </span>
      </button>
      <span id="import_file_metadata" class="pull-right">
        <span id="import_file_count">
          {{ topicCount | pluralize('Topic') }} {{ resourceCount | pluralize('Resource') }}
        </span>
        <em id="import_file_size">
          {{ importFileSizeInWords | parenthesize }}
        </em>
      </span>
    </div>
  </div>

</template>


<script>

const stringHelper = require('../../utils/string_helper');
const { hasRelatedContent } = require('../util');
const { mapGetters, mapState, mapActions, mapMutations } = require('vuex');
const  { pluralize, parenthesize } = require('./filters');

module.exports = {
  components: {
    ImportChannelList: require('./ImportChannelList.vue'),
  },
  data() {
    return {
      searchTerm: '',
    };
  },
  computed: {
    ...mapState('import', [
      'itemsToImport',
      'importSizeInBytes',
    ]),
    ...mapGetters('import', [
      'importedItemCounts',
      'currentSearchTerm',
      'currentImportPage',
    ]),
    searchTermIsValid() {
      return this.searchTerm.length >= 3;
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
    importFileSizeInWords() {
      if (this.importSizeInBytes < 0) {
        return 'Calculating Size...';
      }
      return `${stringHelper.format_size(this.importSizeInBytes)}`;
    },
  },
  watch: {
    currentImportPage(newVal, oldVal) {
      // HACK to clear out search terms when user clicks 'back' on results
      if (newVal === 'tree_view' && oldVal === 'search_results') {
        this.searchTerm = '';
      }
    }
  },
  methods: {
    ...mapMutations('import', {
      updateImportStatus: 'UPDATE_IMPORT_STATUS',
    }),
    ...mapActions('import', [
      'goToSearchResults',
    ]),
    submitSearch() {
      // Do nothing if searching for what's currently in results, or double clicking
      if (this.currentSearchTerm === this.searchTerm) return;
      this.goToSearchResults({ searchTerm: this.searchTerm });
    },
    handleClickImport() {
      // Check to see if imports have related content
      if (hasRelatedContent(this.itemsToImport)) {
        this.updateImportStatus('show_warning');
      } else {
        // Triggers import action from ImportModal BB View
        this.updateImportStatus('import_confirmed');
      }
    }
  },
  filters: {
    pluralize,
    parenthesize,
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
