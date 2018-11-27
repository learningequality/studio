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
        <div class="col-xs-8"><b>{{totalSize}}</b></div>
      </div>
      <div class="row">
        <div class="col-xs-4">{{ $tr('available_storage') }}</div>
        <div class="col-xs-8">{{availableStorage}}</div>
      </div>
      <div class="row">
        <div class="col-xs-4">{{ $tr('license') }}</div>
        <div class="col-xs-8">
          <ul class="list-unstyled">
            <li v-for="license in license_names">
              {{license}}
            </li>
          </ul>
        </div>
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
        <i v-if="isDownloading" class="material-icons yt-upload-progress">autorenew</i>
      </span>
    </button>
    <div class="error pull-right" v-show="showError">{{ $tr('errorMessage') }}</div>
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
      mapGetters('youtube_import', [
        'youtubeData',
        'downloadSize',
        'resolutions',
        'currentStatus',
        'parentID',
      ]),
      {
        enableSubmit() {
          return !this.isDownloading && this.resolutions.length;
        },
        isDownloading() {
          return this.currentStatus === ImportStatus.DOWNLOADING;
        },
        submitButtonLabel() {
          if (this.isDownloading) {
            return this.$tr('downloading');
          }
          return this.$tr('import');
        },
        totalSize() {
          return `${stringHelper.format_size(this.downloadSize)}`;
        },
        availableStorage() {
          return `${stringHelper.format_size(this.youtubeData.available_storage)}`;
        },
        license_names() {
          return _.map(this.youtubeData.licenses, function(license) {
            return `${stringHelper.translate(license)}`
          });
        },
        showError() {
          return this.currentStatus === ImportStatus.DOWNLOAD_ERROR;
        }
      }
    ),
    methods: Object.assign(
      mapActions('youtube_import', [
        'downloadYoutubeVideos'
      ]),
      {
        startDownload() {
          this.downloadYoutubeVideos({
            url: this.youtubeUrl,
            resolutions: this.resolutions,
            parent_id: this.parentID,
          });
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
      import: "Import",
      downloading: "Downloading",
      errorMessage: 'Error importing the video(s)',
    },
  }

</script>


<style lang="less" scoped>
  @import "../../../../less/global-variables.less";
  #youtube-info-box {
    margin-bottom: 25px;
    font-size: 12pt;
  }

  .row {
    margin-bottom: 5px;
  }

  .error {
    margin-right: 5px;
  }
</style>
