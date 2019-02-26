<template>
  <div id="channel-container">
    <div id="channel-area-wrapper">
      <!-- Channel list area -->
      <div id="channel-list-wrapper" :class="{'showPanel': !!activeChannel}">
        <div id="channel-list-area">
          <ChannelInvitationList/>

          <ul id="manage-channel-nav">
            <li
              v-for="listType in lists"
              :class="{active: activeList === listType}"
              @click="setActiveList(listType)"
            >
              <span class="material-icons" v-if="listType === 'STARRED'">star</span>
              {{ $tr(listType) }}
            </li>
          </ul>
          <div v-for="listType in lists" v-show="activeList === listType">
             <ChannelSetList
              v-if="listType === 'CHANNEL_SETS'"
              :key="listType"
            />
            <ChannelList
              v-else
              :key="listType"
              :listType="listType"
              :canAddChannels="listType === 'EDITABLE'"
            />
          </div>
        </div>
      </div>

      <!-- Channel details panel -->
      <ChannelDetailsPanel v-if="activeChannel" key="channelDetailsPanel"/>
    </div>

  </div>

</template>


<script>

import _ from 'underscore';
import { mapGetters, mapMutations } from 'vuex';
import { ListTypes } from '../constants';
import ChannelList from './ChannelList.vue';
import ChannelSetList from './ChannelSetList.vue';
import ChannelInvitationList from './ChannelInvitationList.vue';
import ChannelDetailsPanel from './ChannelDetailsPanel.vue';

export default {
  name: 'ChannelListPage',
  $trs: {
    [ListTypes.EDITABLE]: 'My Channels',
    [ListTypes.VIEW_ONLY]: 'View-Only',
    [ListTypes.PUBLIC]: 'Public',
    [ListTypes.STARRED]: 'Starred',
    [ListTypes.CHANNEL_SETS]: 'Collections'
  },
  components: {
    ChannelList,
    ChannelSetList,
    ChannelInvitationList,
    ChannelDetailsPanel
  },
  computed: Object.assign(
    mapGetters('channel_list', [
      'activeList',
      'activeChannel'
    ]),
    {
      lists() {
        return _.values(ListTypes);
      }
    }
  ),
  methods: mapMutations('channel_list', {
    setActiveList: 'SET_ACTIVE_LIST',
  })
}

</script>


<style lang="less" scoped>
  @import '../../../../less/channel_list.less';

  #channel-list-wrapper {
    padding:10px;
    overflow-y:auto;
    width: 100vw;
    transition: width 500ms;
    &.showPanel {
      width: calc(~"100vw" - @channel-preview-width);
    }
  }
  #manage-channel-nav {
    .channel-list-width;
    list-style-type: none;
    margin-top: 50px;
    margin-bottom: 10px;
    li {
      font-size: 14pt;
      color: @body-font-color;
      display: inline-block;
      cursor: pointer;
      padding: 10px 25px;
      border-bottom: 3px solid transparent;
      &:hover {
        border-color: @gray-300;
      }
      &.active {
        font-weight: bold;
        border-color: @blue-500;
      }
      span {
        font-size: 16pt;
        vertical-align: sub;
      }
    }
  }

</style>
