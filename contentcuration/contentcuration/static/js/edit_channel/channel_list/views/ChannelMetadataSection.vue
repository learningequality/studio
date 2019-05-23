<template>
  <div class="channel-details-top">
    <img :alt="channel.name" :src="channel.thumbnail_url">
    <div class="channel-section">
      <div class="language-wrapper">
        <div v-if="language">
          <span class="material-icons">
            language
          </span>
          {{ language.native_name }}
        </div>
      </div>
      <h3>{{ channel.name }}</h3>
      <p class="channel-text">
        <span>
          {{
            $tr('created', {
              'date': $formatDate(channel.created, {
                day:'numeric', month:'short', 'year':'numeric'
              })
            }
            )
          }}
        </span>
        <span v-if="channel.published">
          {{ $tr('published', {
            'date': $formatDate(channel.last_published, {
              day:'numeric', month:'short', 'year':'numeric'
            })
          }) }}
        </span>
      </p>
      <hr>
      <ToggleText :text="channel.description" />
      <br>
      <a id="open-channel" :href="channelUrl">
        {{ $tr("openChannel") }}
      </a>
      <a
        v-if="!channel.ricecooker_version && canEdit"
        id="edit-details"
        @click="$emit('editChannel')"
      >
        {{ $tr("editDetails") }}
      </a>

      <ChannelDownloadDropdown />
    </div>
  </div>
</template>


<script>

  import _ from 'underscore';
  import { mapState } from 'vuex';
  import ChannelDownloadDropdown from './ChannelDownloadDropdown.vue';
  import State from 'edit_channel/state';
  import Constants from 'edit_channel/constants/index';

  // Components
  import ToggleText from 'edit_channel/sharedComponents/ToggleText.vue';

  export default {
    name: 'ChannelMetadataSection',
    $trs: {
      created: 'Created {date}',
      published: 'Last Published {date}',
      openChannel: 'Open channel',
      editDetails: 'Edit details',
    },
    components: {
      ToggleText,
      ChannelDownloadDropdown,
    },
    computed: {
      ...mapState('channel_list', {
        channel: 'activeChannel',
      }),
      canEdit() {
        return _.contains(this.channel.editors, State.current_user.id);
      },
      channelUrl() {
        return this.canEdit
          ? window.Urls.channel(this.channel.id)
          : window.Urls.channel_view_only(this.channel.id);
      },
      language() {
        return Constants.Languages.find(language => language.id === this.channel.language);
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../../less/channel_list.less';

  .channel-details-top {
    .thumbnail-title-columns;

    grid-template-columns: 1fr 3fr;
    padding: 0 20px 40px;
    img {
      width: 160px;
      height: 90px;
      margin-top: 35px;
      border: 2px solid @gray-500;
      object-fit: contain;
    }
    .channel-section {
      padding-left: 20px;
      .language-wrapper {
        min-height: 25px;
        font-size: 15pt;
        font-weight: bold;
        text-align: right;
        span {
          margin-right: 5px;
          font-size: 20pt;
          color: @blue-200;
          vertical-align: top;
        }
      }
      h3 {
        margin: 5px 0;
        font-weight: bold;
      }
      .channel-text {
        color: @gray-700;
        span:not(:last-child)::after {
          content: '  •  ';
        }
      }
      /deep/ .toggle-text {
        min-height: 20px;
      }
      #open-channel {
        .action-button;

        padding: 5px 25px;
        margin-right: 15px;
        text-transform: uppercase;
      }
      #edit-details {
        .action-text;

        text-transform: uppercase;
      }
      .channel-download-wrapper {
        display: block;
        margin-top: 30px;
        margin-bottom: -25px;
        font-size: 10pt;
        text-align: right;
      }
    }
  }

</style>
