<template>

  <KIconButton 
    v-bind="$attrs"
    v-on="$listeners"
    :tooltip="text"
    :icon="icon"
    ariaLabel="text"
    :color="color"
  />

</template>

<script>
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';

  export default {
    name: 'IconButton',
    props: {
      text: {
        type: String,
        required: true,
      },
      icon: {
        type: String,
        required: true,
      },
      small: {
        type: Boolean,
        default: false,
      },
      color: {
        type: String,
        required: false,
        default: themeTokens.text,
      },
    },
    computed: {
      tooltipColor() {
        return themeTokens.text;
      }
    },
  };

</script>
