<template>

  <VCard
    v-if="!thumbnailSrc"
    data-test="default-image"
    color="transparent"
    style="padding: 28% 0;"
    flat
  >
    <VLayout row wrap align-center justify-center style="max-height: 0px;">
      <div style="position: absolute;">
        <ContentNodeIcon :kind="kind" :showColor="false" size="64px" :isEmpty="isEmptyTopic" />
      </div>
    </VLayout>
  </VCard>

  <VLayout v-else column>
    <ContentNodeIcon :kind="kind" includeText fillWidth />
    <VImg
      data-test="thumbnail-image"
      :aspect-ratio="aspectRatio"
      :src="encoding && encoding.base64 || thumbnailSrc"
      :lazy-src="encoding && encoding.base64 || thumbnailSrc"
      contain
    />
  </VLayout>

</template>

<script>

  import { ASPECT_RATIO } from './constants';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';

  export default {
    name: 'Thumbnail',
    components: {
      ContentNodeIcon,
    },
    props: {
      src: {
        type: String,
        required: false,
      },
      encoding: {
        type: Object,
        default() {
          return {};
        },
      },
      kind: {
        type: String,
        required: false,
      },
      isEmpty: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      isEmptyTopic() {
        return this.kind === 'topic' && this.isEmpty;
      },
      thumbnailSrc() {
        return this.src || (!this.kind && require('shared/images/kolibri_placeholder.png'));
      },
      aspectRatio() {
        return ASPECT_RATIO;
      },
    },
  };

</script>

<style lang="less" scoped>

</style>
