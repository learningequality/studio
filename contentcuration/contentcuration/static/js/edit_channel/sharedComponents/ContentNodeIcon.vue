<template>
  <VIcon>{{ icon }}</VIcon>
</template>

<script>

  import _ from 'underscore';
  import Constants from 'edit_channel/constants';

  const kinds = _.pluck(Constants.ContentKinds, 'kind');

  export default {
    name: 'ContentNodeIcon',
    props: {
      kind: {
        type: String,
        required: true,
        validator: value => {
          return _.contains(kinds, value);
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

  @import '../../../less/global-variables.less';

  .v-icon {
    color: @gray-500;
  }

</style>
