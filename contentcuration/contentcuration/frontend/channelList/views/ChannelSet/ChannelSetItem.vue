<template>

  <tr :to="channelSetDetailsLink">
    <td
      class="notranslate"
      dir="auto"
    >
      {{ channelSet.name }}
    </td>
    <td style="width: 224px">
      <CopyToken
        v-if="channelSet.secret_token"
        :token="channelSet.secret_token"
      />
      <!-- TODO: Remove this once syncNow is ready for use -->
      <em
        v-else
        class="grey--text"
      >{{ $tr('saving') }}</em>
    </td>
    <td class="text-xs-right">
      {{ $formatNumber(channelCount) }}
    </td>
    <td class="text-xs-right">
      <KButton
        :text="$tr('options')"
        appearance="flat-button"
        :hasDropdown="true"
      >
        <template #menu>
          <KDropdownMenu
            :options="dropdownOptions"
            :hasIcons="true"
            :constrainToScrollParent="false"
            @select="handleOptionSelect"
          />
        </template>
      </KButton>
      <KModal
        v-if="deleteDialog"
        :title="$tr('deleteChannelSetTitle')"
        :submitText="$tr('deleteChannelSetTitle')"
        :cancelText="$tr('cancel')"
        :appendToOverlay="true"
        @submit="handleDelete"
        @cancel="deleteDialog = false"
      >
        {{ $tr('deleteChannelSetText') }}
      </KModal>
    </td>
  </tr>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import { RouteNames } from '../../constants';
  import CopyToken from 'shared/views/CopyToken';

  export default {
    name: 'ChannelSetItem',
    components: {
      CopyToken,
    },
    props: {
      channelSetId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        deleteDialog: false,
      };
    },
    computed: {
      ...mapGetters('channelSet', ['getChannelSet']),
      channelSet() {
        return this.getChannelSet(this.channelSetId);
      },
      channelSetDetailsLink() {
        return {
          name: RouteNames.CHANNEL_SET_DETAILS,
          params: { channelSetId: this.channelSet.id },
        };
      },
      channelCount() {
        return this.channelSet && this.channelSet.channels
          ? this.channelSet.channels.filter(c => c).length
          : 0;
      },
      dropdownOptions() {
        return [
          {
            label: this.$tr('edit'),
            value: 'edit',
            icon: 'edit',
          },
          {
            label: this.$tr('delete'),
            value: 'delete',
            icon: 'trash',
          },
        ];
      },
    },
    methods: {
      ...mapActions('channelSet', ['deleteChannelSet']),
      handleOptionSelect(option) {
        if (option.value === 'edit') {
          this.$router.push(this.channelSetDetailsLink);
        } else if (option.value === 'delete') {
          this.deleteDialog = true;
        }
      },
      handleDelete() {
        this.deleteChannelSet(this.channelSet);
        this.deleteDialog = false;
      },
    },
    $trs: {
      deleteChannelSetTitle: 'Delete collection',
      deleteChannelSetText: 'Are you sure you want to delete this collection?',
      cancel: 'Cancel',
      edit: 'Edit collection',
      delete: 'Delete collection',
      options: 'Options',
      saving: 'Saving',
    },
  };

</script>


<style lang="scss" scoped>

  td {
    font-size: 12pt !important;
  }

</style>
