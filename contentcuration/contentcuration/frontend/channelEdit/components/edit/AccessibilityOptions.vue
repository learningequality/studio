<template>

  <div>
    <VLayout row wrap>
      <VFlex
        v-for="(accessibilityItem, index) in showCorrectAccessibilityList"
        :key="index"
        xs12
      >
        <Checkbox
          v-model="accessibility"
          :value="accessibilityItem.value"
          :label="accessibilityItem.label"
          color="primary"
          :data-test="`checkbox-${accessibilityItem.label}`"
        >
          <template #label>
            <span class="text-xs-left">{{ accessibilityItem.label }}</span>
            &nbsp;
            <HelpTooltip
              v-if="accessibilityItem.showTooltip"
              :text="$tr(accessibilityItem.help)"
              bottom
              class="px-2"
              :data-test="`tooltip-${accessibilityItem.label}`"
            />
          </template>
        </Checkbox>
      </VFlex>
    </VLayout>

  </div>

</template>

<script>

  import camelCase from 'lodash/camelCase';
  import { AccessibilityCategories, AccessibilityCategoriesMap } from 'shared/constants';
  import Checkbox from 'shared/views/form/Checkbox';
  import HelpTooltip from 'shared/views/HelpTooltip';
  import { constantsTranslationMixin, metadataTranslationMixin } from 'shared/mixins';

  // A list of accessibility category values for which to hide the tooltip
  const HideTooltips = [AccessibilityCategories.CAPTIONS_SUBTITLES];

  export default {
    name: 'AccessibilityOptions',
    components: {
      Checkbox,
      HelpTooltip,
    },
    mixins: [constantsTranslationMixin, metadataTranslationMixin],
    props: {
      kind: {
        type: String,
        default: '',
      },
      value: {
        type: Array,
        default: () => [],
      },
    },
    computed: {
      accessibility: {
        get() {
          return this.value;
        },
        set(value) {
          return this.$emit('input', value);
        },
      },
      /**
       * List of accessibility options for all content kinds except for audio
       */
      showCorrectAccessibilityList() {
        return AccessibilityCategoriesMap[this.kind].map(key => {
          return {
            label: this.translateMetadataString(camelCase(key)),
            value: AccessibilityCategories[key],
            help: camelCase(key),
            showTooltip: !HideTooltips.includes(AccessibilityCategories[key]),
          };
        });
      },
    },
    $trs: {
      /* eslint-disable kolibri/vue-no-unused-translations */
      /**
       * Strings for the help tooltips
       */
      altText: `Alternative text is provided for visual content (e.g., via the HTML alt attribute).`,
      audioDescription: `Audio descriptions are available (e.g., via an HTML5 track element with kind="descriptions")`,
      highContrast: `Content meets the visual contrast threshold set out in WCAG Success Criteria 1.4.6`,
      signLanguage: `Synchronized sign language intepretation is available for audio and video content.`,
      taggedPdf: `The structures in a PDF have been tagged to improve the navigation of the content.`,
      /* eslint-enable kolibri/vue-no-unused-translations */
    },
  };

</script>
<style lang="scss">

</style>
