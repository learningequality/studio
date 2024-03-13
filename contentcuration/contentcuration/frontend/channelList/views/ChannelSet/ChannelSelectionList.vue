<template>

  <VContainer fluid class="pa-0 pb-5">
    <LoadingText v-if="loading" class="pt-4" />
    <template v-else>
      <VTextField
        v-model="search"
        style="max-width: 350px;"
        class="mt-4"
        box
        :label="$tr('searchText')"
      />
      <p v-if="!listChannels.length" class="grey--text mb-0 mt-4">
        {{ $tr('noChannelsFound') }}
      </p>
      <template v-else>
        <VCard
          v-for="channel in listChannels"
          :key="channel.id"
          flat
          class="px-3"
        >
          <Checkbox
            v-model="selectedChannels"
            color="primary"
            :data-test="`checkbox-${channel.id}`"
            :value="channel.id"
            class="channel ma-0"
          >
            <template #label>
              <ChannelItem :channelId="channel.id" />
            </template>
          </Checkbox>
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
                channel.description.toLowerCase().includes(this.search.toLowerCase()))
          ),
          'name'
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
    },
    $trs: {
      searchText: 'Search for a channel',
      noChannelsFound: 'No channels found',
    },
  };

</script>


<style lang="less" scoped>

  .add-channel-button {
    margin: 0;
  }

  .channel {
    /deep/ label,
    /deep/ .v-input__control {
      width: 100% !important;
    }

    &:hover {
      /* stylelint-disable-next-line custom-property-pattern */
      background-color: var(--v-channelHighlightDefault-base);
    }
  }

</style>
