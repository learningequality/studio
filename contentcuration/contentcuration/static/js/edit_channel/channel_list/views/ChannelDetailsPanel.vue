<template>
  <div id="channel-preview-wrapper" :style="{ backgroundImage: `url('${thumbnailUrl}')` }">
    <div id="channel-details-overlay">
      <div id="channel-details-panel">
        <h2 id="channel-details-top-options">
          <div v-if="isNew">
            &nbsp;
          </div>
          <ChannelStar v-else class="channel-star" :channelID="channel.id" />
          <a class="material-icons channel-close" @click="closePanel">
            clear
          </a>
        </h2>

        <div id="channel-details-view-panel">
          <div id="channel-details">
            <ChannelEditor
              v-if="editing || isNew"
              @cancelEdit="handleCancelChanges"
              @submitChanges="handleSaveChannel"
            />
            <ChannelMetadataSection v-else @editChannel="editing = true" />
            <div v-if="!isNew">
              <LookInsideView
                v-if="channel"
                :nodeID="channel.main_tree.id || channel.main_tree"
                :channel="channel"
              />
              <div v-if="canEdit" id="delete-section">
                <ChannelDeleteSection @deletedChannel="editing=false" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script>

  import _ from 'underscore';
  import { mapState } from 'vuex';
  import { setChannelMixin } from '../mixins';

  // Components
  import ChannelStar from './ChannelStar.vue';
  import ChannelEditor from './ChannelEditor.vue';
  import ChannelDeleteSection from './ChannelDeleteSection.vue';
  import ChannelMetadataSection from './ChannelMetadataSection.vue';
  import LookInsideView from './LookInsideView.vue';
  import State from 'edit_channel/state';

  export default {
    name: 'ChannelDetailsPanel',
    components: {
      ChannelStar,
      ChannelEditor,
      ChannelMetadataSection,
      ChannelDeleteSection,
      LookInsideView,
    },
    mixins: [setChannelMixin],
    data() {
      return {
        editing: false,
      };
    },
    computed: {
      ...mapState('channel_list', {
        channel: 'activeChannel',
      }),
      isNew() {
        return !this.channel.id;
      },
      canEdit() {
        return _.contains(this.channel.editors, State.current_user.id);
      },
      thumbnailUrl() {
        return this.channel.thumbnail_url || '/static/img/kolibri_placeholder.png';
      },
    },
    watch: {
      channel(newVal, oldVal) {
        if (newVal.id !== oldVal.id) {
          this.editing = false;
        }
      },
    },
    methods: {
      closePanel() {
        this.editing = false;
        this.setChannel(null);
      },
      handleSaveChannel() {
        this.editing = false;
      },
      handleCancelChanges() {
        if (this.isNew) {
          this.closePanel();
        } else {
          this.editing = false;
        }
      },
    },
  };

</script>


<style lang="less">

  @import '../../../../less/channel_list.less';

  #channel-preview-wrapper {
    width: @channel-preview-width;
    margin-left: 2px;
    overflow: hidden;
    background-color: white;
    background-repeat: no-repeat;
    background-position: center center;
    background-size: cover;
    #channel-details-overlay {
      height: inherit;
      background-color: rgba(240, 240, 240, 0.8);
    }

    #channel-details-panel {
      display: table-cell;
      float: none;
      width: @channel-preview-width - 40px;
      height: 83vh;
      margin: 0 auto;
      vertical-align: top;
    }

    // Hacks to fix icon position
    .channel-star,
    .channel-close {
      margin-top: -12px;
    }

    h2 {
      display: grid;
      grid-auto-flow: column;
      justify-content: space-between;
      padding-right: 12px;
      a {
        font-weight: bold;
        color: @gray-800;
        text-decoration: none;
        cursor: pointer;
      }
      .invisible {
        visibility: hidden;
      }
    }

    #channel-details-view-panel {
      height: inherit;
      #channel-details {
        position: relative;
        display: block;
        height: inherit;
        min-height: 350px;
        padding: 0;
        padding-top: 15px;
        margin-bottom: 20px;
        overflow: hidden;
        overflow-y: auto;
        background-color: rgba(256, 256, 256, 0.8);
        border: 2px solid @gray-500;

        hr {
          border-color: @gray-300;
        }
      }
    }

    .tab-content {
      border-right: 0;
      border-left: 0;
    }

    #delete-section {
      padding: 5px 30px 35px;
      margin-top: 30px;
    }
  }

</style>
