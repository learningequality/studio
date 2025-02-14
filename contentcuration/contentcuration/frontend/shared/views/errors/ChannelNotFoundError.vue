<template>

  <AppError>
    <template #header>
      {{ $tr('channelNotFoundHeader') }}
    </template>
    <template #details>
      {{ $tr('channelNotFoundDetails') }}
    </template>
    <template #actions>
      <VBtn v-bind="backHomeLink" color="primary">
        {{ $tr('backToHomeAction') }}
      </VBtn>
    </template>
  </AppError>

</template>


<script>

  import AppError from './AppError';

  export default {
    name: 'ChannelNotFoundError',
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
      channelNotFoundHeader: 'Channel not found',
      channelNotFoundDetails:
        'This channel does not exist or may have been removed. Please contact us at content@learningequality.org if you think this is a mistake.',
      backToHomeAction: 'Back to home',
    },
  };

</script>


<style lang="scss" scoped></style>
