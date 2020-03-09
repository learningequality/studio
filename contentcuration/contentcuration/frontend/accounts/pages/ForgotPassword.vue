<template>

  <ImmersiveModalLayout
    :previousPage="{ name: 'Main' }"
    :appBarText="$tr('title')"
  >
    <h1>{{ $tr('title') }}</h1>
    <p>...</p>
    <VBtn primary @click="submit">
      Submit
    </VBtn>
  </ImmersiveModalLayout>

</template>


<script>

  import ImmersiveModalLayout from 'shared/layouts/ImmersiveModalLayout';

  export default {
    name: 'ForgotPassword',
    components: {
      ImmersiveModalLayout,
    },
    $trs: {
      title: 'Forgot password',
    },
  };

</script>


<style lang="less" scoped>

  .form-section {
    font-size: 14px;
  }

</style>
