<template>

  <KModal
    :title="$tr('reportErrorHeader')"
    :cancelText="$tr('closeAction')"
    class="error-detail-modal"
    size="large"
    @cancel="$emit('cancel')"
  >

    <section>
      <h3 v-if="offline">
        {{ $tr('forumPrompt') }}
      </h3>
      <p>{{ $tr('forumUseTips') }}</p>
      <p>{{ $tr('forumPostingTips') }}</p>
      <KExternalLink
        class="download-as-text-link"
        :text="forumLink"
        :href="forumLink"
      />
    </section>

    <!-- only when offline -->
    <section v-if="offline">
      <h3>{{ $tr('emailPrompt') }}</h3>
      <p>{{ $tr('emailDescription') }}</p>
      <!-- email link goes here. TODO Probably not an href? -->
      <KExternalLink
        :text="emailAddress"
        :href="emailAddressLink"
      />
    </section>

    <h3>
      {{ $tr('errorDetailsHeader') }}
    </h3>
    <TechnicalTextBlock
      :text="error"
      :maxHeight="240"
    />

  </KModal>

</template>


<script>

  import TechnicalTextBlock from './TechnicalTextBlock';

  export default {
    name: 'ReportErrorModal',
    components: {
      TechnicalTextBlock,
    },
    props: {
      error: {
        type: [String, Object],
        required: true,
      },
    },
    data() {
      return {
        // TODO Set offline variable via ping in mounted()?
        // Or via computed prop
        offline: false,
      };
    },
    computed: {
      forumLink() {
        return 'https://community.learningequality.org/c/support/studio';
      },
      emailAddress() {
        return 'info@learningequality.org';
      },
      emailAddressLink() {
        return `mailto:${this.emailAddress}`;
      },
    },
    $trs: {
      reportErrorHeader: 'Report Error',
      forumPrompt: 'Visit the community forums',
      forumUseTips:
        'Search the community forum to see if others encountered similar issues. If there are none reported, please open a new forum post and paste the error details below inside so we can rectify the error in a future version of Kolibri Studio.',
      forumPostingTips:
        'Include a description of what you were trying to do and what you clicked on when the error appeared.',
      emailPrompt: 'Send an email to the developers',
      emailDescription:
        'Contact the support team with your error details and we’ll do our best to help.',
      errorDetailsHeader: 'Error details',
      closeAction: 'Close',
    },
  };

</script>


<style lang="scss" scoped>

  .error-detail-modal {
    text-align: left;
  }

</style>
