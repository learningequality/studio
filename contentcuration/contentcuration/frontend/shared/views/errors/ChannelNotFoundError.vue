<template>

  <StudioAppError>
    <template #header>
      {{ $tr('channelNotFoundHeader') }}
    </template>
    <template #details>
      {{ $tr('channelNotFoundDetails') }}
    </template>
    <template #actions>
      <KRouterLink
        v-bind="backHomeLink"
        appearance="raised-button"
        :primary="true"
        style="margin-top: 1rem"
      >
        {{ $tr('backToHomeAction') }}
      </KRouterLink>
    </template>
  </StudioAppError>

</template>


<script>

  import StudioAppError from './StudioAppError.vue';

  export default {
    name: 'ChannelNotFoundError',
    components: {
      StudioAppError,
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
