<template functional>

  <VLayout
    align-center
    justify-center
    row
    fill-height
    column
    class="error-v-layout"
  >
    <h1>
      <slot name="header"></slot>
    </h1>
    <p class="details my-3 text-xs-center">
      <slot name="details"></slot>
    </p>
    <div>
      <slot name="actions"></slot>
    </div>
  </VLayout>

</template>


<style lang="less" scoped>

  .details {
    max-width: 675px;
  }

  .error-v-layout {
    height: 50vh;
  }

</style>
