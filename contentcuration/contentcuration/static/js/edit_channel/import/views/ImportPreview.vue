<template>

  <div class="ImportPreview">
    <button @click="goToPreviousPage()" class="BackButton button-reset">
      {{ $tr('back') }}
    </button>
    <span>({{ $tr('backWarning') }})</span>

    <div>
      <div class="resources-msg">
        {{ $tr('resourcesSize', { resources: importedItemCounts.resources, fileSize: importFileSizeInWords }) }}
      </div>
      <div class="resources-list">
        <ul class="list-unstyled">
          <ImportListItem
            v-for="item in itemsToImport"
            :key="item.id"
            :node="item"
            :isChannel="false"
            :readOnly="true"
            :isFolder="item.children.length > 0"
          />
        </ul>
      </div>
    </div>
  </div>

</template>


<script>

  import { mapState, mapActions, mapGetters } from 'vuex';
  import ImportListItem from './ImportListItem.vue';
  import stringHelper from '../../utils/string_helper';

  export default {
    name: 'ImportPreview',
    components: {
      ImportListItem,
    },
    computed: Object.assign(
      mapState('import', [
        'itemsToImport',
        'importSizeInBytes',
      ]),
      mapGetters('import', ['importedItemCounts']),
      {
        importFileSizeInWords() {
          if (this.importSizeInBytes < 0) {
            return this.$tr('calculatingSizeText');
          }
          return `${stringHelper.format_size(this.importSizeInBytes)}`;
        },
      }
    ),
    mounted() {
      this.calculateImportSize();
    },
    methods: Object.assign(
      mapActions('import', [
        'calculateImportSize',
        'goToPreviousPage',
      ]),
      {
      }
    ),
    $trs: {
      calculatingSizeText: 'Calculating Size...',
      resourcesSize: '{ resources } Total resources selected ({ fileSize })',
      back: 'Back',
      backWarning: 'Note: Your previous selections will be lost.'
    },
  }

</script>


<style lang="less" scoped>

  .ImportPreview {
    padding: 1.5em;
  }

  .resources-msg {
    font-weight: bold;
    font-size: 1.25em;
    margin-bottom: 1em;
  }

  .button-reset {
    -webkit-appearance: none;
    border: none;
    background: none;
  }

  .BackButton {
    color: #2196F3;
    text-decoration: underline;
    margin-bottom: 1em;
    font-size: 1.25em;
  }

</style>
