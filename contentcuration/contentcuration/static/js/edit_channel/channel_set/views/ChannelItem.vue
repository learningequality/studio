<template>

  <div
    class="channelSetChannel row"
    :class="{selectedChannel: isSelected, unpublishedChannel: !channel.published}"
    :title="title"
  >
    <div class="col-xs-2 section">
      <img :src='channel.thumbnail_url'/>
    </div>
    <div class="col-xs-9">
      <h4 class="title">{{channel.name}}</h4>
      <p class="description">{{channel.description}}</p>
    </div>
    <div class="col-xs-1 text-center section">
      <span
        class="removeChannel"
        v-if='isSelected'
        @click="removeChannel"
        :title="$tr('deselectButtonLabel')"
      >&times;</span>
      <a
        class="action-text uppercase addChannel"
        @click="addChannel"
        v-else
      >
        {{ $tr('selectButtonLabel') }}
      </a>
    </div>
  </div>

</template>


<script>

import _ from 'underscore';
import { mapActions, mapGetters } from 'vuex';
import { PageTypes } from '../constants';

export default {
  name: 'ChannelItem',
  $trs: {
    'selectButtonLabel': 'Select',
    'deselectButtonLabel': 'Deselect',
    'unpublishedTitle': '{channelName} must be published to import it into Kolibri',
  },
  props: {
    channel: {
      type: Object,
      required: true,
    }
  },
  data() {
    return {
      isSelected: false,
    }
  },
  mounted() {
    this.checkIfSelected();
  },
  computed: Object.assign(
    mapGetters('channel_set', [
      'currentPage',
      'channels'
    ]),
    {
      title() {
        if (this.currentPage === PageTypes.SELECT_CHANNELS || this.channel.published) {
          return this.channel.name;
        } else {
          return this.$tr("unpublishedTitle", {"channelName": this.channel.name});
        }
      }
    }
  ),
  watch:{
    channels(value) {
      this.checkIfSelected();
    }
  },
  methods: Object.assign(
    mapActions('channel_set', [
      'addChannelToSet',
      'removeChannelFromSet',
    ]),
    {
      checkIfSelected() {
        this.isSelected = !! _.findWhere(this.channels, {'id': this.channel.id});
      },
      removeChannel() {
        this.removeChannelFromSet(this.channel);
      },
      addChannel() {
        this.addChannelToSet(this.channel);
      },
    }
  )
};

</script>


<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  .channelSetChannel {
    width: 100%;
    background-color: @gray-200;
    margin: 0px;
    margin-bottom: 10px;
    padding: 15px;
    cursor: default;
    .section {
      padding: 0px;
      img {
        height: 100px;
        width: 100px;
        object-fit: cover;
      }
    }
    .title {
      .truncate;
      color: black;
      margin: 0;
      margin-bottom: 10px;
      font-weight: bold;
      font-size: 16pt;
    }
    .description {
      margin: 0;
    }
    .addChannel {
      padding: 10px 0px;
    }
    .removeChannel {
      font-size: 25pt;
      cursor: pointer;
    }
  }

</style>
