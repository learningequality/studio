<template>

  <KIconButton 
    v-bind="$attrs"
    :tooltip="text"
    :icon="icon"
    ariaLabel="text"
    :color="color"
    :size="size"
    v-on="$listeners"
  />

</template>

<script>

  import { themeTokens } from 'kolibri-design-system/lib/styles/theme.js';

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
      size: {
        type: String,
        required: false,
        default: null,
      },
      color: {
        type: String,
        required: false,
        default: themeTokens.text,
      },
    },
  };

</script>
