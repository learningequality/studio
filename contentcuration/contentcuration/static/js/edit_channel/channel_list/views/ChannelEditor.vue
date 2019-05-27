<template>
  <div class="channel-editor">
    <div ref="channelthumbnail" class="channel-thumbnail">
&nbsp;
    </div>


    <form class="channel-section" @submit.prevent="submitChannel">
      <!-- Previously used h4, which carries semantic meaning. Size is just style -->
      <label class="language-wrapper input-wrapper">
        <span class="material-icons">
          language
        </span>

        <span class="sr-only">
          {{ $tr('channelLanguagePlaceholder') }}
        </span>

        <select
          id="select-language"
          v-model="language"
          :tabindex="1"
          @change="setLanguage(language)"
        >
          <option
            disabled
            selected
            value=""
          >
            {{ $tr('channelLanguagePlaceholder') }}
          </option>

          <option
            v-for="lang in languages"
            :key="lang.id"
            :value="lang.id"
          >
            {{ lang.native_name }}
          </option>
        </select>
      </label>

      <!-- Previously used h4, which carries semantic meaning. Size is just style -->
      <label class="input-wrapper">
        <span class="input-label required">
          {{ $tr("channelName") }}
        </span>
        <span
          v-if="nameError"
          role="alert"
          class="error-message"
        >
          {{ nameError }}
        </span>

        <input
          ref="firstTab"
          v-model="name"
          :placeholder="$tr('channelNamePlaceholder')"
          :tabindex="0"
          type="text"
          dir="auto"
          maxlength="200"
          class="channel-name"
          required
          @change="setName(name)"
        >
      </label>

      <!-- Previously used h4, which carries semantic meaning. Size is just style -->
      <label class="input-wrapper">
        <span class="input-label">
          {{ $tr('channelDescription') }}
        </span>

        <textarea
          v-model="description"
          :placeholder="$tr('channelDescriptionPlaceholder')"
          class="channel-description"
          dir="auto"
          maxlength="400"
          :tabindex="2"
          rows="4"
          @change="setDescription(description)"
        >
        </textarea>
      </label>

      <div class="buttons">
        <!-- Tabindex necessary? -->
        <button
          type="button"
          class="cancel-edits action-text"
          :tabindex="4"
          @click="cancelEdit"
        >
          {{ $tr('cancel') }}
        </button>
        <button
          class="save-channel action-button"
          type="submit"
          :tabindex="3"
          :class="{'disabled': invalid}"
          :disabled="invalid"
          :title="saveButtonTitle"
        >
          {{ (isNew)? $tr('create') : $tr('save') }}
        </button>
      </div>
    </form>
  </div>
</template>


<script>

  import _ from 'underscore';
  import { mapGetters, mapActions, mapMutations, mapState } from 'vuex';
  import { tabMixin } from '../mixins';
  import { getBackboneChannel } from '../utils';
  import Constants from 'edit_channel/constants/index';
  import { ThumbnailUploadView } from 'edit_channel/image/views';

  const PRESET = _.findWhere(Constants.FormatPresets, { id: 'channel_thumbnail' });

  export default {
    name: 'ChannelEditor',
    $trs: {
      channelName: 'Channel Name',
      channelError: 'Channel name cannot be blank',
      channelNamePlaceholder: 'Enter channel name...',
      channelDescription: 'Channel Description',
      channelDescriptionPlaceholder: 'Enter channel description...',
      channelLanguagePlaceholder: 'Select a language...',
      create: 'Create',
      save: 'Save',
      cancel: 'Cancel',
      invalidChannel: 'Must fill out required fields',
      errorChannelSave: 'Error Saving Channel',
      saving: 'Saving...',
    },
    mixins: [tabMixin],
    data() {
      return {
        saving: false,
        uploading: false,
        // The way vue handles forms assumes local state. Not in vuex state.
        // Vuex state updates make this a bit awkward.
        language: '',
        name: '',
        description: '',
      };
    },
    computed: {
      ...mapState('channel_list', {
        channel: 'channelChanges',
      }),
      ...mapGetters('channel_list', ['activeChannelHasBeenModified']),
      isNew() {
        return !this.channel.id;
      },
      nameError() {
        if (this.activeChannelHasBeenModified && !this.name.length) {
          return this.$tr('channelError');
        }
        return '';
      },
      languages() {
        return Constants.Languages.sort((langA, langB) =>
          langA.native_name.localeCompare(langB.native_name)
        );
      },
      invalid() {
        return Boolean(this.nameError) || this.saving || this.uploading;
      },
      saveButtonTitle() {
        if (this.saving) return this.$tr('saving');
        else if (this.invalid) return this.$tr('invalidChannel');
        return '';
      },
    },
    watch: {
      // Should only be called when clicking "+ Channel" again when the ChannelEditor
      // is open
      channel(newVal) {
        this.language = newVal.language || '';
        this.name = newVal.name || '';
        this.description = newVal.description;
        this.$refs.firstTab.focus();
      },
    },
    beforeMount() {
      // Only need this because we're using getters. Could go straight to $store.state in `data`
      this.language = this.channel.language || '';
      this.name = this.channel.name || '';
      this.description = this.channel.description;
    },
    mounted() {
      this.loadThumbnailUploader();
    },
    methods: {
      ...mapActions('channel_list', ['saveChannel']),
      ...mapMutations('channel_list', {
        setName: 'SET_CHANNEL_NAME',
        setDescription: 'SET_CHANNEL_DESCRIPTION',
        setThumbnail: 'SET_CHANNEL_THUMBNAIL',
        cancelChanges: 'CANCEL_CHANNEL_CHANGES',
        setLanguage: 'SET_CHANNEL_LANGUAGE',
      }),

      /* Handle thumbnail options */
      loadThumbnailUploader: function() {
        new ThumbnailUploadView({
          model: getBackboneChannel(this.channel),
          el: this.$refs.channelthumbnail,
          preset_id: PRESET.id,
          upload_url: window.Urls.thumbnail_upload(),
          acceptedFiles: PRESET.associated_mimetypes.join(','),
          image_url: this.channel.thumbnail_url,
          default_url: '/static/img/kolibri_placeholder.png',
          onsuccess: this.setChannelThumbnail,
          onerror: () => {
            this.uploading = false;
          },
          oncancel: () => {
            this.uploading = false;
          },
          onstart: () => {
            this.uploading = true;
          },
          onremove: this.removeChannelThumbnail,
          allow_edit: true,
          is_channel: true,
        });
      },
      setChannelThumbnail(thumbnail, encoding, formattedName) {
        this.setThumbnail({
          thumbnail: formattedName,
          encoding: encoding,
        });
        this.uploading = false;
      },
      removeChannelThumbnail() {
        this.setThumbnail({
          thumbnail: '',
          encoding: {},
        });
      },
      /* Handle channel edits */
      cancelEdit() {
        this.cancelChanges();
        this.$emit('cancelEdit');
      },
      submitChannel() {
        this.saving = true;
        // saveChannel relies on vuex state to submit
        // Submitting using local `data` would probably be simpler
        this.saveChannel()
          .then(() => {
            this.saving = false;
            this.$emit('submitChanges');
          })
          .catch(error => {
            alert(this.$tr('errorChannelSave'), error.responseText || error);
          });
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../../less/channel_list.less';

  .channel-editor {
    .thumbnail-title-columns;

    padding: 0 20px 40px;
    .channel-thumbnail {
      width: @channel-thumbnail-width;
      height: @channel-thumbnail-height;
      margin-top: 35px;
      /deep/ .image_dropzone {
        width: @channel-thumbnail-width;
        height: @channel-thumbnail-height;
      }
    }

    .channel-section {
      width: 100%;
      padding-left: 20px;

      .input-wrapper {
        display: block;
      }

      .language-wrapper {
        min-height: 25px;
        font-size: 15pt;
        font-weight: bold;
        text-align: right;
        .material-icons {
          margin-right: 5px;
          font-size: 20pt;
          color: @blue-200;
          vertical-align: top;
        }
      }

      .input-label {
        width: 100%;
        font-size: 10pt;
        font-weight: bold;
        color: @gray-800;
        &.required::after {
          color: @red-error-color;
          content: ' * ';
        }
      }

      .error-message {
        font-size: 8pt;
        font-style: italic;
        font-weight: bold;
        color: @red-error-color;
      }

      input[type='text'],
      textarea {
        .input-form;

        width: 100%;
        padding: 2px 0;
        margin-bottom: 20px;
        font-size: @larger-body-text;
        font-weight: normal;
      }

      textarea {
        height: auto;
        resize: none;
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
        a,
        button {
          text-transform: uppercase;
        }
      }
    }
  }

</style>
