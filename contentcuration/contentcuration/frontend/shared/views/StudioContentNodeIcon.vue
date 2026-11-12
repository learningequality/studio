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
        return getContentKindIcon(this.kind, this.isEmpty);
      },
      backgroundColor() {
        return getContentKindColor(this.kind);
      },
    },
  };

</script>


<style lang="scss" scoped>

  // Icon-only ContentNodeIcon: .v-chip__content is 22px with 0 5px padding,
  // and the Vuetify icon is small (16px). KIcon's svg defaults to 1.125em.
  .studio-content-node-icon {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 22px;
    padding: 0 5px;
    line-height: 1;
    vertical-align: middle;
    border-radius: 4px;

    svg {
      top: 0;
      width: 16px;
      height: 16px;
    }
  }

</style>
