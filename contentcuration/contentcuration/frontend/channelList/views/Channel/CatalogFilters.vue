<template>

  <div>
    <VBtn
      v-if="$vuetify.breakpoint.xsOnly"
      color="primary"
      flat
      @click.stop="drawer = true"
    >
      {{ $tr('searchText') }}
    </VBtn>
    <CatalogFilterBar />
    <VNavigationDrawer
      v-model="drawer"
      :permanent="$vuetify.breakpoint.smAndUp"
      app
      disable-route-watcher
      :clipped="$vuetify.breakpoint.smAndUp"
      :right="isRTL"
    >
      <VContainer class="filters pa-3">
        <VToolbar
          v-if="$vuetify.breakpoint.xsOnly"
          color="transparent"
          flat
          dense
        >
          <VSpacer />
          <VBtn
            icon
            flat
            style="text-align: right"
            @click="drawer = false"
          >
            <Icon icon="clear" />
          </VBtn>
        </VToolbar>

        <!-- Keyword search -->
        <VTextField
          v-model="keywordInput"
          color="primary"
          :label="$tr('searchLabel')"
          box
          clearable
          data-test="keywords"
          autofocus
          @input="setKeywords"
        />

        <!-- Language -->
        <LanguageFilter
          v-model="languages"
          :menu-props="menuProps"
        />

        <!-- License (attach to self to keep in notranslate class) -->
        <MultiSelect
          v-if="!libraryMode"
          v-model="licenses"
          :items="licenseOptions"
          :label="$tr('licenseLabel')"
        />

        <!-- Formats (attach to self to keep in notranslate class) -->
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
        <div class="subheading">
          {{ $tr('includesLabel') }}
        </div>
        <Checkbox v-model="coach">
          <div class="label-container">
            {{ $tr('coachLabel') }}

            <HelpTooltip
              :text="$tr('coachDescription')"
              bottom
              class="px-2"
            />
          </div>
        </Checkbox>
        <Checkbox
          v-model="subtitles"
          :label="$tr('subtitlesLabel')"
        />
        <ActionLink
          :to="faqLink"
          target="_blank"
          class="mt-4"
          :text="$tr('frequentlyAskedQuestionsLink')"
        />
      </VContainer>
      <VFooter
        class="pb-3 pt-2 px-4"
        color="transparent"
        height="100"
      >
        <div>
          <VImg
            height="60"
            width="90"
            class="mb-1 mr-2"
            contain
            :src="require('shared/images/le-logo.svg')"
          />
          <ActionLink
            :text="$tr('copyright', { year: new Date().getFullYear() })"
            href="https://learningequality.org/"
            target="_blank"
          />
        </div>
      </VFooter>
    </VNavigationDrawer>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import debounce from 'lodash/debounce';
  import { RouteNames } from '../../constants';
  import CatalogFilterBar from './CatalogFilterBar';
  import { catalogFilterMixin } from './mixins';
  import LanguageFilter from './components/LanguageFilter';
  import MultiSelect from 'shared/views/form/MultiSelect';
  import { constantsTranslationMixin } from 'shared/mixins';
  import Checkbox from 'shared/views/form/Checkbox';
  import HelpTooltip from 'shared/views/HelpTooltip';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

  const excludedKinds = new Set([ContentKindsNames.TOPIC, ContentKindsNames.H5P]);

  export default {
    name: 'CatalogFilters',
    components: {
      LanguageFilter,
      Checkbox,
      HelpTooltip,
      MultiSelect,
      CatalogFilterBar,
    },
    mixins: [constantsTranslationMixin, catalogFilterMixin],
    data() {
      return {
        drawer: false,
        keywordInput: '',
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
      searchText: 'Search',
      coachDescription: 'Resources for coaches are only visible to coaches in Kolibri',
      frequentlyAskedQuestionsLink: 'Frequently asked questions',
      copyright: '© {year} Learning Equality',
    },
  };

</script>


<style lang="scss" scoped>

  .v-input--checkbox {
    margin: 0;
  }

  ::v-deep .v-messages {
    display: none;
  }

  .subheading {
    margin-top: 20px;
    margin-bottom: 5px;
    font-weight: bold;
    color: gray;
  }

  .filters {
    width: 100%;
    height: calc(100% - 100px);
    overflow: auto;
  }

  ::v-deep .v-label * {
    vertical-align: bottom;
  }

  .label-container {
    display: flex;
    align-items: center;
  }

</style>
