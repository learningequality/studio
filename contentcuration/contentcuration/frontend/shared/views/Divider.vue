<template>

  <hr
    :style="dividerStyle"
  >

</template>

<script>

  export default {
    name: 'Divider',
    props: {
      margin: {
        type: String,
        default: '1em 0',
      },
    },
    computed: {
      dividerStyle() {
        return {
          border: 0,
          borderBottom: `1px solid ${this.$themeTokens.fineLine}`,
          margin: this.margin,
        };
      },
    },
  };

</script>
