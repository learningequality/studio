<template>

  <VAlert v-model="alert" class="black--text ma-0" :color="color" :style="style">
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
      border: {
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
        return 'white';
      },
      style() {
        if (this.border) {
          return {
            'border-bottom': '1px solid #eeeeee',
          };
        }
        return {};
      },
    },
  };

</script>

<style lang="less" scoped>

  .v-alert {
    border: 0;
  }

</style>
