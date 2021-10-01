<template>

  <div>
    <VLayout v-if="docOrSlides" row wrap>
      <VFlex xs12>
        <Checkbox v-model="altText" color="primary">
          <template #label>
            <span class="text-xs-left"> {{ $tr('altTextForImages') }}</span>
            <HelpTooltip :text="$tr('altTextInfo')" bottom class="px-2" />
          </template>
        </Checkbox>

        <Checkbox v-model="highContrast" color="primary">
          <template #label>
            <span class="text-xs-left"> {{ $tr('highContrast') }}</span>
            <HelpTooltip :text="$tr('highContrastInfo')" bottom class="px-2" />
          </template>
        </Checkbox>

        <Checkbox v-model="taggedPdf" color="primary">
          <template #label>
            <span class="text-xs-left"> {{ $tr('taggedPdf') }}</span>
            <HelpTooltip :text="$tr('taggedPdfInfo')" bottom class="px-2" />
          </template>
        </Checkbox>
      </VFlex>
    </VLayout>

    <VLayout v-if="practice" row wrap>
      <VFlex xs12>
        <Checkbox v-model="altText" color="primary">
          <template #label>
            <span class="text-xs-left"> {{ $tr('altTextForImages') }}</span>
            <HelpTooltip :text="$tr('altTextInfo')" bottom class="px-2" />
          </template>
        </Checkbox>
      </VFlex>
    </VLayout>

    <VLayout v-if="video" row wrap>
      <VFlex xs12>
        <Checkbox v-model="signLanguage" color="primary">
          <template #label>
            <span class="text-xs-left"> {{ $tr('signLanguageCap') }}</span>
            <HelpTooltip :text="$tr('signLanguageInfo')" bottom class="px-2" />
          </template>
        </Checkbox>
        <Checkbox v-model="audioDescription" color="primary">
          <template #label>
            <span class="text-xs-left"> {{ $tr('audioDescription') }}</span>
            <HelpTooltip :text="$tr('audioDescriptionInfo')" bottom class="px-2" />
          </template>
        </Checkbox>
      </VFlex>
    </VLayout>
    <VLayout v-if="zip" row wrap>
      <VFlex xs12>
        <Checkbox v-model="altText" color="primary">
          <template #label>
            <span class="text-xs-left"> {{ $tr('altTextForImages') }}</span>
            <HelpTooltip :text="$tr('altTextInfo')" bottom class="px-2" />
          </template>
        </Checkbox>
        <Checkbox v-model="highContrast" color="primary">
          <template #label>
            <span class="text-xs-left"> {{ $tr('highContrast') }}</span>
            <HelpTooltip :text="$tr('highContrastInfo')" bottom class="px-2" />
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
      practice: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        altText: false,
        highContrast: false,
        taggedPdf: false,
      };
    },
    $trs: {
      altTextForImages: 'Has alternative text description for images',
      altTextInfo:
        'Alternative text is provided for visual content (e.g., via the HTML alt attribute).',
      highContrast: 'Has high contrast display for low vision',
      taggedPdf: 'Tagged PDF',
      highContrastInfo:
        'Content meets the visual contrast threshold set out in the WCAG Success Criteria 1.4.6',
      taggedPdfInfo:
        'The structures in a PDF have been tagged to improve the navigation of the content.',
      signLanguageCap: 'Has sign language captions',
      signLanguageInfo:
        'Synchronized sign language interpretation is available for audio and video content. The value may be extended by adding an ISO 639 sign language code. For example, /sgn-en-us for American Sign Language.',
      audioDescription: 'Has audio descriptions',
      audioDescriptionInfo:
        'Audio descriptions are available(e.g., via an HTML5 track element with kind="descriptions")',
    },
  };

</script>
<style lang="scss">

</style>
