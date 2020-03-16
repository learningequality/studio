<template>

  <VChip
    v-if="icon"
    :color="kind"
    :textColor="textColor"
    label
    small
    disabled
  >
    <VIcon :color="textColor" class="mr-2">
      {{ icon }}
    </VIcon>
    <span>{{ translateConstant(kind) }}</span>
  </VChip>

</template>


<script>

  import { kindToIcon } from '../../../../static/js/edit_channel/constants/index';
  import { constantsTranslationMixin } from 'shared/mixins';

  export default {
    name: 'ContentNodeChip',
    mixins: [constantsTranslationMixin],
    props: {
      kind: {
        type: String,
        required: true,
      },
    },
    computed: {
      icon() {
        return kindToIcon(this.kind);
      },
      textColor() {
        if (this.kind === 'slideshow') {
          return 'black';
        } else {
          return 'white';
        }
      },
    },
  };

</script>


<style lang="less" scoped></style>
