<template>

  <VChip
    v-if="icon"
    :color="kind"
    :textColor="textColor"
    label
    small
    disabled
  >
    <Icon :color="textColor" class="mr-2">
      {{ icon }}
    </Icon>
    <span>{{ translateConstant(kind) }}</span>
  </VChip>

</template>


<script>

  import { kindToIconMap } from 'shared/constants';
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
        return kindToIconMap[this.kind];
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
