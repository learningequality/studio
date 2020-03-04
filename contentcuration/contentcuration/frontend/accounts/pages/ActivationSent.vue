<template>

  <ImmersiveModalLayout
    previousPage="/"
    :appBarText="$tr('title')"
  >
    <h1>{{ $tr('header') }}</h1>
    <p>...</p>
    <router-link to="/">
      {{ $tr('back') }}
    </router-link>
  </ImmersiveModalLayout>

</template>


<script>

  import ImmersiveModalLayout from 'shared/views/ImmersiveModalLayout';

  export default {
    name: 'ActivationSent',
    components: {
      ImmersiveModalLayout,
    },
    $trs: {
      title: 'Create an account',
      header: 'Activation link sent',
      back: 'Back to login',
    },
  };

</script>


<style lang="less" scoped>

  .form-section {
    font-size: 14px;
  }

</style>
