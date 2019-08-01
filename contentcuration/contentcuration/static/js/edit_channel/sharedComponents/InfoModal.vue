<template>
  <VDialog v-model="dialog" width="550">
    <template v-slot:activator="{ on }">
      <VIcon color="primary" v-on="on">
        info
      </VIcon>
    </template>

    <VCard>
      <VCardTitle class="header">
        <h1>{{ header }}</h1>
      </VCardTitle>

      <VCardText>
        <slot name="content"></slot>
      </VCardText>
      <VCardActions>
        <slot name="extra-button" class="extra-button"></slot>
        <VSpacer />
        <VBtn color="primary" depressed autofocus @click="dialog = false">
          <b>{{ $tr('closeButtonLabel') }}</b>
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script>

  export default {
    name: 'InfoModal',
    $trs: {
      closeButtonLabel: 'Close',
    },
    props: {
      header: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        dialog: false,
      };
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../less/global-variables.less';

  h1 {
    width: 100%;
    margin: 0;
    font-size: 18pt;
    text-align: center;
  }

  /deep/ p {
    font-size: 12pt;
    color: @gray-700;
  }

</style>
