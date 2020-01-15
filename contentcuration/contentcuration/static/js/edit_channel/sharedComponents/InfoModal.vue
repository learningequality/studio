<template>

  <VDialog v-model="dialog" width="550">
    <template v-slot:activator="{ on }">
      <VIcon color="primary" class="notranslate" v-on="on">
        info
      </VIcon>
    </template>

    <VCard>
      <VCardTitle class="headline">
        {{ header }}
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
    $trs: {
      closeButtonLabel: 'Close',
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../less/global-variables.less';
  .v-card__title {
    padding-bottom: 0;
  }

  .headline,
  /deep/ .headline {
    font-family: @font-family !important;
  }

  /deep/ p {
    font-size: 12pt;
    color: @gray-700;
  }

</style>
