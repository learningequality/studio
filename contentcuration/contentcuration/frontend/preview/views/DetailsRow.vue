<template>

  <v-layout row wrap class="auth-row">
    <v-flex xs12 sm3 md2 xl1>
      <label>
        {{ label }}
        <v-tooltip v-if="definition" top>
          <template v-slot:activator="{ on }">
            <v-icon color="primary" dark small v-on="on">
              help_outline
            </v-icon>
          </template>
          <span>{{ definition }}</span>
        </v-tooltip>
      </label>

    </v-flex>
    <v-flex xs12 sm9 md10 xl1>
      <slot>
        {{ text }}
      </slot>
    </v-flex>
  </v-layout>

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
