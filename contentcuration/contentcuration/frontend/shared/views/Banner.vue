<template>

  <VAlert v-model="alert" class="black--text mb-4" :color="color">
    <slot>
      {{ text }}
    </slot>
  </VAlert>

</template>
<script>

  export default {
    name: 'Banner',
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      text: {
        type: String,
        required: false,
      },
      error: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      alert: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      color() {
        if (this.error) {
          return 'red lighten-5';
        }
        return 'secondary';
      },
    },
  };

</script>
<style lang="less" scoped>

  .v-alert {
    border: 0;
  }

</style>
