<template>

  <VNavigationDrawer permanent floating style="z-index: 0;">
    <!-- Channel -->
    <p class="font-weight-bold grey--text mb-1">
      {{ $tr('channelsHeader') }}
    </p>
    <VSelect
      v-model="channelType"
      :label="$tr('channelTypeLabel')"
      :items="channelTypeFilterOptions"
      box
      :menu-props="menuProps"
    />
    <MultiSelect
      v-model="channels"
      :label="$tr('channelSourceLabel')"
      :items="channelOptions"
      item-text="name"
      item-value="id"
      :disabled="loadingChannels"
      notranslate
    />

    <p class="font-weight-bold grey--text mb-1">
      {{ $tr('filtersHeader') }}
    </p>

    <!-- Hide topics -->
    <Checkbox
      v-model="resources"
      :label="$tr('hideTopicsLabel')"
      class="my-2"
    />

    <!-- Assessments only -->
    <Checkbox
      v-model="assessments"
      :label="$tr('assessmentsLabel')"
      class="my-2"
    />

    <!-- Show coach content toggle -->
    <Checkbox v-model="coach" class="mb-4 mt-2">
      <template v-slot:label>
        <Icon small>
          local_library
        </Icon>
        <span class="mx-2 text-xs-left">{{ $tr('coachContentLabel') }}</span>
      </template>
    </Checkbox>

    <!-- Formats -->
    <MultiSelect
      v-model="kinds"
      :items="kindFilterOptions"
      :label="$tr('kindLabel')"
    />


    <!-- Language -->
    <LanguageDropdown
      v-model="languages"
      multiple
    />

    <!-- License -->
    <MultiSelect
      v-model="licenses"
      :items="licenseOptions"
      :label="$tr('licensesLabel')"
    />

    <!-- Created after -->
    <!-- Box styling throws menu alignment off, so nudge accordingly -->
    <Menu
      v-model="showDatePicker"
      :close-on-content-click="false"
      full-width
      :nudge-bottom="4"
      :nudge-left="$isRtl ? 0 : 12"
      :nudge-right="$isRtl ? 12 : 0"
    >
      <template #activator="{ on }">
        <VTextField
          v-model="created_after"
          :label="$tr('addedAfterDateLabel')"
          :close-on-content-click="false"
          readonly
          box
          v-on="on"
        />
      </template>

      <!-- Set min date to the year we first launched Studio -->
      <VDatePicker
        v-model="created_after"
        color="primary"
        no-title
        :locale="locale"
        :max="maxDate"
        min="2017-01-01"
        @input="showDatePicker = false"
      />
    </Menu>
  </VNavigationDrawer>

</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import { searchMixin } from './mixins';
  import { constantsTranslationMixin } from 'shared/mixins';
  import { ContentKindsList } from 'shared/leUtils/ContentKinds';
  import { LicensesList } from 'shared/leUtils/Licenses';
  import { ChannelListTypes } from 'shared/constants';
  import MultiSelect from 'shared/views/form/MultiSelect';
  import Checkbox from 'shared/views/form/Checkbox';
  import LanguageDropdown from 'shared/views/LanguageDropdown';

  const excludedKinds = new Set(['topic', 'exercise', 'h5p']);
  const includedKinds = ContentKindsList.filter(kind => !excludedKinds.has(kind));

  export default {
    name: 'SearchFilters',
    components: {
      MultiSelect,
      Checkbox,
      LanguageDropdown,
    },
    mixins: [constantsTranslationMixin, searchMixin],
    data() {
      return {
        showDatePicker: false,
        channelOptions: [],
        loadingChannels: false,
      };
    },
    computed: {
      ...mapState('currentChannel', ['currentChannelId']),
      channelType: {
        get() {
          return this.$route.query.channel_list || ChannelListTypes.PUBLIC;
        },
        set(channel_list) {
          // Load channel source filter list
          this.loadChannels(channel_list);

          // Update route to filter by channel type
          this.updateQueryParams({ channel_list });
        },
      },
      maxDate() {
        const date = new Date();
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const day = ('0' + date.getDate()).slice(-2);
        return `${date.getFullYear()}-${month}-${day}`;
      },
      locale() {
        return window.languageCode;
      },
      kindFilterOptions() {
        return includedKinds.map(kind => {
          return {
            value: kind,
            text: this.translateConstant(kind),
          };
        });
      },
      channelTypeFilterOptions() {
        return Object.values(ChannelListTypes).map(value => {
          return {
            text: this.translateConstant(value),
            value,
          };
        });
      },
      menuProps() {
        return { offsetY: true, maxHeight: 270 };
      },
      licenseOptions() {
        return LicensesList.map(license => {
          return {
            value: String(license.id),
            text: this.translateLicense(license.id),
          };
        });
      },
    },
    mounted() {
      this.loadChannels(this.channelType);
    },
    methods: {
      ...mapActions('channel', ['loadChannelList']),
      loadChannels(listType) {
        this.loadingChannels = true;
        this.loadChannelList({ listType }).then(channels => {
          if (this.channels.length) {
            this.channels = [];
          }

          this.channelOptions = channels.filter(c => c.id !== this.currentChannelId);
          this.loadingChannels = false;
        });
      },
    },
    $trs: {
      channelsHeader: 'Channels',
      channelTypeLabel: 'Channel type',
      channelSourceLabel: 'Channel/source',
      filtersHeader: 'Filter options',
      kindLabel: 'Format',
      hideTopicsLabel: 'Hide topics',
      assessmentsLabel: 'Show assessments only',
      licensesLabel: 'License',
      coachContentLabel: 'Show resources for coaches',
      addedAfterDateLabel: 'Added after',
    },
  };

</script>


<style lang="less" scoped>

  .fieldset-reset {
    border-style: none;
  }

</style>
