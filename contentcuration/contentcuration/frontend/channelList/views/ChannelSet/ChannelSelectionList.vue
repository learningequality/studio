<template>

  <VContainer
    fluid
    class="pa-0 pb-5"
  >
    <LoadingText
      v-if="loading"
      class="pt-4"
    />
    <template v-else>
      <VTextField
        v-model="search"
        style="max-width: 350px"
        class="mt-4"
        box
        :label="$tr('searchText')"
      />
      <p
        v-if="!listChannels.length"
        class="grey--text mb-0 mt-4"
      >
        {{ $tr('noChannelsFound') }}
      </p>
      <template v-else>
        <VCard
          v-for="channel in listChannels"
          :key="channel.id"
          flat
          hover
          class="list-card-hover px-3"
        >
          <VLayout
            align-center
            row
          >
            <Checkbox
              v-model="selectedChannels"
              color="primary"
              :data-test="`checkbox-${channel.id}`"
              :value="channel.id"
              class="channel ma-0"
            />
            <ChannelItem
              :channelId="channel.id"
              :data-test="`channel-item-${channel.id}`"
              @click="handleSelectChannel"
            />
          </VLayout>
        </VCard>
      </template>
    </template>
  </VContainer>

</template>


<script>

  import sortBy from 'lodash/sortBy';
  import { mapGetters, mapActions } from 'vuex';
  import ChannelItem from './ChannelItem';
  import { ChannelListTypes } from 'shared/constants';
  import Checkbox from 'shared/views/form/Checkbox';
  import LoadingText from 'shared/views/LoadingText';

  function listTypeValidator(value) {
    // The value must match one of the ListTypes
    return Object.values(ChannelListTypes).includes(value);
  }

  export default {
    name: 'ChannelSelectionList',
    components: {
      Checkbox,
      ChannelItem,
      LoadingText,
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

  .add-channel-button {
    margin: 0;
  }

  .channel /deep/ .k-checkbox {
    vertical-align: middle;
  }

  .list-card-hover {
    margin: 16px;
    box-shadow: 0 3px 5px 0 rgba(0, 0, 0, 0.2);
  }

</style>
