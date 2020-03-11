<template>

  <PrimaryDialog v-model="dialog" :title="$tr('copyTitle')" lazy>
    <div class="mb-4">
      <label class="grey--text">{{ $tr('token') }}</label>
      <CopyToken :token="channel.primary_token" />
      <p style="margin: 48px 0px 16px;" class="subheading">
        {{ $tr('tokenText') }}
      </p>
      <label class="grey--text">{{ $tr('channelId') }}</label>
      <CopyToken :token="channel.id" :hyphenate="false" />
    </div>
    <template v-slot:actions>
      <VSpacer />
      <VBtn flat @click="dialog=false">
        {{ $tr('close') }}
      </VBtn>
    </template>
  </PrimaryDialog>

</template>

<script>

  import PrimaryDialog from '../PrimaryDialog';
  import CopyToken from '../CopyToken';

  export default {
    name: 'ChannelTokenModal',
    components: {
      PrimaryDialog,
      CopyToken,
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      channel: {
        type: Object,
        required: true,
        validator(channel) {
          return channel.id && channel.published && channel.primary_token;
        },
      },
    },
    computed: {
      dialog: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
    },
    $trs: {
      copyTitle: 'Copy channel token',
      token: 'Channel token',
      tokenText: 'For Kolibri versions 0.6.0 and below',
      channelId: 'Channel ID',
      close: 'Close',
    },
  };

</script>

<style lang="less" scoped>

</style>
