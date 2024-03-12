<template>
  <BaseCard
    :title="title"
    :headingLevel="headingLevel"
    :to="to"
  >
    <div
      v-if="layout === 'horizontal'"
    >
      <component
        :is="divSection"
        v-if="thumbnailDisplay !== 'large'"
        class="spacing"
      >
        <div v-if="thumbnailDisplay === 'none'">
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
            :layout4="{ span: 2 }"
          >
            <slot name="aboveTitle"></slot>
            <slot name="title"></slot>
            <slot name="belowTitle"></slot>

          </KGridItem>

          <KGridItem
            :layout12="{ span: 5 }"
            :layout8="{ span: 3 }"
            :layout4="{ span: 2 }"
          >
            <div>
              <KImg
                v-if="thumbnailSrc !== null"
                :src="thumbnailSrc"
                :height="200"
                :width="200"
                :appearanceOverrides="{ borderRadius: '10%' }"
              />
              <slot v-else name="thumbnailPlaceholder"></slot>
            </div>
          </KGridItem>
        </KGrid>

        <slot name="footer"></slot>

      </component>


      <component
        :is="divSection"
        v-if="thumbnailDisplay === 'large'"
      >
        <KGrid>
          <KGridItem
            :layout12="{ span: 4 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            <div>
              <KImg
                v-if="thumbnailSrc !== null"
                :src="thumbnailSrc"
                :height="142"
                :width="180"
                :appearanceOverrides="{ 'object-fit': 'contain',borderRadius: '10px 0px 0px 10px' }"
              />
              <slot v-else name="thumbnailPlaceholder"></slot>
            </div>
          </KGridItem>

          <KGridItem
            :layout12="{ span: 8 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
            style="width:65%;"
          >
            <div class="spacing">
              <slot name="aboveTitle"></slot>
              <slot name="title"></slot>
              <slot name="belowTitle"></slot>

              <slot name="footer"></slot>
            </div>
          </KGridItem>
        </KGrid>
      </component>
    </div>

    <div
      v-if="layout === 'vertical'"
    >
      <component
        :is="divSection"
      >
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
          <slot name="footer"></slot>
        </div>
      </component>

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
    computed:{
      divSection(){
        return 'div';
      }
    }
}
</script>

<style scoped>


.spacing{
  padding: 1em;
}
</style>