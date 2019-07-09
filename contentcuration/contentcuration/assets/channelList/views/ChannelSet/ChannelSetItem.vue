<template>
  <div
    class="channel-set-item"
    :title="channelSet.name"
    :class="{optionHighlighted: optionHighlighted}"
  >
    <div class="channel-container-wrapper" @click="open">
      <div class="profile">
        <span class="material-icons">
          storage
        </span>
      </div>
      <div>
        <div class="channel-options-wrapper">
          <div class="channel-metadata">
            <div>{{ $tr('channelCount', {'count': channelSet.channels.length}) }}</div>
            <CopyToken
              :token="channelSet.secret_token.display_token"
            />
          </div>
          <VBtn
            flat
            icon
            color="red"
            :title="$tr('deleteChannelSetTitle')"
            @click.stop="deleteDialog=true"
          >
            <VIcon>delete</VIcon>
          </VBtn>
        </div>
        <h4 dir="auto">
          {{ channelSet.name }}
        </h4>
        <p class="description" dir="auto">
          {{ channelSet.description }}
        </p>
      </div>
    </div>
    <PrimaryDialog v-model="deleteDialog" :title="$tr('deleteChannelSetTitle')">
      {{ $tr('deleteChannelSetText') }}
      <template v-slot:actions>
        <VBtn
          @click="deleteDialog=false"
        >
          {{ $tr('cancel') }}
        </VBtn>
        <VBtn
          @click="deleteChannelSet(channelSet.id)"
        >
          {{ $tr('deleteChannelSetTitle') }}
        </VBtn>
      </template>
    </PrimaryDialog>
  </div>
</template>

<script>

  import { mapActions } from 'vuex';
  import ChannelSetModal from './ChannelSetModal';
  import CopyToken from 'edit_channel/sharedComponents/CopyToken.vue';
  import PrimaryDialog from 'shared/views/PrimaryDialog';
  import { RouterNames } from '../../constants';

  export default {
    name: 'ChannelSetItem',
    $trs: {
      deleteChannelSetTitle: 'Delete Collection',
      deleteChannelSetText: 'Are you sure you want to PERMANENTLY delete this channel collection?',
      channelCount: '{count, plural,\n =1 {# Channel}\n other {# Channels}}',
      cancel: 'Cancel',
    },
    components: {
      CopyToken,
      ChannelSetModal,
      PrimaryDialog,
    },
    props: {
      channelSet: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        optionHighlighted: false,
        editDialog: false,
        deleteDialog: false,
      };
    },
    methods: {
      ...mapActions('channelSet', ['deleteChannelSet']),
      open() {
        this.$router.push({ name: RouterNames.CHANNEL_SET_DETAILS, params: {channelSetId: this.channelSet.id }});
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../../static/less/channel_list.less';

  .channel-container-wrapper {
    min-height: 150px;
  }

  .channel-set-item {
    &:hover:not(.optionHighlighted) {
      h4 {
        color: @blue-500;
      }
      .channel-container-wrapper {
        border-color: @blue-500;
      }
    }
  }

</style>
