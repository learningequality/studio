<template>

  <div
    class="channel-set-channel"
    :class="{selectedChannel: isSelected, unpublishedChannel: !channel.published}"
    :title="title"
  >
    <div class="row">
      <div class="col-xs-2 section text-center">
        <img :src="channel.thumbnail_url"/>
      </div>
      <div class="col-xs-9">
        <h4 class="title">{{channel.name}}</h4>
        <p class="description">{{channel.description}}</p>
      </div>
      <div class="col-xs-1 text-center section">
        <span
          class="remove-channel"
          v-if="isSelected"
          @click="removeChannel"
          :title="$tr('deselectButtonLabel')"
        >&times;</span>
        <a
          class="action-text uppercase add-channel"
          @click="addChannel"
          :title="$tr('addChannelTitle')"
          v-else
        >
          {{ $tr('selectButtonLabel') }}
        </a>
      </div>
    </div>
    <div class="row">
      <div class="col-xs-12 text-right version">
        {{ $tr("versionText", {'version': channel.version}) }}
      </div>
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
    'addChannelTitle': 'Add channel to collection',
    'versionText': 'Version {version}',
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

  .channel-set-channel {
    width: 100%;
    background-color: @gray-200;
    margin: 0px;
    margin-bottom: 10px;
    padding: 15px 20px 5px 20px;
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
    .add-channel {
      padding: 10px 0px;
    }
    .remove-channel {
      font-size: 25pt;
      cursor: pointer;
    }
    .version {
      color: @gray-700;
      font-size: 10pt;
      font-style: italic;
    }
  }

</style>
