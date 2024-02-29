<template>

  <VContainer class="pt-3 px-2" fluid>
    <VChip
      v-for="(filter, index) in currentFilters"
      :key="`search-filter-${index}`"
      close
      class="ma-1"
      :class="filter.className || ''"
      @input="filter.onclose"
    >
      {{ filter.text }}
    </VChip>
    <ActionLink
      v-if="currentFilters.length"
      class="mx-2"
      :text="$tr('clearAll')"
      data-test="clear"
      @click="clearFilters"
    />
  </VContainer>

</template>

<script>

  import { mapGetters } from 'vuex';
  import { searchMixin } from './mixins';
  import { constantsTranslationMixin } from 'shared/mixins';

  /**
   * Returns the expected format for filters
   * {
   *   text: string to display for filter
   *   onclose: action to do if filter is removed
   * }
   */
  function createFilter(value, text, onclose, className) {
    return value ? { text, onclose, className } : false;
  }

  export default {
    name: 'SearchFilterBar',
    mixins: [constantsTranslationMixin, searchMixin],
    computed: {
      ...mapGetters('channel', ['getChannel']),
      currentFilters() {
        return [
          // View filters
          createFilter(this.resources, this.$tr('topicsHidden'), this.resetResources),
          createFilter(this.assessments, this.$tr('assessments'), this.resetAssessments),
          createFilter(this.coach, this.$tr('coachContent'), this.resetCoach),

          // Kinds
          ...this.kinds.map(kind =>
            createFilter(kind, this.translateConstant(kind), () => this.removeKind(kind))
          ),

          // Languages
          ...this.languages.map(language =>
            createFilter(language, this.translateLanguage(language), () =>
              this.removeLanguage(language)
            )
          ),

          // Licenses
          ...this.licenses.map(license =>
            createFilter(license, this.translateLicense(Number(license)), () =>
              this.removeLicense(license)
            )
          ),

          // Created after
          createFilter(
            this.created_after,
            this.$tr('createdAfter', { date: this.created_after }),
            this.resetCreatedAfter
          ),

          // Channels
          ...this.channel_id__in.map(channelId =>
            createFilter(
              channelId,
              this.getChannelName(channelId),
              () => this.removeChannel(channelId),
              'notranslate'
            )
          ),
        ].filter(Boolean);
      },
    },
    methods: {
      getChannelName(channelId) {
        return this.getChannel(channelId).name;
      },
      removeLanguage(language) {
        this.languages = this.languages.filter(l => l !== language);
      },
      removeLicense(license) {
        this.licenses = this.licenses.filter(l => l !== license);
      },
      removeKind(kind) {
        this.kinds = this.kinds.filter(k => k !== kind);
      },
      resetCoach() {
        this.coach = false;
      },
      resetAssessments() {
        this.assessments = false;
      },
      resetResources() {
        this.resources = false;
      },
      resetCreatedAfter() {
        this.created_after = null;
      },
      removeChannel(channelId) {
        this.channel_id__in = this.channel_id__in.filter(c => c !== channelId);
      },
    },
    $trs: {
      coachContent: 'Resources for coaches',
      assessments: 'Assessments',
      topicsHidden: 'Folders excluded',
      createdAfter: "Added after '{date}'",
      clearAll: 'Clear all',
    },
  };

</script>
