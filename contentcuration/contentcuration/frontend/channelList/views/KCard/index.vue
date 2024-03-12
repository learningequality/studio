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
            <div style="margin-top: 0.5em;">
              <KImg
                :src="thumbnailSrc"
                height="200px"
                width="100%"
                :appearanceOverrides="{ borderRadius: '10%' }"
              />
              <slot name="thumbnailPlaceholder"></slot>
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
            <div style="width:100px;height:100px;">
              <KImg
                :src="thumbnailSrc"
                height="100px"
                width="150%"
                :appearanceOverrides="{ 'object-fit': 'contain',borderRadius: '10px 0px 0px 10px' }"
              />
              <slot name="thumbnailPlaceholder"></slot>
            </div>
          </KGridItem>

          <KGridItem
            :layout12="{ span: 8 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
            style="width:65%;"
          >
            <div style="padding:0.5em;">
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
        class="spacing"
      >
        <div
          v-if="thumbnailDisplay === 'small'"
        >
          <KImg
            :src="thumbnailSrc"
            :height="200"
            :width="100"
            :appearanceOverrides="{
              objectFit: thumbnailScaleType,
              backgroundColor: 'grey'
            }"
          />
          <slot name="thumbnailPlaceholder"></slot>
        </div>

        <div
          v-if="thumbnailDisplay === 'large'"
        >
          <KImg
            :src="thumbnailSrc"
            :height="200"
            :width="100"
          />
          <slot name="thumbnailPlaceholder"></slot>
        </div>

        <slot name="aboveTitle"></slot>
        <slot name="title"></slot>
        <slot name="belowTitle"></slot>
        <slot name="footer"></slot>

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
  margin: 1em;
}
</style>