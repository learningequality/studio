<template>
  <div id="channel-container">
    <div id="channel-area-wrapper">
      <!-- Channel list area -->
      <div id="channel-list-wrapper" :class="{'showPanel': !!activeChannel}">
        <div id="channel-list-area">
          <ChannelInvitationList @setActiveList="setActiveList" />

          <ul id="manage-channel-nav">
            <li
              v-for="listType in lists"
              :class="{active: activeList === listType}"
              @click="activeList = listType"
            >
              <span v-if="listType === 'STARRED'"></span>
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
            />
          </div>
        </div>
      </div>

      <!-- Channel details panel -->
      <ChannelDetailsPanel v-if="activeChannel" />
    </div>
  </div>
</template>


<script>

  import _ from 'underscore';
  import { mapState } from 'vuex';
  import { ListTypes } from '../constants';
  import ChannelList from './ChannelList.vue';
  import ChannelSetList from './ChannelSetList.vue';
  import ChannelInvitationList from './ChannelInvitationList.vue';
  import ChannelDetailsPanel from './ChannelDetailsPanel.vue';

  // TODO: Move this logic to a vue router
  let defaultListType = ListTypes.EDITABLE;
  switch (window.location.hash.substr(1)) {
    case 'starred':
      defaultListType = ListTypes.STARRED;
      break;
    case 'viewonly':
      defaultListType = ListTypes.VIEW_ONLY;
      break;
    case 'public':
      defaultListType = ListTypes.PUBLIC;
      break;
    case 'collection':
      defaultListType = ListTypes.CHANNEL_SETS;
      break;
  }

  export default {
    name: 'ChannelListPage',
    $trs: {
      [ListTypes.EDITABLE]: 'My Channels',
      [ListTypes.VIEW_ONLY]: 'View-Only',
      [ListTypes.PUBLIC]: 'Public',
      [ListTypes.STARRED]: 'Starred',
      [ListTypes.CHANNEL_SETS]: 'Collections',
    },
    components: {
      ChannelList,
      ChannelSetList,
      ChannelInvitationList,
      ChannelDetailsPanel,
    },
    data() {
      return {
        activeList: defaultListType,
      };
    },
    computed: {
      ...mapState('channel_list', ['activeChannel']),
      lists() {
        return _.values(ListTypes);
      },
    },
    methods: {
      setActiveList(listType) {
        this.activeList = listType;
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../../less/channel_list.less';

  #channel-list-wrapper {
    width: 100vw;
    padding: 10px;
    overflow-y: auto;
    transition: width 500ms;
    &.showPanel {
      width: calc(~'100vw' - @channel-preview-width);
    }
  }
  #manage-channel-nav {
    .channel-list-width;
    margin-top: 50px;
    margin-bottom: 10px;

    list-style-type: none;
    li {
      display: inline-block;
      padding: 10px 25px;
      font-size: 14pt;
      color: @body-font-color;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      &:hover {
        border-color: @gray-300;
      }
      &.active {
        font-weight: bold;
        border-color: @blue-500;
      }
      span::before {
        .material-icons;
        font-size: 16pt;
        vertical-align: sub;

        content: 'star';
      }
    }
  }

</style>
