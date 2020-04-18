<template>

  <div>
    <h1 class="font-weight-bold title mt-5">
      {{ header }}
    </h1>
    {{ channel }}
    <VDataTable
      hide-headers
      hide-actions
      :items="users.concat(invitations)"
    >
      <template #no-data>
        <td class="px-0">
          {{ $tr('noUsersText') }}
        </td>
      </template>
      <template #items="{item}">
        <tr :class="item.pending? 'grey--text' : 'black--text'">
          <td class="pl-0 text-truncate" style="width: 350px; max-width: 350px;">
            {{ item.first_name }} {{ item.last_name }}
          </td>
          <td>{{ item.email }}</td>
          <td>
            <em v-if="item.pending" class="black--text font-weight-bold">
              {{ $tr('invitePendingText') }}
            </em>
          </td>
          <td class="text-xs-right">
            <VMenu v-if="item.pending || viewOnly" offset-y>
              <template v-slot:activator="{ on }">
                <VBtn flat v-on="on">
                  {{ $tr('optionsDropdown') }}
                  <Icon class="ml-1">
                    arrow_drop_down
                  </Icon>
                </VBtn>
              </template>
              <VList>
                <template v-if="item.pending">
                  <VListTile @click.stop>
                    <VListTileTitle>{{ $tr('resendInvitation') }}</VListTileTitle>
                  </VListTile>
                  <VListTile @click.stop>
                    <VListTileTitle>{{ $tr('deleteInvitation') }}</VListTileTitle>
                  </VListTile>
                </template>
                <template v-else>
                  <VListTile @click.stop>
                    <VListTileTitle>{{ $tr('makeEditor') }}</VListTileTitle>
                  </VListTile>
                  <VListTile @click.stop>
                    <VListTileTitle>{{ $tr('removeViewer') }}</VListTileTitle>
                  </VListTile>
                </template>
              </VList>
            </VMenu>
          </td>
        </tr>
      </template>
    </VDataTable>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { SharingPermissions } from 'shared/constants';

  export default {
    name: 'ChannelSharingTable',
    props: {
      channelId: {
        type: String,
        required: true,
      },
      mode: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters('channel', ['getChannel']),
      channel() {
        return this.getChannel(this.channelId) || {};
      },
      users() {
        return [
          { id: 'test-user', first_name: 'Test', last_name: 'User', email: 'test@testing.com' },
          { id: 'test-user2', first_name: 'Test', last_name: 'User 2', email: 'test@testing2.com' },
        ];
      },
      invitations() {
        return [
          {
            id: 'test-user3',
            first_name: 'Test',
            last_name: 'User 3',
            email: 'test@testing.com',
            pending: true,
          },
        ];
      },
      header() {
        if (this.mode === SharingPermissions.EDIT) {
          return this.$tr('editorsSubheading', { count: this.users.length });
        }
        return this.$tr('viewersSubheading', { count: this.users.length });
      },
      viewOnly() {
        return this.mode === SharingPermissions.VIEW_ONLY;
      },
    },
    $trs: {
      editorsSubheading: '{count, plural,\n =1 {# editor}\n other {# editors}}',
      viewersSubheading: '{count, plural,\n =1 {# viewer}\n other {# viewers}}',
      noUsersText: 'No users found',
      optionsDropdown: 'Options',
      resendInvitation: 'Resend invitation',
      deleteInvitation: 'Delete invitation',
      makeEditor: 'Make editor',
      removeViewer: 'Remove viewer',
      invitePendingText: 'Invite pending',
    },
  };

</script>


<style lang="less" scoped>

</style>
