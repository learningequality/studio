<template>

  <div>
    <VLayout v-if="docOrSlides" row wrap>
      <VFlex
        v-for="(category, index) in documentOrSlides"
        :key="documentOrSlides[index].label"
        xs12
      >
        <Checkbox v-model="selected" color="primary">
          <template #label>
            <span class="text-xs-left"> {{ $tr(category.label) }}</span>
            <HelpTooltip :text="$tr(category.toolTip)" bottom class="px-2" />
          </template>
        </Checkbox>
        {{ selected }}
      </VFlex>
    </VLayout>

    <VLayout v-if="practice" row wrap>
      <VFlex xs12>
        <Checkbox v-model="selected" color="primary">
          <template #label>
            <span class="text-xs-left"> {{ $tr('altTextForImages') }}</span>
            <HelpTooltip :text="$tr('altTextInfo')" bottom class="px-2" />
          </template>
        </Checkbox>
      </VFlex>
    </VLayout>

    <VLayout v-if="video" row wrap>
      <VFlex v-for="(category, index) in videos" :key="videos[index].label" xs12>
        <Checkbox v-model="selected" color="primary">
          <template #label>
            <span class="text-xs-left"> {{ $tr(category.label) }}</span>
            <HelpTooltip :text="$tr(category.toolTip)" bottom class="px-2" />
          </template>
        </Checkbox>
      </VFlex>
    </VLayout>
    <VLayout v-if="zip" row wrap>
      <VFlex v-for="(category, index) in zips" :key="zips[index].label" xs12>
        <Checkbox v-model="selected" color="primary">
          <template #label>
            <span class="text-xs-left"> {{ $tr(category.label) }}</span>
            <HelpTooltip :text="$tr(category.toolTip)" bottom class="px-2" />
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
      value: {
        type: Array,
        default: () => [],
      },
    },
    data() {
      return {
        documentOrSlides: [
          { label: 'altTextForImages', toolTip: 'altTextInfo', selected: false },
          { label: 'highContrast', toolTip: 'highContrastInfo', selected: false },
          { label: 'taggedPdf', toolTip: 'taggedPdfInfo', selected: false },
        ],
        videos: [
          { label: 'signLanguageCap', toolTip: 'signLanguageInfo', selected: false },
          { label: 'audioDescription', toolTip: 'audioDescriptionInfo', selected: false },
        ],
        zips: [
          { label: 'altTextForImages', toolTip: 'altTextInfo', selected: false },
          { label: 'highContrast', toolTip: 'highContrastInfo', selected: false },
        ],
      };
    },
    computed: {
      selected: {
        get() {
          return this.value;
        },
        set(value) {
          return this.$emit('input', value);
        },
      },
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
