<template>

  <div>
    <!-- Title/Description metadata fields -->
    <h4>{{ $tr('titleLabel') }}</h4>
    <input
        class="set-input"
        v-model="name"
        type="text"
        dir="auto"
        :placeholder="$tr('titlePlaceholder')"
        maxlength="200"
    />

    <h4>{{ $tr('descriptionLabel') }}</h4>
    <textarea
      class="set-input"
      v-model="description"
      dir="auto"
      maxlength="400"
      rows="4"
      :placeholder="$tr('descriptionPlaceholder')"
    >
    </textarea>
    <hr/>
    <div class="channel-list">
      <div v-if="loadChannels" class="default-item">
        {{ $tr('loading') }}
      </div>
      <div v-else>
        <p class="channelCountText">{{ $tr('channelCountText', {'channelCount': channelCount}) }}</p>
        <div class="container-fluid">
          <ChannelItem
            v-for="channel in channels"
            :key="channel.id"
            :channel="channel"
          />
        </div>
      </div>
    </div>
    <div id="selectChannelsButton">
      <button
        class="action-button uppercase"
        @click="goToSelectChannels"
      >
        <i class="material-icons">add</i>
        {{ $tr('selectButtonLabel') }}
      </button>
    </div>

  </div>

</template>


<script>

import { mapState, mapGetters, mapActions } from 'vuex';
import ChannelItem from './ChannelItem.vue';

export default {
  name: 'ChannelSetList',
  $trs: {
    'loading': "Loading...",
    'titleLabel': "Title",
    'titlePlaceholder': "Title your collection",
    'descriptionLabel': "Description",
    'descriptionPlaceholder': "Describe your collection",
    'selectButtonLabel': 'Select',
    'channelCountText': '{channelCount, plural, =1 {# channel in your collection} other {# channels in your collection}}',
  },
  mounted() {
    this.loadChannelSetChannels();
  },
  components: {
    ChannelItem,
  },
  computed: Object.assign(
    mapGetters('channel_set', [
      'changed',
      'channels',
      'loadChannels',
    ]),
    {
      name: {
        get () {
          return this.$store.state.channel_set.name;
        },
        set (value) {
          this.$store.commit('channel_set/SET_NAME', value);
        }
      },
      description: {
        get () {
          return this.$store.state.channel_set.description;
        },
        set (value) {
          this.$store.commit('channel_set/SET_DESCRIPTION', value);
        }
      },
      channelCount() {
        return this.channels.length;
      }
    }
  ),
  methods: Object.assign(
    mapActions('channel_set', [
      'goToSelectChannels',
      'loadChannelSetChannels'
    ])
  ),
};

</script>


<style lang="less" scoped>

@import '../../../../less/global-variables.less';

h4 {
  font-size: 13px;
  margin-bottom: 5px;
  font-weight: bold;
}

.set-input {
  .input-form;
  width: 100%;
  resize: none;
  margin-bottom: 15px;
  font-size: 16px;
}

#selectChannelsButton {
  margin-bottom: 30px;
  i {
    font-size: 15pt;
    vertical-align: text-bottom;
  }
}

</style>
