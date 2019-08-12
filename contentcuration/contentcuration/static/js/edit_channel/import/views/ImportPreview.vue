<template>
  <div class="import-preview">
    <button class="back-button button-reset" @click="goToPreviousPage()">
      {{ $tr('back') }}
    </button>
    <span>({{ $tr('backWarning') }})</span>

    <div>
      <div class="resources-msg">
        {{ $tr('resourcesSize', {
          resources: importedItemCounts.resources
        })
        }}
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
  import stringHelper from '../../utils/string_helper';
  import ImportListItem from './ImportListItem.vue';

  export default {
    name: 'ImportPreview',
    components: {
      ImportListItem,
    },
    computed: Object.assign(
      mapState('import', ['itemsToImport', 'importSizeInBytes']),
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
    mounted() {},
    methods: Object.assign(mapActions('import', ['goToPreviousPage']), {}),
    $trs: {
      calculatingSizeText: 'Calculating Size...',
      resourcesSize: '{ resources } Total resources selected',
      back: 'Back',
      backWarning: 'Note: Your previous selections will be lost.',
    },
  };

</script>


<style lang="less" scoped>

  .import-preview {
    padding: 1.5em;
  }

  .resources-msg {
    margin-bottom: 1em;
    font-size: 1.25em;
    font-weight: bold;
  }

  .button-reset {
    background: none;
    border: 0;
    appearance: none;
  }

  .back-button {
    margin-bottom: 1em;
    font-size: 1.25em;
    color: #2196f3;
    text-decoration: underline;
  }

</style>
