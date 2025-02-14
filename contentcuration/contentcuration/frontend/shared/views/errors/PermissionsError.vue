<template>

  <AppError>
    <template #header>
      {{ $tr('permissionDeniedHeader') }}
    </template>
    <template #details>
      {{ details }}
    </template>
    <template #actions>
      <ActionLink v-bind="backHomeLink" :text="$tr('goToHomePageAction')" />
    </template>
  </AppError>

</template>


<script>

  import AppError from './AppError';

  export default {
    name: 'PermissionsError',
    components: {
      AppError,
    },
    props: {
      backHomeLink: {
        type: Object,
        required: true,
      },
      details: {
        type: String,
        required: false,
        default: '',
      },
    },
    $trs: {
      permissionDeniedHeader: 'Did you forget to sign in?',
      goToHomePageAction: 'Go to home page',
    },
  };

</script>


<style lang="scss" scoped></style>
