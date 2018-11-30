<template>

  <div class="channelSetChannel row">
    <div class="col-xs-2 section">
      <img :src='channel.thumbnail_url'/>
    </div>
    <div class="col-xs-9">
      <h4 class="title" :title="channel.name">{{channel.name}}</h4>
      <p class="description">{{channel.description}}</p>
    </div>
    <div class="col-xs-1 text-center section">
      <span
        class="removeChannel"
        v-if='isSelected'
        @click="removeChannel"
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
import stringHelper from '../../utils/string_helper';
import { mapActions, mapGetters } from 'vuex';
import { PageTypes } from '../constants';

const RequiredBoolean = { type: Boolean, required: true };

export default {
  name: 'ChannelItem',
  $trs: {
    'selectButtonLabel': 'Select'
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
    ])
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
