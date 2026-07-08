<template>

  <div>
    <p
      class="validation-message"
      role="alert"
      :style="{ color: $themeTokens.error }"
    >
      <slot></slot>
    </p>
  </div>

</template>


<script>

  export default {
    name: 'ValidationMessage',
  };

</script>


<style scoped>

  .validation-message {
    margin: 2px 0 0;
    font-size: 14px;
    line-height: 1.4;
  }

</style>
