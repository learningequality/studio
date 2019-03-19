<template>
  <div class="channel-item" :class="{optionHighlighted: optionHighlighted, active: isSelected}" :id="channel.id">
    <div class="channel-container-wrapper"  :title="$tr('openChannelTitle', {'channelName': channel.name})" @click="openChannel">
      <div class="profile">
        <img class="channel-pic" :alt="channel.name" :src="picture"/>
      </div>
      <div class="channel-information">
        <div class="channel-options-wrapper">
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
          <span @mouseleave="optionHighlighted = false" @mouseover="optionHighlighted = true">
            <ChannelStar :key="channel.id + '_starItem'" :channel="channel"/>
          </span>
        </div>
        <h4 dir="auto">{{channel.name}}</h4>
        <p class="description" dir="auto">{{channel.description}}</p>
      </div>
      <div class="updated_time">
        <!-- TODO: change to formatRelative -->
        {{ $tr('lastUpdated', {'updated': $formatDate(channel.modified, {day:'numeric', month:'short', 'year':'numeric'})}) }}
      </div>
    </div>
    <div class="is-selected">
      <span class="material-icons rtl-flip">arrow_forward</span>
    </div>
  </div>

</template>

<script>

import { mapState } from 'vuex';
import { setChannelMixin } from './../mixins';
import Constants from 'edit_channel/constants/index';
import CopyToken from 'edit_channel/sharedComponents/CopyToken.vue';
import ChannelStar from './ChannelStar.vue';

export default {
  name: 'ChannelItem',
  $trs: {
    openChannelTitle: "{channelName} ('CTRL' or 'CMD' + click to open in new tab)",
    resourceCount: "{count, plural,\n =1 {# Resource}\n other {# Resources}}",
    unpublishedText: "Unpublished",
    lastUpdated: "Updated {updated}"
  },
  props: {
    channel: {
      type: Object,
      required: true,
    }
  },
  components: {
    CopyToken,
    ChannelStar
  },
  mixins: [setChannelMixin],
  data() {
    return {
      optionHighlighted: false
    }
  },
  computed: {
    ...mapState('channel_list', ['activeChannel']),
    picture() {
      return (this.channel.thumbnail_encoding && this.channel.thumbnail_encoding.base64) || this.channel.thumbnail_url;
    },
    language() {
      return Constants.Languages.find(language => language.id === this.channel.language);
    },
    isSelected() {
      return this.activeChannel && this.channel.id === this.activeChannel.id;
    }
  },
  methods: {
    openChannel(event) {
      if(event && (event.metaKey || event.ctrlKey)) {
        if(this.channel.EDITABLE) {
          window.open(window.Urls.channel(this.channel.id), "_blank");
        } else {
          window.open(window.Urls.channel_view_only(this.channel.id), "_blank");
        }
      } else if (!this.activeChannel || this.channel.id !== this.activeChannel.id) {
        this.setChannel(this.channel);
      }
    }
  }
};

</script>


<style lang="less" scoped>

@import '../../../../less/channel_list.less';

.is-selected {
  margin-left: -10px;
  margin-right: -50px;
  z-index: 1;
  span {
    margin-top: @channel-container-height / 2 - 50;
    font-size: 45pt;
    font-weight: bold;
    visibility: hidden;
  }
}

.channel-item {
  display: grid;
  grid-auto-flow: column;
  &.active {
    .is-selected span {
      color: @topnav-bg-color;
      visibility: visible;
    }
    .channel-container-wrapper {
      border-color: @topnav-bg-color;
    }
  }

  &:hover:not(.optionHighlighted) {
    .is-selected span, h4 {
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
    .channel-information {
      padding-left: 10px;
    }
    .updated_time {
      font-style: italic;
      font-size: 10pt;
      color: @gray-500;
      position: absolute;
      bottom: 5px;
      left: 5px;
    }
  }
}


</style>
