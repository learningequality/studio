<template>
  <span>
    <v-chip
      v-if="showColor"
      label
      :color="kind"
      :textColor="fontColor"
      small
    >
      <v-icon small :color="fontColor">{{ icon }}</v-icon>
      <span v-if="includeText">{{ $tr(kind) }}</span>
    </v-chip>
    <span v-else>
      <v-icon :color="fontColor">{{ icon }}</v-icon>
      <span v-if="includeText">{{ $tr(kind) }}</span>
    </span>
  </span>
</template>

<script>

  import _ from 'underscore';
  import Constants from 'edit_channel/constants';

  const kinds = _.pluck(Constants.ContentKinds, 'kind');

  export default {
    name: 'ContentNodeIcon',
    $trs: {
      topic: 'Topic',
      video: 'Video',
      audio: 'Audio',
      exercise: 'Exercise',
      document: 'Document',
      slideshow: 'Slideshow',
      html5: 'HTML5 App',
    },
    props: {
      kind: {
        type: String,
        required: true,
        validator: value => {
          return kinds.includes(value);
        },
      },
      includeText: {
        type: Boolean,
        default: false,
      },
      showColor: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
      fontColor() {
        return this.showColor ? 'white' : 'grey darken-1';
      },
      icon() {
        switch (this.kind) {
          case 'topic':
            return 'folder';
          case 'video':
            return 'ondemand_video';
          case 'audio':
            return 'music_note';
          case 'slideshow':
            return 'image';
          case 'exercise':
            return 'assignment';
          case 'document':
            return 'class';
          case 'html5':
            return 'widgets';
          default:
            return 'error';
        }
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../less/global-variables.less';
  .v-chip {
    margin-right: 10px;
    /deep/ .v-chip__content {
      padding: 0 10px;
    }
    span {
      padding-left: 5px;
    }
  }

</style>
