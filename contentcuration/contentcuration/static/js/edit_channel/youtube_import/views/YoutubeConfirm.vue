<template>

  <div class="YoutubeConfirm">
    <div class="container-fluid" id="youtube-info-box">
      <div class="row">
        <div class="col-xs-4">{{ $tr('title') }}</div>
        <div class="col-xs-8">{{youtubeData.title}}</div>
      </div>
      <div class="row">
        <div class="col-xs-4">{{ $tr('author') }}</div>
        <div class="col-xs-8">{{youtubeData.author}}</div>
      </div>
      <div class="row">
        <div class="col-xs-4">{{ $tr('type') }}</div>
        <div class="col-xs-8">{{youtubeData.type}}</div>
      </div>
      <div class="row">
        <div class="col-xs-4">{{ $tr('videos') }}</div>
        <div class="col-xs-8">{{youtubeData.videos}}</div>
      </div>
      <div class="row">
        <div class="col-xs-4">{{ $tr('resolution') }}</div>
        <div class="col-xs-8">
          <ul class="list-unstyled">
            <YoutubeResolutionOption
              v-for="resolution in youtubeData.resolutions"
              :key="resolution.resolution"
              :resolution="resolution"
            />
          </ul>
        </div>
      </div>
      <div class="row">
        <div class="col-xs-4">{{ $tr('total_size') }}</div>
        <div class="col-xs-8">{{totalSize}}</div>
      </div>
      <div class="row">
        <div class="col-xs-4">{{ $tr('available_storage') }}</div>
        <div class="col-xs-8">{{availableStorage}}</div>
      </div>
      <div class="row">
        <div class="col-xs-4">{{ $tr('license') }}</div>
        <div class="col-xs-8">{{youtubeData.license}}</div>
      </div>
    </div>
    <button
      class="action-button pull-right modal-main-action-button"
      id="youtube_url_submit"
      @click="startDownload"
      :disabled="!enableSubmit"
    >
      <span class="uppercase">
        {{ submitButtonLabel }}
        <i v-if="isDownloading" class="material-icons upload-progress">autorenew</i>
      </span>
    </button>
  </div>

</template>


<script>

  import { mapState, mapActions, mapGetters } from 'vuex';
  import stringHelper from '../../utils/string_helper';
  import { PageTypes, ImportStatus } from '../constants';
  import YoutubeResolutionOption from './YoutubeResolutionOption.vue';

  export default {
    name: 'YoutubeConfirm',
    components: {
      YoutubeResolutionOption,
    },
    computed: Object.assign(
      mapGetters('youtube_import', ['youtubeData', 'downloadSize']),
      {
        enableSubmit() {
          // TODO: Add extra validation?
          return !this.isDownloading;
        },
        isDownloading() {
          return this.currentStatus === ImportStatus.DOWNLOADING;
        },
        submitButtonLabel() {
          if (this.isDownloading) {
            return this.$tr('loading');
          }
          return this.$tr('import');
        },
        totalSize() {
          return `${stringHelper.format_size(this.downloadSize)}`;
        },
        availableStorage() {
          return `${stringHelper.format_size(this.youtubeData.available_storage)}`;
        }
      }
    ),
    methods: Object.assign(
      mapActions('youtube_import', [
        'goToSubmitURL',
      ]),
      {
        startDownload() {
          this.submitYoutubeURL({url: this.youtubeUrl, onSuccess: this.goToConfirm});
        }
    }
    ),
    $trs: {
      title: 'Title',
      author: 'Author',
      type: 'Type',
      resolution: 'Resolution',
      license: 'License',
      videos: 'Videos',
      available_storage: 'Available Storage',
      total_size: 'Total Size',
      import: "Import"
    },
  }

</script>


<style lang="less" scoped>

  #youtube-info-box {
    margin-bottom: 25px;
    font-size: 12pt;
  }

  .row {
    margin-bottom: 5px;
  }

</style>
