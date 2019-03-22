<template>

  <div id="channel-preview-wrapper" :style="{ backgroundImage: `url('${thumbnailUrl}')` }">
    <div id="channel-details-overlay">
        <div id="channel-details-panel">
          <h2 id="channel-details-top-options">
            <div v-if="isNew">&nbsp;</div>
            <ChannelStar v-else :channelID="channel.id"/>
            <a class="material-icons" @click="closePanel">clear</a>
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
                <LookInsideView v-if="channel" :nodeID="channel.main_tree.id || channel.main_tree" :channel="channel" />
                <div v-if="canEdit" id="delete-section">
                  <ChannelDeleteSection @deletedChannel="editing=false"/>
                </div>
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
import State from 'edit_channel/state';
import { mapState } from 'vuex';
import { setChannelMixin } from './../mixins';

// Components
import ChannelStar from './ChannelStar.vue';
import ChannelEditor from './ChannelEditor.vue';
import ChannelDeleteSection from './ChannelDeleteSection.vue';
import ChannelMetadataSection from './ChannelMetadataSection.vue';
import LookInsideView from './LookInsideView.vue';

export default {
  name: 'ChannelDetailsPanel',
  components: {
    ChannelStar,
    ChannelEditor,
    ChannelMetadataSection,
    ChannelDeleteSection,
    LookInsideView
  },
  mixins: [setChannelMixin],
  data() {
    return {
      editing: false
    };
  },
  watch: {
    channel(newVal, oldVal) {
      if(newVal.id !== oldVal.id) {
        this.editing = false;
      }
    }
  },
  computed: {
    ...mapState('channel_list', {
      channel: 'activeChannel'
    }),
    isNew() {
      return !!!this.channel.id;
    },
    canEdit() {
      return _.contains(this.channel.editors, State.current_user.id);
    },
    thumbnailUrl() {
      return this.channel.thumbnail_url || "/static/img/kolibri_placeholder.png";
    }
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
      if(this.isNew) {
        this.closePanel()
      } else {
        this.editing = false;
      }
    }
  }
};

</script>


<style lang="less">

@import '../../../../less/channel_list.less';

#channel-preview-wrapper {
  overflow: hidden;
  width: @channel-preview-width;
  margin-left: 2px;
  background-color: white;
  background-size:     cover;
  background-repeat:   no-repeat;
  background-position: center center;
  #channel-details-overlay {
    height: inherit;
    background-color: rgba(240,240,240, 0.8);
  }

  #channel-details-panel {
    margin: 0px auto;
    float: none;
    display: table-cell;
    vertical-align: top;
    height: 83vh;
    width: @channel-preview-width - 40px;
  }
  h2 {
    display: grid;
    grid-auto-flow: column;
    justify-content: space-between;
    padding-right: 12px;
    a {
      cursor: pointer;
      color: @gray-800;
      font-weight: bold;
      text-decoration: none;
    }
    .invisible {
      visibility: hidden;
    }
  }

  #channel-details-view-panel {
    height: inherit;
    #channel-details {
      display: block;
      overflow: hidden;
      overflow-y: auto;
      padding: 0px;
      min-height: 350px;
      background-color: rgba(256,256,256,0.8);
      height: inherit;
      padding-top: 15px;
      border: 2px solid @gray-500;
      position: relative;
      margin-bottom: 20px;

      hr {
        border-color: @gray-300;
      }
    }
  }

  .tab-content {
    border-left: none;
    border-right: none;
  }

  #delete-section {
    margin-top: 30px;
    padding: 5px 30px 35px 30px;
  }
}

</style>
