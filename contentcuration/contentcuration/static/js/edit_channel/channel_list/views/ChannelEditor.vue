<template>

  <div class="channel-editor">
    <div ref="channel-thumbnail" class="thumbnail">&nbsp;</div>
    <div class="channel-section">
      <div class="language-wrapper">
        <span class="material-icons">language</span>
        <select id="select-language" tabindex=1>
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
        :value="channel.name"
        @input="setName($event.target.value)"
        required
      />

      <h4>{{ $tr('channelDescription') }}</h4>
      <textarea
        dir="auto"
        :placeholder="$tr('channelDescriptionPlaceholder')"
        maxlength="400"
        rows="4"
        @input="setDescription($event.target.value)"
      >{{channel.description}}</textarea>
    </div>
  </div>

</template>


<script>

import _ from 'underscore';
import State from 'edit_channel/state';
import { mapGetters, mapActions, mapMutations } from 'vuex';
import { dialog } from 'edit_channel/utils/dialog';
import Constants from 'edit_channel/constants/index';

const REQUIRED_FIELDS = ["name"];

export default {
  name: 'ChannelEditor',
  $trs: {
    channelName: "Channel Name",
    channelError: "Channel name cannot be blank",
    channelNamePlaceholder: "Enter channel name...",
    channelDescription: "Channel Description",
    channelDescriptionPlaceholder: "Enter channel description...",
    channelLanguagePlaceholder: "Select a language..."
  },
  data() {
    return {
      showError: false
    };
  },
  computed: Object.assign(
    mapGetters('channel_list', {
      channel: 'channelChanges',
      changed: 'changed'
    }),

    {
      languages() {
        return _.sortBy(Constants.Languages, 'native_name');
      }
    }
  ),
  methods: Object.assign(
    // mapActions('channel_list', [
    //   'saveChannel',
    // ]),
    mapMutations('channel_list', {
      setName: 'SET_CHANNEL_NAME',
      setDescription: 'SET_CHANNEL_DESCRIPTION'
    }),
    // {
    // }
  )
};

</script>


<style lang="less" scoped>

@import '../../../../less/channel_list.less';

  .channel-editor {
    .thumbnail-title-columns;
    padding: 0px 20px;
    .channel-section {
      padding-left: 20px;
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
    }
  }

  .thumbnail {
    width: @channel-thumbnail-size;
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

</style>
