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
    <VNavigationDrawer
      v-model="drawer"
      :permanent="$vuetify.breakpoint.smAndUp"
      app
      disable-route-watcher
      :clipped="$vuetify.breakpoint.smAndUp"
      :right="isRTL"
    >
      <VContainer class="filters pa-0">
        <VToolbar v-if="$vuetify.breakpoint.xsOnly" color="transparent" flat dense>
          <VSpacer />
          <VBtn icon flat style="text-align: right;">
            <Icon @click="drawer = false">
              clear
            </Icon>
          </VBtn>
        </VToolbar>
        <VForm class="pa-3">

          <!-- Keyword search -->
          <VTextField
            v-model="keywordInput"
            color="primary"
            :label="$tr('searchLabel')"
            single-line
            outline
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
          <VCheckbox
            v-if="loggedIn"
            v-model="bookmark"
            color="primary"
            :label="$tr('starredLabel')"
          />

          <!-- Includes -->
          <div class="subheading">
            {{ $tr('includesLabel') }}
          </div>
          <VCheckbox v-model="coach" color="primary">
            <template #label>
              {{ $tr('coachLabel') }}
              <HelpTooltip :text="$tr('coachDescription')" bottom class="pl-2" />
            </template>
          </VCheckbox>
          <VCheckbox v-model="assessments" color="primary">
            <template #label>
              {{ $tr('assessmentsLabel') }}
              <HelpTooltip :text="$tr('exerciseDescription')" bottom class="pl-2" />
            </template>
          </VCheckbox>
          <VCheckbox v-model="subtitles" color="primary" :label="$tr('subtitlesLabel')" />
        </VForm>
      </VContainer>
      <VFooter class="py-2 px-4" color="transparent" height="64">
        <div>
          <VImg
            height="24"
            width="74"
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
  import LanguageFilter from './components/LanguageFilter';
  import MultiSelect from './components/MultiSelect';
  import { catalogFilterMixin } from './mixins';
  import { constantsTranslationMixin } from 'shared/mixins';
  import ActionLink from 'shared/views/ActionLink';
  import HelpTooltip from 'shared/views/HelpTooltip';
  import { ContentKindsList } from 'shared/leUtils/ContentKinds';
  import { LicensesList } from 'shared/leUtils/Licenses';

  const excludedKinds = new Set(['topic', 'exercise']);

  const includedKinds = ContentKindsList.filter(kind => !excludedKinds.has(kind));

  export default {
    name: 'CatalogFilters',
    components: {
      LanguageFilter,
      ActionLink,
      HelpTooltip,
      MultiSelect,
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
      coachLabel: 'Coach content',
      assessmentsLabel: 'Assessments',
      subtitlesLabel: 'Subtitles',
      starredLabel: 'Starred',
      licenseLabel: 'Licenses',
      formatLabel: 'Formats',
      includesLabel: 'Includes',
      searchText: 'Search',
      coachDescription: 'Coach content is visible to coaches only in Kolibri',
      exerciseDescription: 'Exercises that have interactive question sets',
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

</style>
