<template>

  <KIcon
    v-bind="$attrs"
    :icon="icon"
    :color="color"
    v-on="$listeners"
  />

</template>

<script>

  import { themeTokens } from 'kolibri-design-system/lib/styles/theme.js';

  export default {
    name: 'Icon',
    props: {
      icon: {
        type: String,
        required: true,
      },

      color: {
        type: String,
        required: false,
        default: themeTokens.text,
      },
    },
  };

</script>
