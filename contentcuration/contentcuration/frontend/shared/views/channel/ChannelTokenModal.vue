<template>

  <KModal
    v-if="dialog"
    :title="$tr('copyTitle')"
    :cancelText="$tr('close')"
    @cancel="dialog = false"
  >
    <p>{{ $tr('copyTokenInstructions') }}</p>
    <CopyToken
      :token="channel.primary_token"
      @copied="$emit('copied')"
    />
  </KModal>

</template>


<script>

  import CopyToken from '../CopyToken';

  export default {
    name: 'ChannelTokenModal',
    components: {
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
      copyTokenInstructions: 'Paste this token into Kolibri to import this channel',
      close: 'Close',
    },
  };

</script>


<style lang="scss" scoped></style>
