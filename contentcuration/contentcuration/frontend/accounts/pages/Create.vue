<template>

  <ImmersiveModalLayout
    previousPage="/"
    :appBarText="$tr('title')"
  >
    <h1>{{ $tr('title') }}</h1>
    <p>...</p>
    <VBtn primary @click="submit">
      Finish
    </VBtn>
  </ImmersiveModalLayout>

</template>


<script>

  import ImmersiveModalLayout from 'shared/layouts/ImmersiveModalLayout';

  export default {
    name: 'Create',
    components: {
      ImmersiveModalLayout,
    },
    methods: {
      submit() {
        // handle account creation
        this.$router.push({ name: 'ActivationSent' });
      },
    },
    $trs: {
      title: 'Create an account',
    },
  };

</script>


<style lang="less" scoped>

  .form-section {
    font-size: 14px;
  }

</style>
