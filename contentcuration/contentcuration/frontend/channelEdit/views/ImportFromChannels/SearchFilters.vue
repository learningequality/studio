<template>

  <VNavigationDrawer permanent floating style="z-index: 0;">

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
    <Checkbox v-model="coach" class="mt-2 mb-4">
      <template v-slot:label>
        <Icon small>
          local_library
        </Icon>
        <span class="mx-2">{{ $tr('coachContentLabel') }}</span>
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
      outline
      multiple
    />

    <!-- License -->
    <MultiSelect
      v-model="licenses"
      :items="licenseOptions"
      :label="$tr('licensesLabel')"
    />

    <!-- Created after -->
    <VMenu
      v-model="showDatePicker"
      :close-on-content-click="false"
      offset-y
      full-width
    >
      <template #activator="{ on }">
        <VTextField
          v-model="created_after"
          :label="$tr('addedAfterDateLabel')"
          :close-on-content-click="false"
          readonly
          outline
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
    </VMenu>

    <p class="grey--text font-weight-bold">
      Channels
    </p>
    <!-- Channel -->
    <VSelect
      v-model="channelType"
      :label="$tr('channelTypeLabel')"
      :items="channelTypeFilterOptions"
      outline
      :menu-props="menuProps"
    />
    <MultiSelect
      v-model="channels"
      :label="$tr('channelSourceLabel')"
      :items="channelOptions"
      item-text="name"
      item-value="id"
      :disabled="loadingChannels"
    />

  </VNavigationDrawer>

</template>


<script>

  import { mapActions } from 'vuex';
  import { searchMixin } from './mixins';
  import { constantsTranslationMixin } from 'shared/mixins';
  import { ContentKindsList } from 'shared/leUtils/ContentKinds';
  import { LicensesList } from 'shared/leUtils/Licenses';
  import { ChannelListTypes } from 'shared/constants';
  import MultiSelect from 'shared/views/form/MultiSelect';
  import Checkbox from 'shared/views/form/Checkbox';
  import LanguageDropdown from 'shared/views/LanguageDropdown';

  const excludedKinds = new Set(['topic', 'exercise']);
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
        channelType: ChannelListTypes.EDITABLE,
        channelOptions: [],
        loadingChannels: false,
      };
    },
    computed: {
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
    watch: {
      channelType() {
        this.loadChannels();
      },
    },
    mounted() {
      this.loadChannels();
    },
    methods: {
      ...mapActions('channel', ['loadChannelList']),
      loadChannels() {
        this.loadingChannels = true;
        this.loadChannelList({ listType: this.channelType }).then(channels => {
          this.channels = [];
          this.channelOptions = channels;
          this.loadingChannels = false;
        });
      },
    },
    $trs: {
      kindLabel: 'Type/format',
      hideTopicsLabel: 'Hide topics',
      assessmentsLabel: 'Show assessments only',
      channelTypeLabel: 'Channel type',
      channelSourceLabel: 'Channel/source',
      licensesLabel: 'License',
      coachContentLabel: 'Show coach content',
      addedAfterDateLabel: 'Added after',
    },
  };

</script>


<style lang="less" scoped>

  .fieldset-reset {
    border-style: none;
  }

</style>
