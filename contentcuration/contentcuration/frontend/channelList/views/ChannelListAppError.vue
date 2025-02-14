<template>

  <div>
    <ChannelNotFoundError
      v-if="error.errorType === ErrorTypes.CHANNEL_NOT_FOUND"
      :backHomeLink="homeUrl"
    />
    <PermissionsError
      v-else-if="error.errorType === ErrorTypes.UNAUTHORIZED"
      :details="$tr('channelPermissionsErrorDetails')"
      :backHomeLink="homeUrl"
    />
    <PageNotFoundError
      v-else-if="error.errorType === ErrorTypes.PAGE_NOT_FOUND"
      :backHomeLink="homeUrl"
    />
    <GenericError
      v-else
      :error="error"
      :backHomeLink="homeUrl"
    />
  </div>

</template>


<script>

  import { RouteNames } from '../constants';
  import ChannelNotFoundError from 'shared/views/errors/ChannelNotFoundError';
  import PageNotFoundError from 'shared/views/errors/PageNotFoundError';
  import PermissionsError from 'shared/views/errors/PermissionsError';
  import GenericError from 'shared/views/errors/GenericError';
  import { ErrorTypes } from 'shared/constants';

  export default {
    name: 'ChannelListAppError',
    components: {
      ChannelNotFoundError,
      PageNotFoundError,
      PermissionsError,
      GenericError,
    },
    props: {
      error: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        ErrorTypes,
      };
    },
    computed: {
      homeUrl() {
        return {
          to: {
            name: RouteNames.CHANNELS_EDITABLE,
          },
        };
      },
    },
    watch: {
      $route() {
        this.$store.dispatch('errors/resetState');
      },
    },
    $trs: {
      channelPermissionsErrorDetails:
        'Sign in or ask the owner of this channel to give you permission to edit or view',
    },
  };

</script>


<style lang="scss" scoped></style>
