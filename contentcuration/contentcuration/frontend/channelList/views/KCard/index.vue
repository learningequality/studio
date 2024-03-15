<template>
  <BaseCard
    :title="title"
    :headingLevel="headingLevel"
    :to="to"
    :titleLines="titleLines"
  >
    <div
      v-if="layout === 'horizontal'"
    >
      <div
        v-if="thumbnailDisplay !== 'large'"
        class="spacing"
      >
        <div
          v-if="thumbnailDisplay === 'none'"
        >
          <slot name="aboveTitle"></slot>
          <slot name="title"></slot>
          <slot name="belowTitle"></slot>
        </div>

        <KGrid
          v-if="thumbnailDisplay === 'small'"
        >
          <KGridItem
            :layout12="{ span: 7 }"
            :layout8="{ span: 5 }"
            :layout4="{ span: 4 }"
          >
            <slot name="aboveTitle"></slot>
            <slot name="title"></slot>
            <slot name="belowTitle"></slot>

          </KGridItem>

          <KGridItem
            :layout12="{ span: 5 }"
            :layout8="{ span: 3 }"
            :layout4="{ span: 4 }"
          >
            <div :style="{ backgroundColor: $themePalette.grey.v_50 }">
              <KImg
                v-if="thumbnailSrc !== null"
                :src="thumbnailSrc"
                :height="200"
                :width="200"
                :appearanceOverrides="{ borderRadius: '10%' }"
              />
              <slot
                v-else
                name="thumbnailPlaceholder"
              ></slot>
            </div>
          </KGridItem>
        </KGrid>

        <slot
          class="footer"
          name="footer"
        ></slot>

      </div>

      <div
        v-if="thumbnailDisplay === 'large'"
      >
        <KGrid>
          <KGridItem
            :layout12="{ span: 4 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 4 }"
          >
            <div style="display: flex;height: 100%;">
              <KImg
                v-if="thumbnailSrc !== null"
                :src="thumbnailSrc"
                :height="auto"
                :width="auto"
                :appearanceOverrides="{ 
                  'object-fit': thumbnailScaleType,
                  borderRadius: '10px 0px 0px 10px' 
                }"
              />
              <slot v-else name="thumbnailPlaceholder"></slot>
            </div>
          </KGridItem>

          <KGridItem
            :layout12="{ span: 8 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 4 }"
          >
            <div class="spacing">
              <slot name="aboveTitle"></slot>
              <slot name="title"></slot>
              <slot name="belowTitle"></slot>

              <slot class="footer" name="footer"></slot>
            </div>
          </KGridItem>
        </KGrid>
      </div>
    </div>

    <div
      v-if="layout === 'vertical'"
    >
      <div>
        <div
          v-if="thumbnailDisplay === 'small'"
          class="spacing"
        >
          <KImg
            v-if="thumbnailSrc !== null"
            :src="thumbnailSrc"
            :height="300"
            :width="560"
            :appearanceOverrides="{
              objectFit: thumbnailScaleType,
              backgroundColor: 'grey'
            }"
          />
          <slot v-else name="thumbnailPlaceholder"></slot>
        </div>

        <div
          v-if="thumbnailDisplay === 'large'"
        >
          <KImg
            v-if="thumbnailSrc !== null"
            :src="thumbnailSrc"
            :height="300"
            :width="600"
          />
          <slot v-else name="thumbnailPlaceholder"></slot>
        </div>
        <div class="spacing">
          <slot name="aboveTitle"></slot>
          <slot name="title"></slot>
          <slot name="belowTitle"></slot>
          <slot class="footer" name="footer"></slot>
        </div>
      </div>
    </div>
  </BaseCard>
</template>

<script>
import KImg from '../KImg';
import BaseCard from './BaseCard.vue';

export default {
    name: "KCard",
    components: { BaseCard , KImg},
    props:{
      title: {
        type: String,
        required: false,
        default: null,
      },
      headingLevel: {
        type: Number,
        required: true,
      },
      titleLines:{
        type:Number,
        required:true,
        default:2
      },
      to: {
        type: Object,
        required: true,
      },
      layout: {
        type: String,
        required: true
      },
      thumbnailDisplay: {
        type: String,
        required: false,
        default:'none'
      },
      thumbnailSrc:{
        type: String,
        required: false,
        default: null
      },
      thumbnailScaleType:{
        type: String,
        required: false,
        default: 'centerInside'
      }
    
    },
}
</script>

<style scoped>

  .spacing{
    padding: 1em;
    min-height: 100%;
    display: flex;
    flex-direction: column;
  }
  .footer{
    margin-top: auto;
  }
</style>