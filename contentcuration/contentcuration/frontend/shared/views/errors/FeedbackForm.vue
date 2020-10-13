<template>

  <KModal
    v-if="dialog"
    :title="$tr('header')"
    :submitText="$tr('submitAction')"
    :cancelText="$tr('cancelAction')"
    @submit="submit"
    @cancel="dialog = false"
  >
    <p>{{ $tr('promptP1') }}</p>
    <p>{{ $tr('promptP2') }}</p>
    <p>
      <ActionLink
        href="https://community.learningequality.org/c/support/studio"
        target="_blank"
        :text="$tr('communityForumLink')"
      />
    </p>
    <KTextbox
      v-model="feedback"
      :label="$tr('feedbackLabel')"
      textArea
      :invalid="errors.feedback"
      :showInvalidText="errors.feedback"
      :invalidText="$tr('fieldRequiredText')"
    />
  </KModal>
  <KModal
    v-else-if="!dialog && submitted"
    :title="$tr('submittedHeader')"
    :cancelText="$tr('closeAction')"
    @submit="submit"
    @cancel="dialog = false"
  >
    <p>{{ $tr('submittedP1') }}</p>
    <p>{{ $tr('submittedP2') }}</p>
    <p>{{ $tr('submittedP3') }}</p>
  </KModal>

</template>


<script>

  import { mapActions } from 'vuex';
  import { generateFormMixin } from 'shared/mixins';

  const formMixin = generateFormMixin({
    feedback: {
      required: true,
    },
  });

  export default {
    name: 'FeedbackForm',
    mixins: [formMixin],
    props: {
      value: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        submitted: false,
      };
    },
    computed: {
      dialog: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
          this.resetValidation();
        },
      },
    },
    methods: {
      ...mapActions('errors', ['submitFeedback']),

      // eslint-disable-next-line kolibri/vue-no-unused-methods
      onSubmit() {
        this.submitFeedback(this.form.feedback)
          .then(() => {
            this.dialog = false;
            this.submitted = true;
            this.reset();
          })
          .catch(() => {
            this.$store.dispatch('showSnackbar', { text: this.$tr('feedbackFailed') });
          });
      },
    },
    $trs: {
      header: 'Give feedback',
      fieldRequiredText: 'Field is required',
      promptP1:
        'Please share your experiences with Kolibri Studio and any comments on how we can improve. If you are reporting an error, please describe your issue in as much detail as possible.',
      promptP2:
        'You can also search and post to the community forum to see if others encountered similar issues.',
      communityForumLink: 'Open community forum',
      feedbackLabel: 'Describe your feedback',
      submitAction: 'Submit',
      cancelAction: 'Cancel',
      feedbackFailed: 'Unable to submit feedback. Please try again.',

      // Submit modal
      submittedHeader: 'Thank you for your feedback',
      closeAction: 'Close',
      submittedP1: 'Your opinions are very important in helping us improve Kolibri Studio. ',
      submittedP2:
        'Although we cannot respond to your comments individually, we will consider them as we strive to improve your experience.',
      submittedP3: 'You can send us more feedback anytime.',
    },
  };

</script>
