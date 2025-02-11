<template>

  <VAlert v-model="alert" class="black--text ma-0" :color="backgroundColor" :style="style">
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
        default: '',
      },
      error: {
        type: Boolean,
        default: false,
      },
      border: {
        type: Boolean,
        default: false,
      },
      color: {
        type: String,
        default: 'white',
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
      backgroundColor() {
        if (this.error) {
          return 'red lighten-5';
        }
        return this.color;
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

<style lang="scss" scoped>

  .v-alert {
    border: 0;
  }

</style>
