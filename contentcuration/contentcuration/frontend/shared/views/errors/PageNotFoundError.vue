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
  import { routerMixin } from 'shared/mixins';

  export default {
    name: 'PageNotFoundError',
    components: {
      AppError,
    },
    mixins: [routerMixin],
    props: {
      backHomeLink: {
        type: Object,
        required: true,
      },
    },
    mounted() {
      this.updateTabTitle(this.$store.getters.appendChannelName(this.$tr('pageNotFoundHeader')));
    },
    $trs: {
      pageNotFoundHeader: 'Page not found',
      pageNotFoundDetails: 'Sorry, that page does not exist',
      backToHomeAction: 'Back to home',
    },
  };

</script>


<style lang="scss" scoped></style>
