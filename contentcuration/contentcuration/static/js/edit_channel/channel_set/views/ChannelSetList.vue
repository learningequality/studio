<template>

  <div>
    <!-- Title/Description metadata fields -->
    <h4>{{ $tr('titleLabel') }} <span class="redText">*</span></h4>
    <p v-show="!isValid" class="redText">{{ $tr('titleRequiredText') }}</p>
    <input
        class="set-input"
        v-model="name"
        type="text"
        dir="auto"
        :placeholder="$tr('titlePlaceholder')"
        maxlength="200"
    />

    <h4>{{ $tr('descriptionLabel') }}</h4>
    <textarea
      class="set-input"
      v-model="description"
      dir="auto"
      maxlength="400"
      rows="4"
      :placeholder="$tr('descriptionPlaceholder')"
    >
    </textarea>
    <hr/>
    <div class="channel-list">
      <div v-if="loadChannels" class="default-item">
        {{ $tr('loading') }}
      </div>
      <div v-else>
        <div class="channelSetMetadata">
          <div class="pull-right" v-if="token">
            <input
              type="text"
              class="copyTokenText text-center"
              v-model="token"
              readonly
              ref="tokenText"
              size='15'>
            </input>
            <i
              class="material-icons copyTokenButton"
              :title="$tr('copyTokenButtonLabel')"
              @click="copyToken">
              {{copyIcon}}
            </i>
          </div>
          <span class="channelCountText">{{ $tr('channelCountText', {'channelCount': channelCount}) }}</span>
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
    <div id="selectChannelsButton">
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

import { mapGetters, mapActions } from 'vuex';
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
    'titleRequiredText': "Title is required"
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
      'changed',
      'channels',
      'loadChannels',
      'channelSet',
      'isValid'
    ]),
    {
      name: {
        get () {
          return this.$store.state.channel_set.name;
        },
        set (value) {
          this.$store.commit('channel_set/SET_NAME', value);
        }
      },
      description: {
        get () {
          return this.$store.state.channel_set.description;
        },
        set (value) {
          this.$store.commit('channel_set/SET_DESCRIPTION', value);
        }
      },
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

.set-input {
  .input-form;
  width: 100%;
  resize: none;
  margin-bottom: 15px;
  font-size: 16px;
}

#selectChannelsButton {
  margin-bottom: 30px;
  i {
    font-size: 15pt;
    vertical-align: text-bottom;
  }
}

.copyTokenButton{
  padding:3px;
  font-size: 16pt;
  vertical-align: sub;
  cursor: pointer;
  &:hover { color:@blue-500; }
}
.copyTokenText{
  display: inline-block;
  padding:2px;
  background-color: @gray-300;
  font-size:11pt;
  border:none;
  font-weight: bold;
  width: 125px;
  color: @gray-700;
}

.channelSetMetadata {
  margin-bottom: 20px;
}

.redText {
  font-weight: bold;
  color: @red-error-color;
}
</style>
