<template>

  <KIconButton 
    v-bind="$attrs"
    :tooltip="text"
    :icon="icon"
    ariaLabel="text"
    :color="color"
    :size="size"
    style="width: 100%;"
    v-on="$listeners"
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
    computed: {
      tooltipColor() {
        return themeTokens.text;
      },
    },
  };

</script>
