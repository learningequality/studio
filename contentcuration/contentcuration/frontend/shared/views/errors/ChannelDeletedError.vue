<template>

  <AppError>
    <template #header>
      {{ $tr('channelDeletedHeader') }}
    </template>
    <template #details>
      {{ $tr('channelDeletedDetails') }}
    </template>
    <template #actions>
      <VBtn v-bind="backHomeLink">
        {{ $tr('backToHomeAction') }}
      </VBtn>
      <VBtn v-bind="restoreChannelLink" color="primary">
        {{ $tr('restoreChannelAction') }}
      </VBtn>
    </template>
  </AppError>

</template>


<script>

  import AppError from './AppError';

  export default {
    name: 'ChannelDeletedError',
    components: {
      AppError,
    },
    props: {
      backHomeLink: {
        type: Object,
        required: true,
      },
      restoreChannelLink: {
        type: Object,
        required: true,
      },
    },
    $trs: {
      channelDeletedHeader: 'Channel not found',
      channelDeletedDetails:
        'This channel may have been removed by another administrator. If this was a mistake, you can undo this action in the adminstration page.',
      backToHomeAction: 'Back to home',
      restoreChannelAction: 'Restore channel',
    },
  };

</script>


<style lang="less" scoped></style>
