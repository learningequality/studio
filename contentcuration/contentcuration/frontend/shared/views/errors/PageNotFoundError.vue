<template>

  <AppError>
    <template #header>
      {{ $tr('pageNotFoundHeader') }}
    </template>
    <template #details>
      {{ $tr('pageNotFoundDetails') }}
    </template>
    <template #actions>
      <VBtn v-bind="backHomeLink" color="primary">
        {{ $tr('backToHomeAction') }}
      </VBtn>
    </template>
  </AppError>

</template>


<script>

  import AppError from './AppError';

  export default {
    name: 'PageNotFoundError',
    components: {
      AppError,
    },
    props: {
      backHomeLink: {
        type: Object,
        required: true,
      },
    },
    $trs: {
      pageNotFoundHeader: 'Page not found',
      pageNotFoundDetails: 'Sorry, that page does not exist',
      backToHomeAction: 'Back to home',
    },
  };

</script>


<style lang="less" scoped></style>
