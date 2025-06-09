<template>

  <div
    v-if="show"
    class="studio-banner"
    role="alert"
  >
    <slot>{{ text }}</slot>
  </div>

</template>


<script>

  export default {
    name: 'StudioBanner',
    props: {
      show: {
        type: Boolean,
        required: true,
      },
      text: {
        type: String,
        default: '',
      },
      error: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style scoped>

  .studio-banner {
    padding: 12px 16px;
    margin-bottom: 16px;
    font-size: 14px;
    line-height: 1.4;
    color: #5f2120;
    background-color: #ffd9d3; /* Similar to palette.red.v_100 from KDS */
    border-radius: 4px;
  }

</style>
