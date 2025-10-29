<template>

  <div
    :style="{
      backgroundColor: $themeTokens.surface,
    }"
  >
    <div class="item-content">
      <slot
        name="content"
      >
      </slot>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'AccordionItem',
  };

</script>


<style lang="scss" scoped>

  .item-content {
    padding: 16px;
    font-size: 16px;
  }

</style>
