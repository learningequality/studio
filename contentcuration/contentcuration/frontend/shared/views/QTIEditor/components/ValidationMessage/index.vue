<template>

  <p
    v-if="show"
    class="validation-message"
    role="alert"
    :style="{ color: $themePalette.red.v_700 }"
  >
    <slot></slot>
  </p>

</template>


<script>

  export default {
    name: 'ValidationMessage',

    props: {
      /** Whether the message is currently visible. */
      show: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style scoped>

  .validation-message {
    margin: 2px 0 0;
    font-size: 12px;
    line-height: 1.4;
  }

</style>
