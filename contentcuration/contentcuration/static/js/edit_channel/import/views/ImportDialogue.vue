<template>
  <div>
    <!-- SEARCH FORM -->
    <div v-if="!isImportPreview">
      <form :disabled="!searchTermIsValid" class="search-form" @submit="submitSearch">
        <input
          v-model="searchTerm"
          class="search-input"
          type="text"
          dir="auto"
          :placeholder="$tr('searchPrompt')"
        >
        <button
          type="submit"
          class="action-button modal-main-action-button"
          :disabled="!searchTermIsValid"
          @click.prevent="submitSearch"
        >
          {{ $tr('searchButtonLabel') }}
        </button>
      </form>
    </div>

    <!-- SLOT FOR TREE VIEW OR SEARCH RESULTS -->
    <div id="import-from-channel-box" class="modal-content-default">
      <slot></slot>
    </div>

    <br>

    <div id="import-bottom-container" class="modal-bottom-content-default">
      <a class="action-text uppercase" data-dismiss="modal">
        <span>{{ $tr('cancelButtonLabel') }}</span>
      </a>
      <button
        v-if="importIsEnabled"
        id="import-content-submit"
        class="action-button pull-right modal-main-action-button"
        @click="handleClickNext"
      >
        <span class="uppercase">
          {{ submitButtonLabel }}
        </span>
      </button>
      <span v-show="!isImportPreview" id="import-file-metadata" class="pull-right">
        <span id="import-file-count">
          {{ $tr('importCountText', {'topicCount': topicCount, 'resourceCount': resourceCount}) }}
        </span>
      </span>
    </div>
  </div>
</template>


<script>

  import { mapGetters, mapState, mapActions, mapMutations } from 'vuex';
  import { hasRelatedContent } from '../util';
  import { PageTypes } from '../constants';
  import { pluralize } from './filters';

  export default {
    name: 'ImportDialogue',
    $trs: {
      cancelButtonLabel: 'Cancel',
      continue: 'Continue',
      import: 'Import',
      importCountText:
        '{topicCount, plural, =1 {# Topic} other {# Topics}}, {resourceCount, plural, =1 {# Resource} other {# Resources}}',
      searchButtonLabel: 'Search',
      searchPrompt: 'What are you looking for?',
      selectContentPrompt: 'Select content to import...',
    },
    filters: {
      pluralize,
    },
    data() {
      return {
        searchTerm: '',
      };
    },
    computed: Object.assign(
      mapState('import', ['itemsToImport']),
      mapGetters('import', ['importedItemCounts', 'currentSearchTerm', 'currentImportPage']),
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
          return this.currentImportPage === PageTypes.IMPORT_PREVIEW;
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
        if (newVal === PageTypes.TREE_VIEW && oldVal === PageTypes.SEARCH_RESULTS) {
          this.searchTerm = '';
        }
      },
    },
    methods: Object.assign(
      mapMutations('import', {
        updateImportStatus: 'UPDATE_IMPORT_STATUS',
      }),
      mapActions('import', ['goToSearchResults', 'goToImportPreview']),
      {
        submitSearch() {
          // Do nothing if searching for what's currently in results, or double clicking
          if (this.currentSearchTerm === this.searchTerm) return;
          this.goToSearchResults({ searchTerm: this.searchTerm });
        },
        handleClickNext() {
          if (
            this.currentImportPage === PageTypes.SEARCH_RESULTS ||
            this.currentImportPage === PageTypes.TREE_VIEW
          ) {
            return this.goToImportPreview();
          }
          if (this.currentImportPage === PageTypes.IMPORT_PREVIEW) {
            // Check to see if imports have related content
            if (hasRelatedContent(this.itemsToImport)) {
              return this.updateImportStatus('show_warning');
            } else {
              // Triggers import action from ImportModal BB View
              return this.updateImportStatus('import_confirmed');
            }
          }
        },
      }
    ),
  };

</script>


<style lang="less" scoped>

  @import '../../../../less/modal-styles.less';
  @import '../../../../less/global-variables.less';

  #import-from-channel-box {
    width: @uploader-width - 30px;
    height: 500px;
    overflow: scroll;
  }

  #import-content-submit {
    margin-right: 20px;
  }

  #import-file-metadata {
    padding-right: 20px;
    margin-top: 2px;
    font-size: 12pt;
  }

  #import-bottom-container {
    height: 50px;
  }

  .search-input {
    width: 50%;
    padding: 2px 0;
    font-size: @larger-body-text;
    color: @body-font-color;
    background: transparent;
    border: 0;
    border-bottom: 1px solid #bdbdbd;
    &:focus {
      border-bottom: 2px solid @blue-700;
      outline: none;
    }
  }

  .search-form {
    padding: 5px 0;
  }

  button.action-button[disabled] {
    opacity: 0.75;
  }

</style>
