<template>

  <VIcon class="icon" :class="kind" dark>
    {{ icon }}
  </VIcon>

</template>

<script>

  import Constants from 'edit_channel/constants';

  const kinds = Constants.ContentKinds.map(kind => kind.kind);

  export default {
    name: 'ContentNodeIcon',
    props: {
      kind: {
        type: String,
        required: true,
        validator: value => {
          return kinds.includes(value);
        },
      },
    },
    computed: {
      icon() {
        switch (this.kind) {
          case 'topic':
            return 'folder';
          case 'video':
            return 'theaters';
          case 'audio':
            return 'headset';
          case 'image':
            return 'image';
          case 'exercise':
            return 'star';
          case 'document':
            return 'description';
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

  @topic-color: #aaaaaa;
  @video-color: #283593;
  @audio-color: #f06292;
  @doc-color: #ff3d00;
  @exercise-color: #4db6ac;
  @html-color: #ff8f00;
  @slideshow-color: #4ece90;

  .icon {
    padding: 2px;
    font-size: 13pt !important;
    color: white;
    border-radius: 5px;
    &.video {
      background-color: @video-color;
    }
    &.audio {
      background-color: @audio-color;
    }
    &.document {
      background-color: @doc-color;
    }
    &.exercise {
      background-color: @exercise-color;
    }
    &.html5 {
      background-color: @html-color;
    }
    &.topic {
      background-color: @topic-color;
    }
  }

</style>
