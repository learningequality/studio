<template>

  <div class="channel-editor">
    <div ref="channelthumbnail" class="channel-thumbnail">&nbsp;</div>


    <form @submit.prevent="submitChannel" class="channel-section">

      <!-- Previously used h4, which carries semantic meaning. Size is just style -->
      <label class="language-wrapper input-wrapper">
        <span class="material-icons">language</span>

        <span class="sr-only">
          {{ $tr('channelLanguagePlaceholder') }}
        </span>

        <select
          id="select-language"
          :tabindex="1"
          v-model="language"
          @blur="setLanguage(language)"
        >
          <option
            disabled
            selected
            value="0"
          >
            {{ $tr('channelLanguagePlaceholder') }}
          </option>

          <option
            v-for="language in languages"
            :key="language.id"
            :value="language.id"
          >
            {{ language.native_name }}
          </option>

        </select>
      </label>

      <!-- Previously used h4, which carries semantic meaning. Size is just style -->
      <label class="input-wrapper">
        <span class="input-label required">
          {{ $tr("channelName") }}
        </span>
        <span
          role="alert"
          class="error-message"
          v-if="nameError"
        >
          {{ nameError }}
        </span>

        <input
          :placeholder="$tr('channelNamePlaceholder')"
          :tabindex="0"
          v-model="name"
          @blur="setName(name)"
          type="text"
          dir="auto"
          maxlength="200"
          ref="firstTab"
          class="channel-name"
          required
        />
      </label>

      <!-- Previously used h4, which carries semantic meaning. Size is just style -->
      <label class="input-wrapper">
        <span class="input-label">
          {{ $tr('channelDescription') }}
        </span>

        <textarea
          v-model="description"
          :placeholder="$tr('channelDescriptionPlaceholder')"
          @blur="setDescription(description)"
          class="channel-description"
          dir="auto"
          maxlength="400"
          :tabindex="2"
          rows="4"
        >
        </textarea>
      </label>

      <div class="buttons">
        <!-- Tabindex necessary? -->
        <button
          type="reset"
          @click="cancelEdit"
          class="cancel-edits"
          :tabindex="4"
        >
          {{ $tr('cancel') }}
        </button>
        <button
          class="save-channel"
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
  import { dialog } from 'edit_channel/utils/dialog';
  import Constants from 'edit_channel/constants/index';
  import { ThumbnailUploadView } from 'edit_channel/image/views';
  import { tabMixin } from './../mixins';
  import { getBackboneChannel } from './../utils';

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
    mixins: [tabMixin],
    beforeMount() {
      // Only need this because we're using getters. Could go straight to $store.state in `data`
      this.language = this.channel.language;
      this.name = this.channel.name;
      this.description = this.channel.description;
    },
    computed: {
      ...mapState('channel_list', {
        channel: 'channelChanges',
      }),
      ...mapGetters('channel_list', {
        changed: 'changed',
      }),
      isNew() {
        return !this.channel.id;
      },
      nameError() {
        if (this.changed && !this.name.length) {
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
        let imageUploader = new ThumbnailUploadView({
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
      setChannelThumbnail(thumbnail, encoding, formattedName, path) {
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
          .then(channel => {
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
    padding: 0px 20px 40px;
    .channel-thumbnail {
      margin-top: 35px;
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
      width: 100%;
      padding-left: 20px;

      .input-wrapper {
        display: block;
      }

      .language-wrapper {
        font-size: 15pt;
        text-align: right;
        font-weight: bold;
        min-height: 25px;
        .material-icons {
          color: @blue-200;
          vertical-align: top;
          font-size: 20pt;
          margin-right: 5px;
        }
      }

      .input-label {
        font-size: 10pt;
        color: @gray-800;
        font-weight: bold;
        width: 100%;
        &.required::after {
          color: @red-error-color;
          content: ' * ';
        }
      }

      .error-message {
        font-weight: bold;
        color: @red-error-color;
        font-style: italic;
        font-size: 8pt;
      }

      input[type='text'],
      textarea {
        .input-form;
        margin-bottom: 20px;
        width: 100%;
        font-size: @larger-body-text;
        padding: 2px 0;
        font-weight: normal;
      }

      textarea {
        resize: none;
        height: auto;
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
