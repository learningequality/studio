<template>

  <div>
    <!-- Mobile filter button -->
    <KButton
      v-if="!windowIsLarge"
      class="drawer-btn"
      :text="$tr('FilterText')"
      appearance="raised-button"
      @click.stop="mobileSidePanelIsOpen = true"
    />

    <CatalogFilterBar />

    <!-- Desktop/Large Screen Side Panel (non-modal) -->
    <aside
      v-if="windowIsLarge"
      class="side-panel-container"
      :class="{ 'is-rtl': isRTL }"
    >
      <div class="filters">
        <!-- Keyword search -->
        <KTextbox
          v-model="keywordInput"
          :label="$tr('searchLabel')"
          :clearable="true"
          data-test="keywords"
          autofocus
          @input="setKeywords"
        />

        <!-- Language -->
        <LanguageFilter v-model="languages" />

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
        <KCheckbox
          v-if="loggedIn"
          v-model="bookmark"
          :label="$tr('starredLabel')"
        />

        <!-- Includes -->
        <div class="subheading">
          {{ $tr('includesLabel') }}
        </div>

        <div class="checkbox-with-tooltip">
          <KCheckbox
            v-model="coach"
            :label="$tr('coachLabel')"
          />
          <HelpTooltip
            :text="$tr('coachDescription')"
            maxWidth="250px"
          />
        </div>

        <KCheckbox
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

        <!-- Footer with KImg -->
        <div class="side-panel-footer">
          <KImg
            :src="leLogoSrc"
            altText="Learning Equality logo"
            :aspectRatio="getLogoAspectRatio"
            scaleType="contain"
            :appearanceOverrides="logoStyles"
          />
          <KExternalLink
            href="https://learningequality.org/"
            :text="$tr('copyright', { year: new Date().getFullYear() })"
            openInNewTab
          />
        </div>
      </div>
    </aside>

    <!-- Mobile Side Panel Modal -->
    <SidePanelModal
      v-else-if="mobileSidePanelIsOpen"
      alignment="left"
      @closePanel="mobileSidePanelIsOpen = false"
    >
      <div class="filters mobile-filters">
        <!-- Keyword search -->
        <KTextbox
          v-model="keywordInput"
          :label="$tr('searchLabel')"
          :clearable="true"
          data-test="keywords"
          @input="setKeywords"
        />

        <!-- Language -->
        <LanguageFilter v-model="languages" />

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
        <KCheckbox
          v-if="loggedIn"
          v-model="bookmark"
          :label="$tr('starredLabel')"
        />

        <!-- Includes -->
        <div class="subheading">
          {{ $tr('includesLabel') }}
        </div>

        <div class="checkbox-with-tooltip">
          <KCheckbox
            v-model="coach"
            :label="$tr('coachLabel')"
          />
          <HelpTooltip
            :text="$tr('coachDescription')"
            maxWidth="250px"
          />
        </div>

        <KCheckbox
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

        <!-- Footer with KImg for mobile -->
        <div class="side-panel-footer">
          <KImg
            :src="leLogoSrc"
            altText="Learning Equality logo"
            :aspectRatio="getLogoAspectRatio"
            scaleType="contain"
            :appearanceOverrides="mobileLogoStyles"
          />
          <KExternalLink
            href="https://learningequality.org/"
            :text="$tr('copyright', { year: new Date().getFullYear() })"
            openInNewTab
          />
        </div>
      </div>
    </SidePanelModal>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import debounce from 'lodash/debounce';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { RouteNames } from '../../constants';
  import CatalogFilterBar from './CatalogFilterBar';
  import { catalogFilterMixin } from './mixins';
  import LanguageFilter from './components/LanguageFilter';
  import MultiSelect from 'shared/views/form/MultiSelect';
  import { constantsTranslationMixin } from 'shared/mixins';
  import HelpTooltip from 'shared/views/HelpTooltip';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

  import SidePanelModal from 'shared/views/SidePanelModal';

  const excludedKinds = new Set([ContentKindsNames.TOPIC, ContentKindsNames.H5P]);

  export default {
    name: 'CatalogFilters',
    components: {
      LanguageFilter,
      HelpTooltip,
      MultiSelect,
      CatalogFilterBar,
      SidePanelModal,
    },
    mixins: [constantsTranslationMixin, catalogFilterMixin],
    setup() {
      const { windowIsLarge } = useKResponsiveWindow();
      return {
        windowIsLarge,
      };
    },
    data() {
      return {
        mobileSidePanelIsOpen: false,
        keywordInput: '',
        leLogoSrc: require('shared/images/le-logo.svg'),
      };
    },
    computed: {
      ...mapGetters(['loggedIn']),
      isRTL() {
        return window.isRTL;
      },
      libraryMode() {
        return window.libraryMode;
      },
      faqLink() {
        return { name: RouteNames.CATALOG_FAQ };
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
      // LE logo aspect ratio (90x60 = 3:2)
      getLogoAspectRatio() {
        return '3:2';
      },
      logoStyles() {
        return {
          width: '90px',
          height: '60px',
          margin: '0 auto 8px auto',
        };
      },
      mobileLogoStyles() {
        return {
          width: '80px',
          height: '53px',
          margin: '0 auto 8px auto',
        };
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
      FilterText: 'Filter',
      coachDescription: 'Resources for coaches are only visible to coaches in Kolibri',
      frequentlyAskedQuestionsLink: 'Frequently asked questions',
      copyright: '© {year} Learning Equality',
    },
  };

</script>


<style lang="scss" scoped>

  .side-panel-container {
    width: 300px;
    min-width: 300px;
    height: calc(100vh - 64px); // Adjust based on app bar height
    overflow-y: auto;
    background-color: white;
    border-right: 1px solid #e0e0e0;

    &.is-rtl {
      border-left: 1px solid #e0e0e0;
    }
  }

  .filters {
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;
    padding: 16px;
  }

  .mobile-filters {
    height: auto;
    padding-bottom: 80px; // Extra space for mobile
  }

  .mobile-header {
    padding: 16px;

    h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }
  }

  .subheading {
    margin-top: 20px;
    margin-bottom: 5px;
    font-weight: bold;
    color: gray;
  }

  .checkbox-with-tooltip {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .qa-link {
    margin-top: 24px;
  }

  .drawer-btn {
    margin-top: 10px;
  }

  .side-panel-footer {
    padding-top: 24px;
    margin-top: auto;
    text-align: center;
    border-top: 1px solid #e0e0e0;
  }

  // Remove Vuetify-specific styles
  ::v-deep .v-messages {
    display: none;
  }

</style>
