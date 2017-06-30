<template>

  <div>
    <div id="import_from_channel_box" class="modal-content-default">
      <div v-show="isLoading" id="import_empty_text">
        Loading...
      </div>
      <!-- <ImportChannelList :channels="channels" :store="store" /> -->
      <slot></slot>
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
        :disabled="store.itemsToImport.length === 0"
      >
        <span v-if="store.itemsToImport.length === 0">
          Select content to import...
        </span>
        <span v-else>
          IMPORT
        </span>
      </button>
      <span id="import_file_metadata" class="pull-right">
        <span id="import_file_count">
          {{ topicCountInWords }} {{ resourceCountInWords }}
        </span>
        <em id="import_file_size">
          {{ importFileSizeInWords }}
        </em>
      </span>
    </div>
  </div>

</template>


<script>
  const stringHelper = require('../../utils/string_helper');

  // TODO turn into Vue filter
  function pluralize(num, oneWord, manyWord) {
    const word = num === 1 ? oneWord : manyWord;
    return `${num} ${word}`;
  }

  module.exports = {
    props: {
      store: {
        type: Object,
        required: true,
      },
    },
    components: {
      ImportChannelList: require('./ImportChannelList.vue'),
    },
    data() {
      return {
        channels: [],
        isLoading: false,
      };
    },
    mounted() {
      this.isLoading = true;
      this.loadChannels()
      .then(() => {
        this.isLoading = false;
      })
    },
    computed: {
      topicCountInWords() {
        return pluralize(this.store.resourceCounts.topicCount, 'Topic', 'Topics');
      },
      resourceCountInWords() {
        return pluralize(this.store.resourceCounts.resourceCount, 'Resource', 'Resources')
      },
      importFileSizeInWords() {
        return `(${stringHelper.format_size(this.store.totalImportSize)})`;
      },
    },
    methods: {
      loadChannels() {
        return this.store.fetchChannelRoots()
        .then((channelRoots) => {
          const collection = channelRoots;
          collection.forEach((node) => {
            node.set('title', node.get('channel_name'));
          });
          this.channels = collection.toJSON();
        })
        .catch((err) => {
          console.error(err); // eslint-disable-line
        })
      },
      handleClickImport() {
        this.store.commitImport();
      }
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

</style>
