<template>

  <span v-if="icon">
    <VChip
      v-if="showColor"
      label
      :color="kind"
      :small="small"
      :textColor="fontColor"
      class="ma-0 pa-0"
      :class="{ iconOnly: !includeText, fillWidth }"
      :style="{ width: fillWidth ? '100%' : 'unset' }"
      capture-as-image
    >
      <VIconWrapper small :color="fontColor" v-bind="$attrs">
        {{ icon }}
      </VIconWrapper>
      <span v-if="includeText" class="ml-2">{{ text }}</span>
    </VChip>
    <span v-else capture-as-image>
      <VIconWrapper :color="fontColor" v-bind="$attrs">
        {{ icon }}
      </VIconWrapper>
      <span v-if="includeText">{{ text }}</span>
    </span>
  </span>

</template>

<script>

  import ContentKinds from 'shared/leUtils/ContentKinds';
  import { getContentKindIcon } from 'shared/vuetify/icons';

  export default {
    name: 'ContentNodeIcon',
    props: {
      kind: {
        type: String,
        validator: value => {
          return value === 'unsupported' || ContentKinds.has(value);
        },
        default: 'unsupported',
      },
      includeText: {
        type: Boolean,
        default: false,
      },
      showColor: {
        type: Boolean,
        default: true,
      },
      isEmpty: {
        type: Boolean,
        default: false,
      },
      fillWidth: {
        type: Boolean,
        default: false,
      },
      small: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      fontColor() {
        return this.showColor ? 'white' : 'grey darken-1';
      },
      icon() {
        return getContentKindIcon(this.kind, this.isEmpty);
      },
      text() {
        switch (this.kind) {
          case 'topic':
            return this.$tr('topic');
          case 'video':
            return this.$tr('video');
          case 'audio':
            return this.$tr('audio');
          case 'slideshow':
            return this.$tr('slideshow');
          case 'exercise':
            return this.$tr('exercise');
          case 'document':
            return this.$tr('document');
          case 'h5p':
            return this.$tr('html5');
          case 'html5':
            return this.$tr('html5');
          default:
            return this.$tr('unsupported');
        }
      },
    },
    $trs: {
      topic: 'Folder',
      video: 'Video',
      audio: 'Audio',
      exercise: 'Exercise',
      document: 'Document',
      slideshow: 'Slideshow',
      html5: 'HTML5 App',
      unsupported: 'Unsupported',
    },
  };

</script>

<style lang="scss" scoped>

  .iconOnly {
    ::v-deep .v-chip__content {
      height: 22px;
      padding: 0 5px;
    }
  }

</style>
