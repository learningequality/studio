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
        >
          <template #label>
            <span class="text-xs-left">{{ accessibilityItem.label }}</span>
            <HelpTooltip :text="$tr(accessibilityItem.help)" bottom class="px-2" />
          </template>
        </Checkbox>
      </VFlex>
    </VLayout>

  </div>

</template>

<script>
  import { AccessibilityCategories, AccessibilityCategoriesMap } from 'shared/constants';
  import Checkbox from 'shared/views/form/Checkbox';
  import HelpTooltip from 'shared/views/HelpTooltip';

  export default {
    name: 'AccessibilityOptions',
    components: {
      Checkbox,
      HelpTooltip,
    },
    props: {
      kind: {
        type: String,
        default: '',
      },
      selected: {
        type: Array,
        default: () => [],
      }
    },
    computed: {
      accessibility: {
        get() {
          return this.selected;
        },
        set(value) {
          return this.$emit('input', value);
        },
      },
      /**
       * List of accessibility options for all content kinds except for audio
       */
      showCorrectAccessibilityList() {
        console.log('kind', this.kind)
        return Object.keys(AccessibilityCategories)
          .filter(key => AccessibilityCategoriesMap[this.kind].includes(key))
          .map(key => {
            return {
              label: key,
              value: AccessibilityCategories[key],
              help: key,
            }
          })
}
    },
    $trs: {
      /* eslint-disable kolibri/vue-no-unused-translations */
      ALT_TEXT: `Alternative text is provided for visual content (e.g., via the HTML alt attribute).`,
      AUDIO_DESCRIPTION: `Audio descriptions are available (e.g., via an HTML5 track element with kind="descriptions")`,
      HIGH_CONTRAST: `Content meets the visual contrast threshold set out in WCAG Success Criteria 1.4.6`,
      SIGN_LANGUAGE: `Synchronized sign language intepretation is available for audio and video content. The value may be extended by adding an ISO 639 sign language code. For example, /sgn-en-us for American Sign Language.`,
      TAGGED_PDF: `The structures in a PDF have been tagged to improve the navigation of the content.`,
      /* eslint-enable kolibri/vue-no-unused-translations */
    }
  };

</script>
<style lang="scss">

</style>
