<template>

  <VContainer fluid>
    <template v-if="loading">
      <VProgressLinear
        indeterminate
        color="primary"
      />
      <p class="headline mb-0">
        {{ $tr('loading') }}
      </p>
    </template>
    <p v-else-if="listChannels && !listChannels.length" class="headline mb-0">
      {{ $tr('noChannelsFound') }}
    </p>
    <template v-else>
      <VTextField
        v-model="search"
        style="max-width: 350px; margin-top: 24px;"
        outline
        single-line
        :label="$tr('searchText')"
      />
      <VCard
        v-for="channel in listChannels"
        :key="channel.id"
        :raised="channels.includes(channel.id)"
        flat
      >
        <VCheckbox
          v-model="selectedChannels"
          color="primary"
          :value="channel.id"
          class="notranslate"
        >
          <template v-slot:label>
            <VLayout align-center>
              <VFlex xs12 sm4 md3 lg2>
                <VImg :src="channel.thumbnail_url" contain :aspect-ratio="16/9" />
              </VFlex>
              <VFlex xs12 sm8 md9 lg10>
                <VCardText>
                  <h3 class="headline mb-0">
                    {{ channel.name }}
                  </h3>
                  <p class="grey--text subheading">
                    {{ $tr("versionText", {'version': channel.version}) }}
                  </p>
                  {{ channel.description }}
                </VCardText>
              </VFlex>
            </VLayout>
          </template>
        </VCheckbox>
      </VCard>
    </template>
  </VContainer>

</template>


<script>

  import sortBy from 'lodash/sortBy';
  import { mapGetters, mapActions, mapMutations } from 'vuex';
  import { ListTypes } from '../../constants';

  function listTypeValidator(value) {
    // The value must match one of the ListTypes
    return Object.values(ListTypes).includes(value);
  }

  export default {
    name: 'ChannelSelectionList',
    props: {
      channelSetId: {
        type: String,
        required: true,
      },
      listType: {
        type: String,
        validator: listTypeValidator,
      },
    },
    data() {
      return {
        loading: false,
        search: '',
      };
    },
    computed: {
      ...mapGetters('channelList', ['channels']),
      ...mapGetters('channelSet', ['getChannelSet']),
      channelSet() {
        return this.getChannelSet(this.channelSetId) || {};
      },
      listChannels() {
        const sortFields = ['-modified'];
        if (this.listType === ListTypes.PUBLIC) {
          sortFields.shift('-priority');
        }
        return sortBy(
          this.channels.filter(
            channel =>
              channel[this.listType] &&
              channel.published &&
              (channel.name.toLowerCase().includes(this.search.toLowerCase()) ||
                channel.description.toLowerCase().includes(this.search.toLowerCase()))
          ),
          sortFields
        );
      },
      selectedChannels: {
        get() {
          return this.channelSet.channels.filter(c => c);
        },
        set(value) {
          this.updateChannelSet({ id: this.channelSetId, channels: value });
        },
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
      ...mapActions('channelList', ['loadChannelList']),
      ...mapMutations('channelSet', {
        updateChannelSet: 'UPDATE_CHANNELSET',
      }),
    },
    $trs: {
      searchText: 'Search for a channel',
      loading: 'Loading channels...',
      noChannelsFound: 'No channels found',
      versionText: 'Version {version}',
    },
  };

</script>


<style lang="less" scoped>

  .add-channel-button {
    margin: 0;
  }

  .v-card {
    margin-bottom: 48px;
    /deep/ .v-label {
      color: rgba(0, 0, 0, 1) !important;
    }
  }

</style>
