<template>

  <div>
    <!-- Title/Description metadata fields -->
    <h4>{{ $tr('titleLabel') }} <span class="red-text">*</span></h4>
    <p v-show="!isValid" class="red-text">{{ $tr('titleRequiredText') }}</p>
    <input
        class="set-input"
        :value="name"
        type="text"
        dir="auto"
        :placeholder="$tr('titlePlaceholder')"
        maxlength="200"
        @input="handleNameChange"
    />
    <h4>
      <i class="pull-right description-counter" :class="{redText: !charsLeft}">{{ $tr('charCount', {'charCount': charsLeft}) }}</i>
      {{ $tr('descriptionLabel') }}
    </h4>
    <textarea
      class="set-input"
      :value="description"
      dir="auto"
      :maxlength="charLimit"
      rows="4"
      :placeholder="$tr('descriptionPlaceholder')"
      @input="handleDescriptionChange"
    >
    </textarea>
    <hr/>

    <!-- Channel list section -->
    <div class="channelset-list">
      <div v-if="loadChannels" class="default-item">
        {{ $tr('loading') }}
      </div>
      <div v-else>
        <div class="channel-set-metadata">
          <div class="pull-right" v-if="token">
            <input
              type="text"
              class="copy-token-text text-center"
              v-model="token"
              readonly
              ref="tokenText"
              size="15"
            />
            <i
              class="material-icons copy-token-button"
              :title="$tr('copyTokenButtonLabel')"
              @click="copyToken">
              {{copyIcon}}
            </i>
          </div>
          <span class="channel-count-text">{{ $tr('channelCountText', {'channelCount': channelCount}) }}</span>
        </div>
        <div class="container-fluid">
          <ChannelItem
            v-for="channel in channels"
            :key="channel.id"
            :channel="channel"
          />
        </div>
      </div>
    </div>
    <div id="select-channels-button">
      <button
        class="action-button uppercase"
        @click="goToSelectChannels"
      >
        <i class="material-icons">add</i>
        {{ $tr('selectButtonLabel') }}
      </button>
    </div>

  </div>

</template>


<script>

import { mapGetters, mapActions, mapMutations } from 'vuex';
import ChannelItem from './ChannelItem.vue';

const copyStatusCodes = {
  IDLE: "IDLE",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
}

export default {
  name: 'ChannelSetList',
  $trs: {
    'loading': "Loading...",
    'titleLabel': "Title",
    'titlePlaceholder': "Title your collection",
    'descriptionLabel': "Description",
    'descriptionPlaceholder': "Describe your collection",
    'selectButtonLabel': 'Select',
    'channelCountText': '{channelCount, plural, =1 {# channel in your collection} other {# channels in your collection}}',
    'copyTokenButtonLabel': "Copy Token",
    'titleRequiredText': "Title is required",
    "charCount": "{charCount, plural, =1 {# character left} other {# characters left}}"
  },
  mounted() {
    this.loadChannelSetChannels();
  },
  components: {
    ChannelItem,
  },
  data() {
    return {
      copyStatus: copyStatusCodes.IDLE,
    }
  },
  computed: Object.assign(
    mapGetters('channel_set', [
      'channels',
      'channelSet',
      'isValid',
      'loadChannels',
      'name',
      'description'
    ]),
    {
      copyIcon() {
        switch(this.copyStatus) {
          case copyStatusCodes.SUCCESS:
            return "check"
          case copyStatusCodes.FAILED:
            return "clear"
          default:
            return "content_paste"
        }
      },
      charsLeft() {
        return this.charLimit - this.description.length;
      },
      charLimit() {
        return 400;
      },
      token() {
        let token = this.channelSet.get('secret_token');
        return token && token.display_token;
      },
      channelCount() {
        return this.channels.length;
      }
    }
  ),
  methods: Object.assign(
    mapActions('channel_set', [
      'goToSelectChannels',
      'loadChannelSetChannels'
    ]),
    mapMutations('channel_set', {
      setName: 'SET_NAME',
      setDescription: 'SET_DESCRIPTION',
    }),
    {
      copyToken() {
        let element = this.$refs.tokenText;
        element.select();
        var self = this;
        try {
          document.execCommand("copy");
          this.copyStatus = copyStatusCodes.SUCCESS;
        } catch(e) {
          this.copyStatus = copyStatusCodes.FAILED;
        }
        setTimeout(() => {
          this.copyStatus = copyStatusCodes.IDLE;
        }, 2500);
      },
      handleNameChange(element) {
        this.setName(element.target.value);
      },
      handleDescriptionChange(element) {
        this.setDescription(element.target.value);
      }
    }
  ),
};

</script>


<style lang="less" scoped>

@import '../../../../less/global-variables.less';

h4 {
  font-size: 13px;
  margin-bottom: 5px;
  font-weight: bold;
}

.unpublishedHelperText {
  color: @gray-500;
  font-style: italic;
}

.helperIcon {
  color: @blue-500;
  cursor: pointer;
  font-size: 11pt;
  vertical-align: sub;
}

.set-input {
  .input-form;
  width: 100%;
  resize: none;
  margin-bottom: 15px;
  font-size: 16px;
}

#select-channels-button {
  margin-bottom: 30px;
  i {
    font-size: 15pt;
    vertical-align: text-bottom;
  }
}

.copy-token-button{
  padding:3px;
  font-size: 16pt;
  vertical-align: sub;
  cursor: pointer;
  &:hover { color:@blue-500; }
}
.copy-token-text{
  display: inline-block;
  padding:2px;
  background-color: @gray-300;
  font-size:11pt;
  border:none;
  font-weight: bold;
  width: 125px;
  color: @gray-700;
}

.channel-set-metadata {
  margin-bottom: 20px;
}

.description-counter {
  color: @gray-700;
}

.red-text {
  font-weight: bold;
  color: @red-error-color;
}

/deep/ .unpublishedChannel {
  border: 2px dotted @gray-500;
  opacity: 0.7;
}

</style>
