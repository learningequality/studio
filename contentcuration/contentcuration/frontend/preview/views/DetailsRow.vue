<template>

  <VLayout row wrap class="auth-row">
    <VFlex xs12 sm3 md2 xl1>
      <label>
        {{ label }}
        <VTooltip v-if="definition" top>
          <template v-slot:activator="{ on }">
            <VIcon color="primary" dark small class="notranslate" v-on="on">
              help_outline
            </VIcon>
          </template>
          <span>{{ definition }}</span>
        </VTooltip>
      </label>

    </VFlex>
    <VFlex xs12 sm9 md10 xl11>
      <slot>
        {{ text }}
      </slot>
    </VFlex>
  </VLayout>

</template>

<script>

  export default {
    name: 'DetailsRow',
    props: {
      label: {
        type: String,
      },
      definition: {
        type: String,
      },
      text: {
        type: String,
      },
    },
  };

</script>


<style lang="less" scoped>

  .row {
    margin-bottom: 16px;
    label {
      vertical-align: middle;
    }
    .flex:last-child {
      padding-left: 10px;
    }
  }

</style>
