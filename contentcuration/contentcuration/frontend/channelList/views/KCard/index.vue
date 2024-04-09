<template>

  <BaseCard
    :title="title"
    :headingLevel="headingLevel"
    :titleLines="titleLines"
    :to="to"
  >
    <div>
      <KImg
        v-if="layout === 'vertical' && thumbnailDisplay !== 'none'"
        :src="thumbnailSrc"
        :height="300"
        :width="500"
        :isDecorative="false"
        altText="thumbnail image"
        :appearanceOverrides="{
          scaleType: thumbnailScaleType,
          backgroundColor: $themeTokens.fineLine
        }"
        :style="KImgVerticalSmallStyle"
      />
      <slot v-if="!thumbnailSrc" name="thumbnailPlaceholder"></slot>

      <div class="horizontal-layout-style">

        <KImg
          v-if="layout === 'horizontal' && thumbnailDisplay === 'large'"
          :src="thumbnailSrc"
          :height="300"
          :width="600"
          :isDecorative="false"
          altText="thumbnail image"
          :appearanceOverrides="{
            scaleType: thumbnailScaleType,
            backgroundColor: $themeTokens.fineLine
          }"
        />
        <slot v-if="!thumbnailSrc" name="thumbnailPlaceholder"></slot>

        <div>
          <div
            v-if="thumbnailDisplay === 'none'"
            class="spacing"
          >
            <slot name="aboveTitle"></slot>
            <slot name="title"></slot>
            <slot name="belowTitle"></slot>
          </div>
          <KGrid
            v-else
          >
            <KGridItem
              :layout12="{ span: isVerticalLayout ? 12 : 6 }"
              :layout8="{ span: isVerticalLayout ? 8 : 4 }"
              :layout4="{ span: 4 }"
            >
              <div
                class="spacing"
                :style="textColor"
              >
                <slot name="aboveTitle"></slot>
                <slot name="title"></slot>
                <slot name="belowTitle"></slot>
              </div>
            </KGridItem>

            <KGridItem
              v-if="layout === 'horizontal'"
              :layout12="{ span: 6 }"
              :layout8="{ span: 4 }"
              :layout4="{ span: 4 }"
            >
              <KImg
                v-if="thumbnailDisplay === 'small'"
                :src="thumbnailSrc"
                :height="300"
                :width="300"
                :isDecorative="false"
                altText="thumbnail image"
                :appearanceOverrides="{
                  scaleType: thumbnailScaleType,
                  backgroundColor: $themeTokens.fineLine
                }"
                style="border-radius:20px;"
              />
              <slot v-if="!thumbnailSrc" name="thumbnailPlaceholder"></slot>

            </KGridItem>
          </KGrid>

          <div class="spacing">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </div>
  </BaseCard>

</template>


<script>

  import KImg from '../KImg';
  import BaseCard from './BaseCard.vue';

  export default {
    name: 'KCard',
    components: { BaseCard, KImg },
    props: {
      title: {
        type: String,
        required: false,
        default: null,
      },
      headingLevel: {
        type: Number,
        required: true,
        validator(value) {
          if (!value) {
            console.error('Error: Prop headingLevel is required and can not be empty.');
            return false;
          }
          return true;
        },
      },
      titleLines: {
        type: Number,
        required: true,
        default: 2,
      },
      to: {
        type: Object,
        required: true,
      },
      layout: {
        type: String,
        required: true,
        validator(value) {
          if (!value) {
            console.error('Error: Prop layout is required and can not be empty.');
            return false;
          }
          return true;
        },
      },
      thumbnailDisplay: {
        type: String,
        required: false,
        default: 'none',
      },
      thumbnailSrc: {
        type: String,
        required: false,
        default: null,
      },
      thumbnailScaleType: {
        type: String,
        required: false,
        default: 'centerInside',
      },
    },
    computed: {
      KImgVerticalSmallStyle() {
        if (this.thumbnailDisplay === 'small') {
          return {
            padding: '2em',
          };
        } else {
          return {
            padding: '0em',
          };
        }
      },
      isVerticalLayout() {
        return (
          this.layout === 'vertical' ||
          (this.layout === 'horizontal' && this.thumbnailDisplay === 'large')
        );
      },
      textColor() {
        return {
          color: this.$themeTokens.text,
        };
      },
    },
  };

</script>


<style scoped>

  .spacing{
    padding: 1em;
  }
  .footer{
    margin-top: auto;
  }

  .horizontal-layout-style{
    display: flex;
  }
</style>
