<template>

  <VApp>
    <AppBar>
      <template #tabs show-arrows>
        <v-layout justify-start>
          <VTab :to="channelsLink">
            Channels
          </VTab>
          <VTab :to="usersLink">
            Users
          </VTab>
        </v-layout>
      </template>
    </AppBar>
    <VContent>
      <VContainer fluid>
        <router-view />
      </VContainer>
    </VContent>
    <GlobalSnackbar />
  </VApp>

</template>


<script>

  import { channelsLink, usersLink } from '../router';
  import AppBar from 'shared/views/AppBar';
  import GlobalSnackbar from 'shared/views/GlobalSnackbar';

  export default {
    name: 'AdministrationIndex',
    components: {
      AppBar,
      GlobalSnackbar,
    },
    computed: {
      channelsLink,
      usersLink,
    },
  };

</script>


<style lang="less">

  h1 {
    font-size: 24px;
  }

  @pinnedWidth: 300px;

  #data-table {
    display: grid;
    grid-template-columns: 5em calc(100% - 5em);
    max-width: 100%;
    .reference {
      display: none;
    }
    .hide-while-pinned {
      display: table-cell;
    }

    &.is-pinned {
      grid-template-columns: @pinnedWidth calc(100% - @pinnedWidth);

      .reference {
        display: table-cell;
      }
      .hide-while-pinned {
        display: none;
      }

      .main-columns {
        /deep/ .v-datatable__actions__select {
          position: absolute;
          left: 4em;
          justify-content: left;
        }
      }
    }

    .reference-columns {
      /deep/ .v-table__overflow {
        position: relative;
        z-index: 2;
        box-shadow: 5px 0 5px -5px #333333;
      }
      td:nth-of-type(1),
      th:nth-of-type(1) {
        max-width: 10px;
        padding-right: 1em;
        margin: 0;
      }
      td:nth-of-type(2),
      th:nth-of-type(2) {
        width: 100%;
      }
      /deep/ .v-input--checkbox {
        max-width: 10px;
      }
    }

    .main-columns {
      /deep/ .v-datatable__actions {
        background: #fafafa;
      }
    }
  }

  td {
    height: 49px !important;
    white-space: nowrap;
  }

</style>
