<template>

  <VProgressCircular v-if="loading" indeterminate size="16" color="grey lighten-1" />
  <p v-else class="body-2 grey--text metadata">
    <span>
      {{ metadata.languageName }}
    </span>
    <span>
      {{ $tr('publishingSizeText', { count: metadata.resourceCount }) }}
    </span>
    <span>
      {{ formatFileSize(metadata.size) }}
    </span>
    <span v-if="metadata.channelVersion">
      {{ $tr('versionText', { version: metadata.channelVersion }) }}
    </span>
    <span v-else>
      {{ $tr('unpublishedText') }}
    </span>
  </p>

</template>

<script>

  import { fileSizeMixin } from 'shared/mixins';

  export default {
    name: 'ChannelMetadata',
    mixins: [fileSizeMixin],
    props: {
      metadata: {
        type: Object,
        required: true,
      },
      loading: {
        type: Boolean,
      },
    },
    $trs: {
      versionText: 'Current Version: {version}',
      unpublishedText: 'Unpublished',
      publishingSizeText: '{count, plural, =1 {# resource} other {# resources}}',
    },
  };

</script>

<style lang="less" scoped>

  .metadata span:not(:first-child)::before {
    content: ' • ';
  }

</style>
