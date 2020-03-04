<template>

  <div>
    <h1>Hello world</h1>
    <p>{{ loggedIn }}</p>
    <hr>
    <router-view />
  </div>

</template>


<script>

  import { mapState } from 'vuex';

  export default {
    name: 'AccountsLayout',
    components: {},
    computed: {
      ...mapState({
        loggedIn: state => state.session.loggedIn,
      }),
    },
    $trs: {},
  };

</script>


<style lang="less"></style>
