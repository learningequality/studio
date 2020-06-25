<template>

  <VApp>
    <AppBar>
      <template #tabs>
        <VTab :to="channelsLink">
          Channels
        </VTab>
        <VTab :to="usersLink">
          Users
        </VTab>
      </template>
    </AppBar>
    <VContent>
      <VContainer fluid class="admin-wrapper">
        <RouterView />
      </VContainer>
    </VContent>
    <GlobalSnackbar />
  </VApp>

</template>


<script>

  import { RouterNames } from '../constants';
  import AppBar from 'shared/views/AppBar';
  import GlobalSnackbar from 'shared/views/GlobalSnackbar';

  export default {
    name: 'AdministrationIndex',
    components: {
      AppBar,
      GlobalSnackbar,
    },
    computed: {
      channelsLink() {
        return {
          name: RouterNames.CHANNELS,
        };
      },
      usersLink() {
        return {
          name: RouterNames.USERS,
        };
      },
    },
  };

</script>


<style lang="less">

  @first-col-width: 75px;
  @first-col-expanded-width: 350px;

  .freeze {
    position: sticky;
    z-index: 3;
    background-color: white;
  }
  .freeze-column {
    .freeze;

    left: 0;
    box-shadow: 0 4px 4px 0 #888888;
  }

  .freeze-row {
    .freeze;

    top: 0;
    box-shadow: 4px 0 4px 0 #888888;
  }

  .table-col-freeze {
    thead tr {
      border-bottom: 0 !important;
    }
    th {
      .freeze-row;

      &:first-child {
        .freeze-column;

        z-index: 4;
        box-shadow: 0 0 4px 0 #888888;
      }
    }
    td:first-child {
      .freeze-column;
    }

    tr:hover td {
      background-color: var(--v-greyBackground-base) !important;
    }

    /deep/ .v-table__overflow {
      max-height: calc(100vh - 332px);
      overflow-y: auto;
    }
  }

</style>
