<template>

  <v-layout align-center justify-center fill-height class="loading-text">
    <v-flex xs12>
      <v-progress-circular
        :size="70"
        :width="7"
        color="grey"
        indeterminate
      />
      <p>{{ $tr('loadingText') }}</p>
    </v-flex>
  </v-layout>

</template>


<script>

  export default {
    name: 'LoadingText',
    $trs: {
      loadingText: 'Loading',
    },
  };

</script>


<style lang="less" scoped>

  .loading-text {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    text-align: center;
    p {
      margin-top: 20px;
      font-size: 14pt;
      color: gray;
    }
  }

</style>
