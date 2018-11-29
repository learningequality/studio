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
    [CHANNEL LIST WILL GO HERE]
    <div v-if="channelsAreLoading">
    {{ $tr('loading') }}
    </div>
    <!-- <div v-else-if="channels.length === 0">
      {{ $tr('importCountText', {'topicCount': topicCount, 'resourceCount': resourceCount}) }}
    </div> -->

    <!--       <span v-show="!isImportPreview" id="import_file_metadata" class="pull-right">
        <span id="import_file_count">

        </span>
      </span> -->

    <!-- <ul v-else class="Channels">
      <ChannelItem
        v-for="channel in channels"
        :key="channel.id"
        :channel="channel"
      />
    </ul> -->
  </div>

</template>


<script>

import { mapState, mapGetters, mapActions } from 'vuex';
// import ChannelItem from './ChannelItem.vue';

export default {
  name: 'ChannelSetList',
  $trs: {
    'loading': "Loading...",
    'titleLabel': "Title",
    'titlePlaceholder': "Title your collection",
    'descriptionLabel': "Description",
    'descriptionPlaceholder': "Describe your collection",
    'importCountText': '{topicCount, plural, =1 {# Topic} other {# Topics}}, {resourceCount, plural, =1 {# Resource} other {# Resources}}',
  },
  mounted() {
    // this.loadChannelSetChannels();
  },
  components: {
    // ChannelItem,
  },
  computed: Object.assign(
    mapState('channel_set', [
      'channels',
      'channelsAreLoading',
    ]),
    mapGetters('channel_set', [
      'changed',
      'channels'
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
      topicCount() {
        return this.importedItemCounts.topics;
      }
    }
  ),
  methods: Object.assign(
    // mapActions('channel_set', ['loadChannelSetChannels']),
    {
    }
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

</style>
