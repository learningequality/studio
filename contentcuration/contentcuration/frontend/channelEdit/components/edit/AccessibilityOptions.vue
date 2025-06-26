<template>

  <div>
    <VLayout
      row
      wrap
    >
      <VFlex
        v-for="(accessibilityItem, index) in showCorrectAccessibilityList"
        :key="index"
        xs12
      >
        <Checkbox
          v-model="accessibility"
          :value="accessibilityItem.value"
          color="primary"
          :data-test="`checkbox-${accessibilityItem.help}`"
        >
          <span :style="{ display: 'inline-flex', alignItems: 'top' }">
            <span>{{ accessibilityItem.label }}</span>
            <HelpTooltip
              v-if="accessibilityItem.showTooltip"
              :text="$tr(accessibilityItem.help)"
              :data-test="`tooltip-${accessibilityItem.help}`"
              :style="{ position: 'relative', top: '-10px' }"
            />
          </span>
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
      altText:
        'Visual elements in the resource have descriptions that can be accessed by screen readers for the benefit of blind learners',
      audioDescription:
        'The resource contains a second narration audio track that provides additional information for the benefit of blind users and those with low vision',
      highContrast:
        'The resource text and visual elements are displayed with high contrast for the benefit of users with low vision',
      signLanguage:
        'Synchronized sign language interpretation is available for audio and video content',
      taggedPdf:
        'The document contains PDF tags that can be accessed by screen readers for the benefit of blind learners',
      /* eslint-enable kolibri/vue-no-unused-translations */
    },
  };

</script>


<style lang="scss"></style>
