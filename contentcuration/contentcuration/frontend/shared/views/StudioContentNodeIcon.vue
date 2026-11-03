<template>

  <span
    v-if="icon"
    class="studio-content-node-icon"
    :style="{ backgroundColor: backgroundColor }"
    capture-as-image
  >
    <KIcon
      :icon="icon"
      :color="$themeTokens.textInverted"
      v-bind="$attrs"
    />
  </span>

</template>


<script>

  import ContentKinds from 'shared/leUtils/ContentKinds';
  import { getContentKindIcon } from 'shared/utils/icons';
  import { getContentKindColor } from 'shared/utils/colors';

  export default {
    name: 'StudioContentNodeIcon',
    inheritAttrs: false,
    props: {
      kind: {
        type: String,
        validator: value => {
          return value === 'unsupported' || ContentKinds.has(value);
        },
        default: 'unsupported',
      },
      isEmpty: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      icon() {
        try {
          return getContentKindIcon(this.kind, this.isEmpty);
        } catch (e) {
          return null;
        }
      },
      backgroundColor() {
        return getContentKindColor(this.kind);
      },
    },
  };

</script>


<style lang="scss" scoped>

  .studio-content-node-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 5px;
    line-height: 1;
    vertical-align: middle;
    border-radius: 4px;
  }

</style>
