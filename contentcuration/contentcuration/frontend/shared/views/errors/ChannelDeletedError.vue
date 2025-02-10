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
        'This channel does not exist or may have been removed. Please contact us at content@learningequality.org if you think this is a mistake.',
      backToHomeAction: 'Back to home',
    },
  };

</script>


<style lang="scss" scoped></style>
