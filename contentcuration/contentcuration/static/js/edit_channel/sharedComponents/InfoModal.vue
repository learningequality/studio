<template>
  <VDialog v-model="dialog" width="550">
    <template v-slot:activator="{ on }">
      <VBtn color="primary" icon flat v-on="on">
        <VIcon>info</VIcon>
      </VBtn>
    </template>

    <VCard>
      <VCardTitle class="header">
        <h1><slot name="header"></slot></h1>
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
    font-size: 22pt;
    text-align: center;
  }

  /deep/ p {
    font-size: 12pt;
    color: @gray-700;
    text-indent: 20px;
  }

</style>
