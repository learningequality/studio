<template>

  <StudioAppError>
    <template #header>
      {{ $tr('permissionDeniedHeader') }}
    </template>
    <template #details>
      {{ details }}
    </template>
    <template #actions>
      <KRouterLink
        v-bind="backHomeLink"
        :text="$tr('backToHome')"
        appearance="raised-button"
        primary
      />
    </template>
  </StudioAppError>

</template>


<script>

  import StudioAppError from './StudioAppError';

  export default {
    name: 'PermissionsError',
    components: {
      StudioAppError,
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
      backToHome: 'Back to home',
    },
  };

</script>


<style lang="scss" scoped></style>
