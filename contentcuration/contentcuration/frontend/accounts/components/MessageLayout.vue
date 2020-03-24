<template>

  <ImmersiveModalLayout
    :previousPage="{ name: 'Main' }"
    :appBarText="$tr('backToLogin')"
    backButton
  >
    <h1 class="font-weight-bold headline text-xs-center">
      {{ header }}
    </h1>
    <p class="text-xs-center subheading mt-1 mb-5">
      {{ text }}
    </p>
    <div style="max-width: 400px; margin: 0 auto; text-align: center;">
      <slot></slot>
    </div>
  </ImmersiveModalLayout>

</template>


<script>

  import ImmersiveModalLayout from 'shared/layouts/ImmersiveModalLayout';

  export default {
    name: 'MessageLayout',
    components: {
      ImmersiveModalLayout,
    },
    props: {
      header: {
        type: String,
        required: true,
      },
      text: {
        type: String,
        required: false,
      },
    },
    $trs: {
      backToLogin: 'Back to sign in',
    },
  };

</script>


<style lang="less" scoped>

  .form-section {
    font-size: 14px;
  }

</style>
