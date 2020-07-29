<template>
  <div
    :id="channelID"
    class="channel-item"
    :data-gtag="channelID"
    :class="{optionHighlighted: optionHighlighted, active: isSelected}"
  >
    <div
      class="channel-container-wrapper"
      :title="$tr('openChannelTitle', {'channelName': channel.name})"
      @click="openChannel"
    >
      <div class="profile">
        <div class="channel-pic">
          <img :alt="channel.name" :src="picture">
        </div>
      </div>
      <div class="channel-information">
        <div class="channel-options-wrapper">
          <div class="channel-metadata">
            <div v-if="language" class="channel-language" :title="language.native_name">
              {{ language.native_name }}
            </div>
            <div>{{ $tr('resourceCount', {'count': channel.count}) }}</div>
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
            <ChannelStar :key="channelID + '_starItem'" :channelID="channelID" />
          </span>
        </div>
        <h4 dir="auto">
          {{ channel.name }}
        </h4>
        <p class="description" dir="auto">
          {{ channel.description }}
        </p>
      </div>
      <div class="updated-time">
        {{ $tr(
          'lastUpdated',
          {
            'updated': $formatDate(
              channel.modified,
              {day:'numeric', month:'short', 'year':'numeric'}
            )
          })
        }} <!-- TODO: change to formatRelative -->
      </div>
    </div>
    <div class="is-selected">
      <span class="material-icons rtl-flip">
        arrow_forward
      </span>
    </div>
  </div>
</template>

<script>

  import { mapGetters, mapState } from 'vuex';
  import { setChannelMixin } from '../mixins';
  import ChannelStar from './ChannelStar.vue';
  import Constants from 'edit_channel/constants/index';
  import CopyToken from 'edit_channel/sharedComponents/CopyToken.vue';

  export default {
    name: 'ChannelItem',
    $trs: {
      openChannelTitle: "{channelName} ('CTRL' or 'CMD' + click to open in new tab)",
      resourceCount: '{count, plural,\n =1 {# Resource}\n other {# Resources}}',
      unpublishedText: 'Unpublished',
      lastUpdated: 'Updated {updated}',
    },
    components: {
      CopyToken,
      ChannelStar,
    },
    mixins: [setChannelMixin],
    props: {
      channelID: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        optionHighlighted: false,
      };
    },
    computed: {
      ...mapState('channel_list', ['activeChannel']),
      ...mapGetters('channel_list', ['getChannel']),
      picture() {
        return (
          (this.channel.thumbnail_encoding && this.channel.thumbnail_encoding.base64) ||
          this.channel.thumbnail_url
        );
      },
      language() {
        return Constants.Languages.find(language => language.id === this.channel.language);
      },
      isSelected() {
        return this.activeChannel && this.channelID === this.activeChannel.id;
      },
      channel() {
        return this.getChannel(this.channelID);
      },
    },
    methods: {
      openChannel(event) {
        if (event && (event.metaKey || event.ctrlKey)) {
          if (this.channel.EDITABLE) {
            window.open(window.Urls.channel(this.channelID), '_blank');
          } else {
            window.open(window.Urls.channel_view_only(this.channelID), '_blank');
          }
        } else if (!this.activeChannel || this.channelID !== this.activeChannel.id) {
          // Only load if it isn't already the active channel
          this.setChannel(this.channelID);
        }
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../../less/channel_list.less';

  .is-selected {
    z-index: 1;
    margin-right: -50px;
    margin-left: -10px;
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
      .is-selected span,
      h4 {
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
      .updated-time {
        position: absolute;
        bottom: 5px;
        left: 5px;
        font-size: 10pt;
        font-style: italic;
        color: @gray-500;
      }
    }
  }

</style>
