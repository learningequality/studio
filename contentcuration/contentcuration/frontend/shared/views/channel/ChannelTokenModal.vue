<template>

  <KModal
    v-if="dialog"
    :title="$tr('copyTitle')"
    :cancelText="$tr('close')"
    :appendToOverlay="appendToOverlay"
    @cancel="dialog = false"
  >
    <p>{{ $tr('copyTokenInstructions') }}</p>
    <StudioCopyToken :token="channel.primary_token" />
  </KModal>

</template>


<script>

  import StudioCopyToken from '../StudioCopyToken';

  export default {
    name: 'ChannelTokenModal',
    components: {
      StudioCopyToken,
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      appendToOverlay: {
        type: Boolean,
        default: false,
      },
      channel: {
        type: Object,
        required: false,
        default: null,
        validator(channel) {
          return (
            channel === null || Boolean(channel.id && channel.published && channel.primary_token)
          );
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
