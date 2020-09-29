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
    },
    $trs: {
      channelDeletedHeader: 'Channel not found',
      channelDeletedDetails:
        'This channel may have been removed. If this was a mistake, please contact us at content@learningequality.org',
      backToHomeAction: 'Back to home',
    },
  };

</script>


<style lang="less" scoped></style>
