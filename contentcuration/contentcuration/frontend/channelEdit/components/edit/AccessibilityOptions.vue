<template>

  <div>
    <VLayout v-if="docOrSlides" row wrap>
      <VFlex xs12>
        <Checkbox v-model="altText" color="primary">
          <template #label>
            <span class="text-xs-left"> {{ $tr('altTextForImages') }}</span>
            <HelpTooltip :text="$tr('altTextHelp')" bottom class="px-2" />
          </template>
        </Checkbox>

        <Checkbox v-model="highContrast" color="primary">
          <template #label>
            <span class="text-xs-left"> {{ $tr('highContrast') }}</span>
            <HelpTooltip :text="$tr('highContrastHelp')" bottom class="px-2" />
          </template>
        </Checkbox>

        <Checkbox v-model="taggedPdf" color="primary">
          <template #label>
            <span class="text-xs-left"> {{ $tr('taggedPdf') }}</span>
            <HelpTooltip :text="$tr('taggedPdfHelp')" bottom class="px-2" />
          </template>
        </Checkbox>
      </VFlex>
    </VLayout>

  </div>

</template>

<script>

  import HelpTooltip from '../../../shared/views/HelpTooltip.vue';
  import Checkbox from 'shared/views/form/Checkbox';

  export default {
    name: 'AccessibilityOptions',
    components: {
      HelpTooltip,
      Checkbox,
    },
    props: {
      docOrSlides: {
        type: Boolean,
        default: false,
      },
      video: {
        type: Boolean,
        default: false,
      },
      zip: {
        type: Boolean,
        default: false,
      },
      exercise: {
        type: Boolean,
        default: false,
      },
    },
    $trs: {
      altTextForImages: 'Has alternative text description for images',
      altTextHelp:
        'Alternative text is provided for visual content (e.g., via the HTML alt attribute).',
      highContrast: 'Has high contrast display for low vision',
      taggedPdf: 'Tagged PDF',
      highContrastHelp:
        'Content meets the visual contrast threshold set out in the WCAG Success Criteria 1.4.6',
      taggedPdfHelp:
        'The structures in a PDF have been tagged to improve the navigation of the content.',
    },
  };

</script>
<style lang="scss">

</style>
