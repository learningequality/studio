<template>

  <div
    class="studio-raised-box"
    :style="{ backgroundColor: $themeTokens.surface }"
  >
    <div
      class="studio-raised-box__header"
      :style="{ color: $themeTokens.annotation }"
    >
      <slot name="header"></slot>
    </div>
    <div class="studio-raised-box__main">
      <slot name="main"></slot>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'StudioRaisedBox'
  }

</script>


<style lang="scss" scoped>

@import '~kolibri-design-system/lib/styles/definitions';

.studio-raised-box {
  @extend %dropshadow-2dp;
  &__header {
    padding: 16px 16px 0 16px;
  }
  &__main {
    padding-bottom: 18px;
  }
  
}

</style>