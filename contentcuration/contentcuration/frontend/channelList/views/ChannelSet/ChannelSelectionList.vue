<template>

  <div class="selection-list">
    <StudioLargeLoader
      v-if="show(loaderKey, loading, 400)"
      class="selection-loader"
    />
    <template v-else>
      <KTextbox
        v-model="search"
        class="search-input"
        :label="$tr('searchText')"
      />
      <p
        v-if="!listChannels.length"
        class="no-channels-found"
      >
        {{ $tr('noChannelsFound') }}
      </p>
      <template v-else>
        <VCard
          v-for="channel in listChannels"
          :key="channel.id"
          flat
          hover
          class="list-card-hover selection-card"
        >
          <div class="selection-row">
            <KCheckbox
              :checked="selectedChannels.includes(channel.id)"
              :data-testid="`checkbox-${channel.id}`"
              class="channel-checkbox"
              @change="handleSelectChannel(channel.id)"
            />
            <ChannelItem
              :channelId="channel.id"
              :data-testid="`channel-item-${channel.id}`"
              @click="handleSelectChannel"
            />
          </div>
        </VCard>
      </template>
    </template>
  </div>

</template>


<script>

  import sortBy from 'lodash/sortBy';
  import useKShow from 'kolibri-design-system/lib/composables/useKShow';
  import { mapGetters, mapActions } from 'vuex';
  import ChannelItem from './ChannelItem';
  import { ChannelListTypes } from 'shared/constants';
  import StudioLargeLoader from 'shared/views/StudioLargeLoader';

  function listTypeValidator(value) {
    // The value must match one of the ListTypes
    return Object.values(ChannelListTypes).includes(value);
  }

  export default {
    name: 'ChannelSelectionList',
    components: {
      ChannelItem,
      StudioLargeLoader,
    },
    setup() {
      const { show } = useKShow();
      return { show };
    },
    props: {
      value: {
        type: Array,
        default() {
          return [];
        },
      },
      listType: {
        type: String,
        validator: listTypeValidator,
        default: Object.values(ChannelListTypes)[0],
      },
    },
    data() {
      return {
        loading: false,
        search: '',
      };
    },
    computed: {
      ...mapGetters('channel', ['channels']),
      selectedChannels: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      listChannels() {
        return sortBy(
          this.channels.filter(
            channel =>
              channel[this.listType] &&
              channel.published &&
              (channel.name.toLowerCase().includes(this.search.toLowerCase()) ||
                channel.description.toLowerCase().includes(this.search.toLowerCase())),
          ),
          'name',
        );
      },
      loaderKey() {
        return `channel-selection-list-${this.listType}`;
      },
    },
    mounted() {
      this.loading = true;
      this.loadChannelList({
        listType: this.listType,
        published: true,
      }).then(() => {
        this.loading = false;
      });
    },
    methods: {
      ...mapActions('channel', ['loadChannelList']),
      handleSelectChannel(channelId) {
        this.selectedChannels = this.selectedChannels.includes(channelId)
          ? this.selectedChannels.filter(id => id !== channelId)
          : [...this.selectedChannels, channelId];
      },
    },
    $trs: {
      searchText: 'Search for a channel',
      noChannelsFound: 'No channels found',
    },
  };

</script>


<style lang="scss" scoped>

  .selection-list {
    padding-bottom: 20px;
  }

  .selection-loader {
    padding-top: 16px;
  }

  .search-input {
    max-width: 350px;
    margin-top: 16px;
  }

  .no-channels-found {
    margin-top: 16px;
    margin-bottom: 0;
    color: v-bind('$themeTokens.annotation');
  }

  .selection-card {
    padding-inline: 12px;
  }

  .selection-row {
    display: flex;
    align-items: center;
  }

  .channel-checkbox {
    padding-inline-end: 4px;
    margin: 0;
  }

  .list-card-hover {
    margin: 16px;
    box-shadow: 0 3px 5px 0 rgba(0, 0, 0, 0.2);
  }

</style>
