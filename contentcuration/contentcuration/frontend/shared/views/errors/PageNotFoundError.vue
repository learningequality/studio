<template>

  <StudioAppError>
    <template #header>
      {{ $tr('pageNotFoundHeader') }}
    </template>
    <template #details>
      {{ $tr('pageNotFoundDetails') }}
    </template>
    <template #actions>
      <KRouterLink
        v-bind="backHomeLink"
        appearance="raised-button"
        primary
      >
        {{ $tr('backToHomeAction') }}
      </KRouterLink>
    </template>
  </StudioAppError>

</template>


<script>

  import { routerMixin } from 'shared/mixins';
  import StudioAppError from './StudioAppError.vue';

  export default {
    name: 'PageNotFoundError',
    components: {
      StudioAppError,
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
