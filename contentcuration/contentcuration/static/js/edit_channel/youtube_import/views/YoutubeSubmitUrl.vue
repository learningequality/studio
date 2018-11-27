<template>

  <div>
    <p>{{ $tr('urlLabel') }}</p>
    <p class="error" v-show="showError">{{ $tr('errorMessage') }}</p>
    <input
      class="url-input"
      v-model="youtubeUrl"
      type="text"
      dir="auto"
      :placeholder="$tr('urlPrompt')"
    />
    <button
      class="action-button pull-right modal-main-action-button"
      id="youtube_url_submit"
      @click="submitURL"
      :disabled="!enableSubmit"
    >
      <span class="uppercase">
        {{ submitButtonLabel }}
        <i v-if="isExtractingInfo" class="material-icons upload-progress">autorenew</i>
      </span>
    </button>
  </div>
</template>


<script>

import { mapGetters, mapState, mapActions, mapMutations } from 'vuex';
import { PageTypes, ImportStatus } from '../constants';

export default {
  name: 'YoutubeSubmitUrl',
  $trs: {
    continue: 'Continue',
    urlPrompt: 'Enter link to a video, playlist, or channel...',
    urlLabel: 'YouTube URL',
    errorMessage: 'Unable to import from this URL',
    loading: 'Loading...'
  },
  data() {
    return {
      youtubeUrl: '',
    };
  },
  computed: Object.assign(
    mapActions('submitUrl', ['submitUrl']),
    mapGetters('youtube_import', [
      'currentPage',
      'currentStatus'
    ]),
    {
      enableSubmit() {
        // TODO: Add extra validation?
        return this.youtubeUrl.length > 0 && !this.isExtractingInfo;
      },
      showError() {
        return this.currentStatus === ImportStatus.EXTRACT_ERROR;
      },
      isExtractingInfo() {
        return this.currentStatus === ImportStatus.EXTRACTING;
      },
      submitButtonLabel() {
        if (this.isExtractingInfo) {
          return this.$tr('loading');
        }
        return this.$tr('continue');
      },
      isSubmitURL() {
        return this.currentPage === PageTypes.SUBMIT_URL;
      }
    }
  ),
  methods: Object.assign(
    mapActions('youtube_import', [
      'goToConfirm',
      'goToSubmitURL',
      'submitYoutubeURL'
    ]),
    {
      submitURL() {
        this.submitYoutubeURL({url: this.youtubeUrl, onSuccess: this.goToConfirm});
      }
    }
  )
}


</script>

<style lang="less" scoped>

@import "../../../../less/modal-styles.less";
@import "../../../../less/global-variables.less";

#youtube_url_submit {
  margin-right: 20px;
}

.url-input {
  width: 100%;
  padding: 2px 0;
  font-size: @larger-body-text;
  color: @body-font-color;
  background: transparent;
  border: none;
  border-bottom: 1px solid #BDBDBD;
  margin-bottom: 30px;
  &:focus {
    outline: none;
    border-bottom: 2px solid @blue-700;
  }
}

.error {
  color: @red-error-color;
  font-weight: bold;
}

button.action-button[disabled] {
  opacity: 0.75;
}

@keyframes spin {
  from { transform: scale(1) rotate(0deg);}
  to { transform: scale(1) rotate(360deg);}
}

.upload-progress{
  animation: spin 1.5s infinite linear;
  font-size: 13pt;
  vertical-align: sub;
  margin-left: 5px;
}

</style>
