<template>

  <span :class="colorClass">
    <slot :sign="sign" :value="Math.abs(value)"></slot>
  </span>

</template>

<script>

  export default {
    name: 'Diff',
    props: {
      value: {
        type: Number,
        required: true,
      },
    },
    computed: {
      colorClass() {
        if (this.value < 0) return 'red--text text--darken-1';
        if (this.value > 0) return 'green--text text--darken-1';
        return 'grey--text text--darken-1';
      },
      sign() {
        if (this.value > 0) {
          return '+ ';
        }
        if (this.value < 0) {
          return '- ';
        }
        return '';
      },
    },
  };

</script>
