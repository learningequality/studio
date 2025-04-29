<template>

  <VApp>
    <AppBar>
      <template
        v-if="$store.getters.currentUserIsAdmin"
        #tabs
      >
        <VTab :to="channelsLink">
          {{ $tr('channelsLabel') }}
        </VTab>
        <VTab :to="usersLink">
          {{ $tr('usersLabel') }}
        </VTab>
      </template>
    </AppBar>
    <VContent>
      <VContainer
        fluid
        class="admin-wrapper"
      >
        <AdministrationAppError
          v-if="fullPageError"
          :error="fullPageError"
        />
        <RouterView v-else />
      </VContainer>
    </VContent>
    <GlobalSnackbar />
  </VApp>

</template>


<script>

  import { RouteNames } from '../constants';
  import AdministrationAppError from './AdministrationAppError';
  import AppBar from 'shared/views/AppBar';
  import GlobalSnackbar from 'shared/views/GlobalSnackbar';
  import { ErrorTypes } from 'shared/constants';

  export default {
    name: 'AdministrationIndex',
    components: {
      AppBar,
      AdministrationAppError,
      GlobalSnackbar,
    },
    computed: {
      fullPageError() {
        if (!this.$store.getters.currentUserIsAdmin) {
          return {
            errorType: ErrorTypes.USER_NOT_ADMIN,
          };
        }
        return this.$store.state.errors.fullPageError;
      },
      channelsLink() {
        return {
          name: RouteNames.CHANNELS,
        };
      },
      usersLink() {
        return {
          name: RouteNames.USERS,
        };
      },
    },
    $trs: {
      channelsLabel: 'Channels',
      usersLabel: 'Users',
    },
  };

</script>


<style lang="scss">

  @mixin freeze {
    position: sticky;
    z-index: 3;
    background-color: white;
  }

  .freeze {
    @include freeze;
  }

  @mixin freeze-column {
    @include freeze;

    left: 0;
    box-shadow: 0 4px 4px 0 #888888;
  }

  .freeze-column {
    @include freeze-column;
  }

  @mixin freeze-row {
    @include freeze;

    top: 0;
    box-shadow: 4px 0 4px 0 #888888;
  }

  .freeze-row {
    @include freeze-row;
  }

  .table-col-freeze {
    thead tr {
      border-bottom: 0 !important;
    }

    th {
      @include freeze-row;

      &:first-child {
        @include freeze-column;

        z-index: 4;
        box-shadow: 0 0 4px 0 #888888;
      }

      * {
        vertical-align: middle;
      }

      .v-icon:not(.v-icon--is-component) {
        font-size: 16pt !important;
        /* stylelint-disable-next-line custom-property-pattern */
        color: var(--v-darkGrey-darken1) !important;
        opacity: 1 !important;
        transform: none !important;
      }

      .v-input--checkbox {
        display: inline-block;
        width: min-content;

        .v-icon {
          font-size: 18pt !important;
          opacity: 1 !important;
          transform: none !important;
        }
      }

      button svg {
        vertical-align: baseline;
      }
    }

    td {
      width: max-content;
      white-space: nowrap;

      &:first-child {
        @include freeze-column;
      }
    }

    tr:hover td {
      /* stylelint-disable-next-line custom-property-pattern */
      background-color: var(--v-greyBackground-lighten1) !important;
    }

    /deep/ .v-table__overflow {
      max-height: calc(100vh - 332px);
      overflow-y: auto;
    }
  }

</style>
