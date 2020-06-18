<template>

  <div>
    <ChannelTableHeader
      :selected="selected"
      :totalItems="totalItems"
      :pagination="syncPagination"
    />
    <div id="data-table" :class="whilePinnedClass">
      <VDataTable
        v-model="selected"
        :headers="referenceColumns"
        class="reference-columns"
        :pagination.sync="syncPagination"
        :total-items="totalItems"
        :rows-per-page-items="syncPagination.rowsPerPageItems"
        :items="channels"
        no-data-text=""
        select-all
        hide-actions
      >
        <template v-slot:items="channels">
          <tr :class="classList(channels.item)">
            <td>
              <VCheckbox
                v-model="channels.selected"
                primary
                hide-details
              />
            </td>
            <td class="reference show-while-pinned">
              <VAvatar v-if="channels.item.published" size="6" color="#30E02C" />
              <RouterLink :to="channelLink(channels.item)">
                {{ channels.item.name }}
              </RouterLink>
            </td>
          </tr>
        </template>
      </VDataTable>
      <VDataTable
        v-model="selected"
        :headers="mainColumns"
        class="main-columns"
        :items="channels"
        :pagination.sync="syncPagination"
        :rows-per-page-items="syncPagination.rowsPerPageItems"
        :total-items="totalItems"
      >
        <template v-slot:items="channels">
          <tr :class="classList(channels.item)">
            <td class="reference hide-while-pinned">
              <VAvatar v-if="channels.item.published" size="6" color="#30E02C" />
              <RouterLink :to="channelLink(channels.item)">
                {{ channels.item.name }}
              </RouterLink>
            </td>
            <td>
              <ClipboardChip
                :value="channels.item.primary_token"
                :successMessage="$tr('idCopiedToClipboard')"
              />
            </td>
            <td>
              <ClipboardChip
                :value="channels.item.id"
                :successMessage="$tr('idCopiedToClipboard')"
              />
            </td>
            <td>{{ channels.item.resource_count }}</td>
            <td>
              {{ channels.item.editors_count }}
              <VBtn
                icon
                small
                :to="searchChannelEditorsLink(channels.item)"
                target="_blank"
              >
                <VIcon
                  small
                  color="black"
                >
                  open_in_new
                </VIcon>
              </VBtn>
            </td>
            <td>{{ channels.item.viewers_count }}</td>
            <td>{{ channels.item.priority }}</td>
            <td>
              {{ $formatDate(channels.item.created, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }) }}
            </td>
            <td>
              {{ $formatDate(channels.item.modified, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }) }}
            </td>
            <td>
              <ChannelActionsDropdown :channel="channels.item" />
            </td>
          </tr>
        </template>
      </VDataTable>
    </div>
  </div>

</template>


<script>

  import { pick } from 'lodash';
  import { mapGetters, mapActions } from 'vuex';
  import tableMixin from '../../tableMixin';
  import { paginationFromRoute } from '../../router';
  import ClipboardChip from '../../components/ClipboardChip';
  import ChannelTableHeader from './ChannelTableHeader';
  import ChannelActionsDropdown from './ChannelActionsDropdown';

  export default {
    name: 'ChannelTable',
    components: {
      ChannelActionsDropdown,
      ChannelTableHeader,
      ClipboardChip,
    },
    mixins: [tableMixin],
    data() {
      return {
        selected: [],
        // eslint-disable-next-line kolibri/vue-no-unused-properties
        pagination: paginationFromRoute(this.$router.currentRoute),
        // eslint-disable-next-line kolibri/vue-no-unused-properties
        headers: [
          {
            text: 'Channel name',
            align: 'left',
            value: 'name',
          },

          { text: 'Token ID', value: 'primary_token', sortable: false },
          // { text: 'Organization', value: 'organization' }, // To-do
          { text: 'Channel ID', value: 'id' },
          { text: 'Size', value: 'resource_count' },
          { text: 'Editors', value: 'editors_count' },
          { text: 'Viewers', value: 'viewers_count' },
          { text: 'Priority', value: 'priority' },
          { text: 'Date created', value: 'created' },
          { text: 'Last updated', value: 'modified' },
          // { text: 'Last Active', value: 'last_active' }, // To-do
          { text: '', sortable: false },
        ],
      };
    },
    computed: {
      ...mapGetters('channelTable', ['channels', 'totalItems']),
    },
    methods: {
      // eslint-disable-next-line kolibri/vue-no-unused-vuex-methods
      ...mapActions('channelTable', ['fetch']),
      classList(item) {
        return pick(item, ['deleted', 'public', 'published']);
      },
    },
    $trs: {
      idCopiedToClipboard: 'ID copied to clipboard',
    },
  };

</script>

<style lang="less" scoped>

  tr.deleted {
    td,
    a {
      color: red;
    }
  }

</style>
