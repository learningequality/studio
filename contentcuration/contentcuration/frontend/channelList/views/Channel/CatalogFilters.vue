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
        <VToolbar v-if="$vuetify.breakpoint.xsOnly" color="transparent" flat dense>
          <VSpacer />
          <VBtn icon flat style="text-align: right;">
            <Icon @click="drawer = false">
              clear
            </Icon>
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
          item-value="id"
          :item-text="licenseText"
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
          color="primary"
          :label="$tr('starredLabel')"
        />

        <!-- Includes -->
        <div class="subheading">
          {{ $tr('includesLabel') }}
        </div>
        <Checkbox v-model="coach" color="primary">
          <template #label>
            {{ $tr('coachLabel') }}
            <HelpTooltip :text="$tr('coachDescription')" bottom class="px-2" />
          </template>
        </Checkbox>
        <Checkbox v-model="assessments" color="primary" :label="$tr('assessmentsLabel')" />
        <Checkbox v-model="subtitles" color="primary" :label="$tr('subtitlesLabel')" />
        <ActionLink
          :to="faqLink"
          target="_blank"
          class="mt-4"
          :text="$tr('frequentlyAskedQuestionsLink')"
        />
      </VContainer>
      <VFooter class="pt-2 pb-3 px-4" color="transparent" height="64">
        <div>
          <VImg
            height="24"
            width="78"
            class="mr-2 mb-1"
            contain
            :src="require('shared/images/le-logo.svg')"
          />
          <ActionLink
            :text="$tr('copyright', {year: new Date().getFullYear()})"
            href="https://learningequality.org/"
            target="_blank"
          />
        </div>
      </VFooter>
    </VNavigationDrawer>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import debounce from 'lodash/debounce';
  import { RouterNames } from '../../constants';
  import LanguageFilter from './components/LanguageFilter';
  import { catalogFilterMixin } from './mixins';
  import CatalogFilterBar from './CatalogFilterBar';
  import MultiSelect from 'shared/views/form/MultiSelect';
  import { constantsTranslationMixin } from 'shared/mixins';
  import Checkbox from 'shared/views/form/Checkbox';
  import HelpTooltip from 'shared/views/HelpTooltip';
  import { ContentKindsList } from 'shared/leUtils/ContentKinds';
  import { LicensesList } from 'shared/leUtils/Licenses';

  const excludedKinds = new Set(['topic', 'exercise']);

  const includedKinds = ContentKindsList.filter(kind => !excludedKinds.has(kind));

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
      ...mapState({
        loggedIn: state => state.session.loggedIn,
      }),
      isRTL() {
        return window.isRTL;
      },
      libraryMode() {
        return window.libraryMode;
      },
      faqLink() {
        return { name: RouterNames.CATALOG_FAQ };
      },
      menuProps() {
        return { offsetY: true, maxHeight: 270 };
      },
      kindOptions() {
        return includedKinds.map(kind => {
          return {
            value: kind,
            text: this.translateConstant(kind),
          };
        });
      },
      licenseOptions() {
        return LicensesList;
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
      licenseText(license) {
        return this.translateLicense(license.id);
      },
      updateKeywords() {
        this.keywords = this.keywordInput;
      },
    },
    $trs: {
      searchLabel: 'Keywords',
      coachLabel: 'Resources for coaches',
      assessmentsLabel: 'Assessments',
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


<style lang="less" scoped>

  .v-input--checkbox {
    margin: 0;
  }
  /deep/ .v-messages {
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
    height: calc(100% - 64px);
    overflow: auto;
  }

  /deep/ .v-label * {
    vertical-align: bottom;
  }

</style>
