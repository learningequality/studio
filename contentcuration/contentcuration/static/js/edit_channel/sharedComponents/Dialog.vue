<template>
  <VDialog v-model="dialog" width="400">
    <VCard>
      <VCardTitle class="header">
        <h1>{{ header }}</h1>
      </VCardTitle>

      <VCardText>
        <p>{{ text }}</p>
        <slot name="content"></slot>
      </VCardText>
      <VCardActions>
        <slot name="buttons"></slot>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script>

  export default {
    name: 'Dialog',
    $trs: {},
    props: {
      header: {
        type: String,
        required: true,
      },
      text: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        dialog: false,
      };
    },
    methods: {
      prompt() {
        this.dialog = true;
      },
      close() {
        this.dialog = false;
      },
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../less/global-variables.less';

  .header {
    background-color: @gray-300;
    h1 {
      margin: 0;
      font-size: 14pt;
      font-weight: bold;
    }
  }

  p {
    font-size: 12pt;
    color: @gray-700;
  }

  /deep/ .v-btn {
    font-weight: bold;
  }

</style>
