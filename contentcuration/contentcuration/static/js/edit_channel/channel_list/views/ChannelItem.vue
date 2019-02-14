<template>

  <div class="channel-item" :class="{optionHighlighted: optionHighlighted, active: isSelected}" :id="channel.id">
    <div class="is-selected">
      <span v-show="isSelected" class="material-icons rtl-flip">arrow_forward</span>
    </div>
    <div class="channel-container-wrapper"  :title="$tr('openChannelTitle', {'channelName': channel.name})" @click="setActiveChannel(channel)">
      <div class="profile">
        <img class="channel-pic" :alt="channel.name" :src="picture"/>
      </div>
      <div>
        <div class="channel-metadata">
          <div v-if="language" class="channel-language" :title="language.native_name">{{language.native_name}}</div>
          <div>{{$tr('resourceCount', {'count': channel.count})}}</div>
          <CopyToken
            v-if="channel.published"
            :key="channel.primary_token"
            :token="channel.primary_token"
          />
          <div v-else>
            <em>{{ $tr('unpublishedText') }}</em>
          </div>
        </div>
        <h4>
          <span
            :title="starText"
            class="option star-option material-icons"
            :class="{starred: channel.STARRED && !channel.STARRING, spinner: channel.STARRING}"
            @mouseleave="optionHighlighted = false"
            @mouseover="optionHighlighted = true"
            @click.stop="toggleStar"
          >
          </span>
          <p dir="auto" class="truncate channel_name">{{channel.name}}</p>
        </h4>
        <p class="description" dir="auto">{{channel.description}}</p>
        <div class="updated_time">
          {{ $tr('lastUpdated', {'updated': updated}) }}
        </div>
      </div>

    </div>
  </div>

</template>

<script>

import _ from 'underscore';
import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
import Constants from 'edit_channel/constants/index';
import CopyToken from './CopyToken.vue'

export default {
  name: 'ChannelItem',
  $trs: {
    openChannelTitle: "{channelName} ('CTRL' or 'CMD' + click to open in new tab)",
    resourceCount: "{count, plural,\n =1 {# Resource}\n other {# Resources}}",
    copyPrompt: "Copy token to import channel into Kolibri",
    unpublishedText: "Unpublished",
    unstarChannel: "Unstar Channel",
    starChannel: "Star Channel",
    lastUpdated: "Updated {updated}"
  },
  props: {
    channel: {
      type: Object,
      required: true,
    }
  },
  components: {
    CopyToken
  },
  data() {
    return {
      optionHighlighted: false
    }
  },
  computed: Object.assign(
    mapState('channel_list', [
      'channels'
    ]),
    mapGetters('channel_list', [
      'activeChannel'
    ]),
    {
      picture() {
        return (this.channel.thumbnail_encoding && this.channel.thumbnail_encoding.base64) || this.channel.thumbnail_url;
      },
      language() {
        return Constants.Languages.find(language => language.id === this.channel.language);
      },
      isSelected() {
        return this.activeChannel && this.channel.id === this.activeChannel.id;
      },
      starText() {
        return this.channel.STARRED ? this.$tr('unstarChannel') : this.$tr('starChannel');
      },
      updated() {
        return this.channel.modified || new Date();
        return this.$formatRelative(this.channel.modified || new Date());
      }
    }
  ),
  methods: Object.assign(
    mapActions('channel_list', [
      'addStar',
      'removeStar',
    ]),
    mapMutations('channel_list', {
      setActiveChannel: 'SET_ACTIVE_CHANNEL',
    }),
    {
      toggleStar() {
        (this.channel.STARRED)? this.removeStar(this.channel) : this.addStar(this.channel);
      }
    }
  )
};

</script>


<style lang="less" scoped>

@import '../../../../less/channel_list.less';

@channel-container-height: 250px;
@channel-profile-width: 150px;
@channel-thumbnail-size: 130px;

.is-selected {
  float: right;
  padding-top: 9%;
  span {
    font-size: 45pt;
    font-weight: bold;
  }
}

.channel-item {
  &.active {
    .is-selected span {
      color: @topnav-bg-color;
    }
    .channel-container-wrapper {
      border-color: @topnav-bg-color;
    }
  }

  &:hover:not(.optionHighlighted) {
    .is-selected span, .channel_name {
      color: @blue-500;
    }
    .channel-container-wrapper {
      border-color: @blue-500;
    }
  }

  .channel-container-wrapper {
    min-height: @channel-container-height;
    .profile {
      height: @channel-container-height * 0.9;
    }
    .updated_time {
      font-style: italic;
      font-size: 10pt;
      color: @gray-500;
      position: absolute;
      bottom: 5px;
    }
  }
}


</style>
