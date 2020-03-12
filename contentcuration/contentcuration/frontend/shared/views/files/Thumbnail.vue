<template>

  <VCard
    v-if="!thumbnailSrc"
    data-test="default-image"
    color="grey lighten-4"
    style="padding: 28% 0;"
    flat
  >
    <VLayout row wrap align-center justify-center style="max-height: 0px;">
      <div style="position: absolute;">
        <ContentNodeIcon :kind="preset.kind_id" :showColor="false" size="64px" />
      </div>
    </VLayout>
  </VCard>

  <VImg
    v-else
    data-test="thumbnail-image"
    :aspect-ratio="16/9"
    :src="encoding && encoding.base64 || thumbnailSrc"
    :lazy-src="encoding && encoding.base64 || thumbnailSrc"
    contain
  />

</template>

<script>

  import Constants from 'edit_channel/constants/index';

  export default {
    name: 'Thumbnail',
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
      presetId: {
        type: String,
        default: 'channel_thumbnail',
      },
    },
    computed: {
      preset() {
        return Constants.FormatPresets.find(p => p.id === this.presetId);
      },
      thumbnailSrc() {
        return (
          this.src || (!this.preset.kind_id && require('shared/images/kolibri_placeholder.png'))
        );
      },
    },
  };

</script>

<style lang="less" scoped>

</style>
