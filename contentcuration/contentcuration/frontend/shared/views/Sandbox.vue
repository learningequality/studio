<template>

  <div>
    <a href="javascript:void(0);" @click="$store.dispatch('showSnackbar', { duration: duration, text: 'hi!' })">Auto dismiss</a>
    <label>Enter duration in ms (0 if you want it to live forever)</label>
    <br>
    <input v-model="duration" type="text" style="border: 1px solid black;">
    <TemplateComponent />
    <GlobalSnackbar />
  </div>

</template>
<script>

  import TemplateComponent from '../../channelEdit/views/template/Template';
  import GlobalSnackbar from './GlobalSnackbar';

  export default {
    name: 'Sandbox',
    components: {
      TemplateComponent,
      GlobalSnackbar,
    },
    data() {
      return {
        duration: 1000,
      };
    },
  };

</script>


<style lang="less" scoped>

</style>
