<template>

  <div>
    <ChannelNotFoundError
      v-if="error.errorType === ErrorTypes.CHANNEL_NOT_FOUND"
      :backHomeLink="backFromCurrentPageUrl"
    />
    <PageNotFoundError
      v-else-if="error.errorType === ErrorTypes.PAGE_NOT_FOUND"
      :backHomeLink="backFromCurrentPageUrl"
    />
    <PermissionsError
      v-else-if="error.errorType === ErrorTypes.USER_NOT_ADMIN"
      :backHomeLink="myChannelsUrl"
      :details="$tr('unauthorizedDetails')"
    />
    <GenericError
      v-else
      :backHomeLink="backFromCurrentPageUrl"
      :error="error"
    />
  </div>

</template>


<script>

  import { RouteNames } from '../constants';
  import PermissionsError from 'shared/views/errors/PermissionsError';
  import ChannelNotFoundError from 'shared/views/errors/ChannelNotFoundError';
  import PageNotFoundError from 'shared/views/errors/PageNotFoundError';
  import GenericError from 'shared/views/errors/GenericError';
  import { ErrorTypes } from 'shared/constants';

  export default {
    name: 'AdministrationAppError',
    components: {
      ChannelNotFoundError,
      GenericError,
      PageNotFoundError,
      PermissionsError,
    },
    props: {
      error: {
        type: Object,
        required: false,
        default: () => ({}),
      },
    },
    data() {
      return {
        ErrorTypes,
      };
    },
    computed: {
      myChannelsUrl() {
        return {
          href: window.Urls.channels(),
        };
      },
      backFromCurrentPageUrl() {
        const currentPage = this.$route.name;
        let toName;
        if (currentPage === RouteNames.USER) {
          toName = RouteNames.USERS;
        } else {
          toName = RouteNames.CHANNELS;
        }
        return {
          to: { name: toName },
        };
      },
    },
    watch: {
      $route() {
        this.$store.dispatch('errors/resetState');
      },
    },
    $trs: {
      unauthorizedDetails: 'You need to be an administrator of Studio to view this page',
    },
  };

</script>


<style lang="scss" scoped></style>
