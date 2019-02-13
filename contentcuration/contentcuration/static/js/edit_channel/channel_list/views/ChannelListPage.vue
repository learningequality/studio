<template>
  <div id="channel-area-wrapper">
    <div id="channel-list-wrapper" :class="{'showPanel': !!activeChannel}">
      <div id="channel-list-area">
        <!-- Pending list component -->

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
        <ChannelList
          v-for="listType in lists"
          v-show="activeList === listType"
          :key="listType"
          :listType="listType"
          :canAddChannels="listType === 'EDITABLE'"
        />
      </div>
    </div>
  </div>

</template>


<script>

import _ from 'underscore';
import { mapGetters, mapMutations } from 'vuex';
import { ListTypes } from '../constants';
import ChannelList from './ChannelList.vue';

export default {
  name: 'ChannelListPage',
  $trs: {
    [ListTypes.EDITABLE]: 'My Channels',
    [ListTypes.VIEW_ONLY]: 'View-Only',
    [ListTypes.PUBLIC]: 'Public',
    [ListTypes.STARRED]: 'Starred',
    [ListTypes.COLLECTIONS]: 'Collections'
  },
  components: {
    ChannelList
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
  methods: Object.assign(
    mapMutations('channel_list', {
      setActiveList: 'SET_ACTIVE_LIST',
    })
  )
}

</script>


<style lang="less">
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
    list-style-type: none;
    margin-top: 50px;
    margin-bottom: 10px;
    text-align: center;
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
