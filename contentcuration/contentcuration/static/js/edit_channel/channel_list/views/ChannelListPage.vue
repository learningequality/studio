<template>
  <div id="channel-container">
    <div id="channel-area-wrapper">
      <!-- Channel list area -->
      <div id="channel-list-wrapper" :class="{'showPanel': !!activeChannel}">
        <div id="channel-list-area">
          <ChannelInvitationList @setActiveList="setActiveList" />

          <ul id="manage-channel-nav">
            <router-link
              v-for="listType in lists"
              :key="listType.id"
              :to="getLink(listType)"
              :exact="linkShouldBeExact(listType)"
            >
              <li>
                <span v-if="listType === 'STARRED'"></span>
                {{ $tr(listType) }}
              </li>
            </router-link>
          </ul>
          <div
            v-for="listType in lists"
            v-show="activeList === listType"
            :key="listType.id"
          >
            <ChannelSetList
              v-if="listType === 'CHANNEL_SETS'"
              :key="listType"
            />
            <ChannelList
              v-else
              :key="listType"
              :listType="listType"
              @channel_list_ready="handleChanneListReady(listType)"
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
  import { ListTypes, RouterNames } from '../constants';
  import { setChannelMixin } from '../mixins';
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
      [ListTypes.CHANNEL_SETS]: 'Collections',
    },
    components: {
      ChannelList,
      ChannelSetList,
      ChannelInvitationList,
      ChannelDetailsPanel,
    },
    mixins: [setChannelMixin],
    props: {
      activeList: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapState('channel_list', ['activeChannel']),
      lists() {
        return _.values(ListTypes);
      },
    },
    watch: {
      $route() {
        this.setActiveChannelFromQuery();
      },
    },
    methods: {
      // HACK to get the first link to not be active under certain conditions
      linkShouldBeExact(listType) {
        if (listType === 'EDITABLE') {
          if (this.$route.name !== 'ChannelList') {
            return true;
          } else {
            return !this.$route.query.channel_id;
          }
        }
        return false;
      },
      setActiveList(listType) {
        this.$router.push(this.getLink(listType));
      },
      handleChanneListReady(listType) {
        // Only open the channel tab if the channel list for this page is ready
        if (this.activeList === listType) {
          this.setActiveChannelFromQuery();
        }
      },
      getLink(listType) {
        const name = RouterNames[listType];
        return { name };
      },
      setActiveChannelFromQuery() {
        const { channel_id } = this.$route.query;

        if (channel_id) {
          if (!this.activeChannel || this.activeChannel.id !== channel_id) {
            this.setChannel(channel_id);
          }
          // TODO revert query if there is no actual channel with the channel_id
        } else {
          // Need to infer whether we are creating a new channel or closing a page
          if (this.activeChannel && this.activeChannel.id === undefined) {
            // TODO figure out how to not call this twice when "+ Channel" is clicked
            this.setChannel('');
          } else {
            this.setChannel(null);
          }
        }
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
    padding-bottom: 5px;
    margin-top: 50px;
    margin-bottom: 10px;
    list-style-type: none;
    .router-link-active li {
      font-weight: bold;
      border-color: @blue-500;
    }
    li {
      display: inline-block;
      padding: 10px 25px;
      font-size: 14pt;
      color: @body-font-color;
      // cursor: pointer;
      border-bottom: 3px solid transparent;
      &:hover {
        border-color: @gray-300;
      }
      span::before {
        font-size: 16pt;
        vertical-align: sub;
        content: 'star';
        .material-icons;
      }
    }
    .channel-list-width;
  }

</style>
