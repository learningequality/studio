<template>

  <div class="channel-editor">
    <div ref="channelthumbnail" class="channel-thumbnail">&nbsp;</div>
    <div class="channel-section">
      <div class="language-wrapper">
        <span class="material-icons">language</span>
        <select id="select-language" :tabindex="1" @change="setLanguage($event.target.value)">
          <option disabled selected value=0>{{ $tr('channelLanguagePlaceholder') }}</option>
          <option
            v-for="language in languages"
            :value="language.id"
            :selected="language.id === channel.language"
          >{{language.native_name}}</option>
        </select>
      </div>
      <h4>
        {{ $tr("channelName") }}
        <label class="required">
          <span v-show="changed && !channel.name.length">{{ $tr("channelError") }}</span>
        </label>
      </h4>
      <input
        type="text"
        dir="auto"
        :placeholder="$tr('channelNamePlaceholder')"
        maxlength="200"
        :tabindex="0"
        :value="channel.name"
        ref="firstTab"
        @input="setName($event.target.value)"
        required
      />

      <h4>{{ $tr('channelDescription') }}</h4>
      <textarea
        dir="auto"
        :placeholder="$tr('channelDescriptionPlaceholder')"
        maxlength="400"
        :tabindex="2"
        rows="4"
        @input="setDescription($event.target.value)"
      >{{channel.description}}</textarea>

      <div class="buttons">
        <a @click="cancelEdit" :tabindex="4">{{ $tr('cancel') }}</a>
        <button
          :tabindex="3"
          :class="{'disabled': !isValid || saving || uploading}"
          :disabled="!isValid || saving || uploading"
          :title="saveButtonTitle"
          @click="submitChannel"
        >{{ (isNew)? $tr('create') : $tr('save') }}</button>
      </div>
    </div>
  </div>

</template>


<script>

import _ from 'underscore';
import { mapGetters, mapActions, mapMutations } from 'vuex';
import { dialog } from 'edit_channel/utils/dialog';
import Constants from 'edit_channel/constants/index';
import { ThumbnailUploadView } from 'edit_channel/image/views';
import { tabMixin } from './../mixins';

const PRESET = _.findWhere(Constants.FormatPresets, {id: "channel_thumbnail"});

export default {
  name: 'ChannelEditor',
  $trs: {
    channelName: "Channel Name",
    channelError: "Channel name cannot be blank",
    channelNamePlaceholder: "Enter channel name...",
    channelDescription: "Channel Description",
    channelDescriptionPlaceholder: "Enter channel description...",
    channelLanguagePlaceholder: "Select a language...",
    create: "Create",
    save: "Save",
    cancel: "Cancel",
    invalidChannel: "Must fill out required fields",
    errorChannelSave: "Error Saving Channel",
    saving: "Saving..."
  },
  data() {
    return {
      showError: false,
      saving: false,
      uploading: false
    };
  },
  mixins: [tabMixin],
  computed: Object.assign(
    mapGetters('channel_list', {
      channel: 'channelChanges',
      changed: 'changed'
    }),
    {
      isNew() {
        return !!!this.channel.id;
      },
      languages() {
        return _.sortBy(Constants.Languages, 'native_name');
      },
      isValid() {
        return !!this.channel.name.length;
      },
      saveButtonTitle() {
        if(!this.isValid)
          return this.$tr('invalidChannel');
        else if(this.saving)
          return this.$tr('saving');
        return "";
      },
    }
  ),
  mounted() {
    this.loadThumbnailUploader();
  },
  methods: Object.assign(
    mapActions('channel_list', [
      'getChannelModel',
      'saveChannel'
    ]),
    mapMutations('channel_list', {
      setName: 'SET_CHANNEL_NAME',
      setDescription: 'SET_CHANNEL_DESCRIPTION',
      setThumbnail: 'SET_CHANNEL_THUMBNAIL',
      cancelChanges: 'CANCEL_CHANNEL_CHANGES',
      setLanguage: 'SET_CHANNEL_LANGUAGE'
    }),
    {
      /* Handle thumbnail options */
      loadThumbnailUploader: function() {
        this.getChannelModel(this.channel).then((model) => {
          let imageUploader = new ThumbnailUploadView({
            model: model,
            el: this.$refs.channelthumbnail,
            preset_id: PRESET.id,
            upload_url: window.Urls.thumbnail_upload(),
            acceptedFiles: PRESET.associated_mimetypes.join(","),
            image_url: this.channel.thumbnail_url,
            default_url: "/static/img/kolibri_placeholder.png",
            onsuccess: this.setChannelThumbnail,
            onerror: () => { this.uploading = false; },
            oncancel: () => { this.uploading = false; },
            onstart:  () => { this.uploading = true; },
            onremove: this.removeChannelThumbnail,
            allow_edit: true,
            is_channel: true
          });
        });
      },
      setChannelThumbnail(thumbnail, encoding, formattedName, path) {
        this.setThumbnail({
          thumbnail: formattedName,
          encoding: encoding
        });
        this.uploading = false;
      },
      removeChannelThumbnail() {
        this.setThumbnail({
          thumbnail: "",
          encoding: {}
        });
      },


      /* Handle channel edits */
      cancelEdit() {
        this.cancelChanges();
        this.$emit('cancelEdit');
      },
      submitChannel() {
        this.saving = true;
        this.saveChannel().then((channel) => {
          this.saving = false;
          this.$emit('submitChanges');
        }).catch( (error) => {
            alert(this.$tr('errorChannelSave'), error.responseText || error);
        });
      }
    }
  )
};

</script>


<style lang="less" scoped>

@import '../../../../less/channel_list.less';

.channel-editor {
  .thumbnail-title-columns;
  padding: 0px 15px;
  .channel-thumbnail {
    margin-top: 30px;
    width: @channel-thumbnail-size;
    /deep/ .image_dropzone {
      width: @channel-thumbnail-size;
      img {
        width: @channel-thumbnail-size;
        height: @channel-thumbnail-size;
      }
    }
  }

  .channel-section {
    padding-left: 25px;
    .language-wrapper {
      font-size: 15pt;
      text-align: right;
      font-weight: bold;
      min-height: 25px;
      span {
        color: @blue-200;
        vertical-align: top;
        font-size: 20pt;
        margin-right: 5px;
      }
    }
    h4 {
      font-size: 10pt;
      color: @gray-800;
      margin: 2px 0px;
      font-weight: bold;
    }

    .required {
      font-weight: bold;
      color: @red-error-color;
      &::before {
        content: " * ";
      }
      span{
        font-style: italic;
        font-size: 8pt;
      }
    }

    input[type="text"], textarea {
      .input-form;
      margin-bottom: 20px;
      width: 100%;
      font-size: @larger-body-text;
      padding: 2px 0;
    }
    textarea {
      resize:none;
      height:auto;
    }
    select {
      width: 160px;
      font-size: 11pt;
      font-weight: normal;
      vertical-align: text-top;
    }
    .buttons {
      display: grid;
      grid-auto-flow: column;
      justify-content: space-between;
      margin-bottom: 20px;
      margin-left: -15px;
      a, button {
        text-transform: uppercase;
      }
      a {
        .action-text;
      }
      button {
        .action-button;
      }
    }
  }
}

</style>

