<template>

  <div class="filter-panel-content">
    <!-- Close button for mobile modal -->

    <div class="filters-container">
      <!-- Keyword search -->
      <KTextbox
        v-model="keywordInput"
        :label="$tr('searchLabel')"
        :clearable="true"
        data-test="keywords"
        :appearanceOverrides="{ maxWidth: '100%' }"
        @input="setKeywords"
      />

      <!-- Language -->
      <LanguageFilter
        v-model="languages"
        :menu-props="menuProps"
      />

      <!-- License -->
      <MultiSelect
        v-if="!libraryMode"
        v-model="licenses"
        :items="licenseOptions"
        :label="$tr('licenseLabel')"
      />

      <!-- Formats -->
      <MultiSelect
        v-model="kinds"
        :items="kindOptions"
        :label="$tr('formatLabel')"
      />

      <!-- Starred -->
      <Checkbox
        v-if="loggedIn"
        v-model="bookmark"
        :label="$tr('starredLabel')"
      />

      <!-- Includes -->
      <div
        class="subheading"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ $tr('includesLabel') }}
      </div>

      <div class="checkbox-with-tooltip">
        <Checkbox
          v-model="coach"
          aria-describedby="tooltip-coach"
          :label="$tr('coachLabel')"
        />
        <HelpTooltip
          :text="$tr('coachDescription')"
          maxWidth="250px"
          tooltipId="tooltip-coach"
        />
      </div>

      <Checkbox
        v-model="subtitles"
        :label="$tr('subtitlesLabel')"
      />

      <KRouterLink
        class="qa-link"
        :to="faqLink"
        :text="$tr('frequentlyAskedQuestionsLink')"
        appearance="basic-link"
        iconAfter="openNewTab"
        target="_blank"
      />
    </div>

    <!-- Footer with logo -->
    <div class="panel-footer">
      <KImg
        :src="require('shared/images/le-logo.svg')"
        altText="Learning Equality logo"
        :aspectRatio="'3:2'"
        scaleType="contain"
        :appearanceOverrides="{
          width: '90px',
          height: '60px',
          marginBottom: '8px',
          marginRight: '8px',
        }"
      />
      <KExternalLink
        href="https://learningequality.org/"
        :text="$tr('copyright', { year: new Date().getFullYear() })"
        openInNewTab
      />
    </div>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import debounce from 'lodash/debounce';
  import { RouteNames } from '../../constants';
  import { catalogFilterMixin } from './mixins';
  import LanguageFilter from './components/LanguageFilter';
  import MultiSelect from 'shared/views/form/MultiSelect';
  import { constantsTranslationMixin } from 'shared/mixins';
  import Checkbox from 'shared/views/form/Checkbox';
  import HelpTooltip from 'shared/views/HelpTooltip';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

  const excludedKinds = new Set([ContentKindsNames.TOPIC, ContentKindsNames.H5P]);

  export default {
    name: 'CatalogFilterPanelContent',
    components: {
      LanguageFilter,
      Checkbox,
      HelpTooltip,
      MultiSelect,
    },
    mixins: [constantsTranslationMixin, catalogFilterMixin],

    data() {
      return {
        keywordInput: '',
      };
    },
    computed: {
      ...mapGetters(['loggedIn']),
      libraryMode() {
        return window.libraryMode;
      },
      faqLink() {
        return { name: RouteNames.CATALOG_FAQ };
      },
      menuProps() {
        return { offsetY: true, maxHeight: 270 };
      },
      kindOptions() {
        return (window.publicKinds || [])
          .map(kind => {
            if (!excludedKinds.has(kind)) {
              return {
                value: kind,
                text: this.translateConstant(kind),
              };
            }
          })
          .filter(Boolean);
      },
      licenseOptions() {
        return (window.publicLicenses || []).map(id => {
          return {
            value: Number(id),
            text: this.translateLicense(Number(id)),
          };
        });
      },
      setKeywords() {
        return debounce(this.updateKeywords, 500);
      },
    },
    watch: {
      keywords() {
        this.keywordInput = this.keywords;
      },
    },
    beforeMount() {
      this.keywordInput = this.$route.query.keywords;
    },
    methods: {
      updateKeywords() {
        this.keywords = this.keywordInput;
      },
    },
    $trs: {
      searchLabel: 'Keywords',
      coachLabel: 'Resources for coaches',
      subtitlesLabel: 'Captions or subtitles',
      starredLabel: 'Starred',
      licenseLabel: 'Licenses',
      formatLabel: 'Formats',
      includesLabel: 'Display only channels with',
      coachDescription: 'Resources for coaches are only visible to coaches in Kolibri',
      frequentlyAskedQuestionsLink: 'Frequently asked questions',
      copyright: '© {year} Learning Equality',
    },
  };

</script>


<style lang="scss" scoped>

  .filter-panel-content {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 96px);
  }

  .filters-container {
    flex: 1;
    min-height: 0;
    padding: 16px;
    overflow-y: auto;
  }

  .checkbox-with-tooltip {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }

  .subheading {
    margin-top: 20px;
    margin-bottom: 5px;
    font-weight: bold;
  }

  .qa-link {
    display: block;
    margin-top: 24px;
  }

  .panel-footer {
    padding: 16px;
    text-align: start;
  }

</style>
