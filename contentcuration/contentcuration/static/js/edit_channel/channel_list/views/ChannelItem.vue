<template>

  <div class="channel-item" :class="{optionHighlighted: optionHighlighted, active: isSelected}">
    <div class="is-selected">
      <span v-show="isSelected" class="material-icons rtl-flip">arrow_forward</span>
    </div>
    <div class="channel-container-wrapper"  :title="$tr('openChannelTitle', {'channelName': channel.name})" @click="setActiveChannel(channel)">
      <div class="profile">
        <img class="channel-pic" :alt="channel.name" :src="picture"/>
      </div>
      <div>
        <div class="channel-metadata text-left">
          <div v-if="language" class="channel-language" :title="language.native_name">{{language.native_name}}</div>
          <div class="resource-count">{{$tr('resourceCount', {'count': channel.count})}}</div>
          <div v-if="channel.published">
            <input type="text" ref="tokenText" :value="channel.primary_token" :title="$tr('copyPrompt')" size='15' readonly/>
            <span
              class="material-icons copy-id-btn"
              :title="$tr('copyPrompt')"
              @click.stop="copyToken"
              @mouseleave="highlight(false)"
              @mouseover="highlight(true)"
            >{{copyIcon}}</span>
          </div>
          <div v-else>
            <em>{{ $tr('unpublishedText') }}</em>
          </div>
          <div>{{channel.STARRED}}</div>
        </div>
        <h4>
          <span
            :title="starText"
            class="star-option material-icons"
            :class="{starred: channel.STARRED && !channel.STARRING, spinner: channel.STARRING}"
            @mouseleave="highlight(false)"
            @mouseover="highlight(true)"
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

const copyStatusCodes = {
  IDLE: "IDLE",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
}

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
  data() {
    return {
      copyStatus: copyStatusCodes.IDLE,
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
      copyToken() {
        let element = this.$refs.tokenText;
        element.select();
        try {
          document.execCommand("copy");
          this.copyStatus = copyStatusCodes.SUCCESS;
        } catch (e) {
          this.copyStatus = copyStatusCodes.FAILED;
        }
        setTimeout(() => {
          this.copyStatus = copyStatusCodes.IDLE;
        }, 2500);
      },
      highlight(highlight) {
        this.optionHighlighted = highlight;
      },
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

  .channel-container-wrapper {
    background-color: @panel-container-color;
    width: @channel-item-width;
    max-width: @channel-item-max-width;
    min-width: @channel-item-min-width;
    min-height: @channel-container-height;
    box-shadow: @box-shadow;
    margin-bottom: 30px;
    padding: 10px;
    border:4px solid @panel-container-color;
    cursor:pointer;
    position: relative;

    .profile {
      width: @channel-profile-width;
      height: @channel-container-height * 0.9;
      margin: 5px 15px 5px 5px;
      text-align: center;
      float: left;
      img{
          width:@channel-thumbnail-size;
          height:@channel-thumbnail-size;
          object-fit: cover;
      }
    }
    .channel-metadata {
      color: @annotation-gray;
      font-size: 11pt;
      div {
        display: inline-block;
        &:not(:last-child)::after {
          content: '  •  ';
        }

        .channel-language {
          .truncate;
          max-width: 135px;
        }
        .copy-id-btn{
          padding:3px;
          font-size: 16pt;
          vertical-align: sub;
          &:hover { color:@blue-500; }
        }
        input {
          display: inline-block;
          padding: 2px;
          background-color: @gray-300;
          font-size: 11pt;
          border:none;
          font-weight: bold;
          width: 120px;
          text-align: center;
          color: @gray-700;
        }
      }
    }

    h4 {
      font-size: 18pt;
      font-weight: bold;
      color: @body-font-color;
      .star-option, .spinner {
        display:inline-block;
        float: right;
        font-size: 20pt;
        padding:10px;
        color: @gray-700;
        position: relative;
        top: -40px;
        &.star-option::before {
          .material-icons;
          content: "star_border";
        }
        &.star-option:hover{
          color: @blue-500;
        }
        &.starred{
          color: @blue-500;
          &::before {
            content: "star";
          }
          &:hover{
            color: @blue-200;
          }
        }
      }
    }
    .description {
      .wordwrap;
      font-size: 11pt;
      margin-bottom:5px;
    }
    .updated_time {
      font-style: italic;
      font-size: 10pt;
      color: @gray-500;
      position: absolute;
      bottom: 5px;
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
  }


</style>
