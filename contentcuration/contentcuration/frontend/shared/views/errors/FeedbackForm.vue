<template>

  <KModal
    v-if="dialog && isAdmin"
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

  <!-- TODO: Remove this once the feedback form is working on production and use above modal -->
  <KModal
    v-else-if="dialog"
    :title="$tr('header')"
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
    <iframe
      src="https://docs.google.com/forms/d/e/1FAIpQLSfG-612k2uS9iYIAXE8332QU9sc8v2STxYyd_DA84IEdjW1NA/viewform?embedded=true"
      width="440"
      height="450"
      frameborder="0"
      marginheight="0"
      marginwidth="0"
      style="margin: 0px -16px; border: 1px solid #ccc;"
    ></iframe>
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

  import { mapActions, mapState } from 'vuex';
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
      ...mapState({
        isAdmin: state => state.session.currentUser.is_admin,
      }),
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
        'Please share your experience with Kolibri Studio and any comments on how we can improve. If you are reporting an error, please describe your issue in as much detail as possible.',
      promptP2:
        'You can also search and post to the community forum to see if others encountered similar issues.',
      communityForumLink: 'Open community forum',
      feedbackLabel: 'Describe your feedback',
      submitAction: 'Submit',
      cancelAction: 'Cancel',
      feedbackFailed: 'Unable to submit feedback. Please try again.',

      // Submit modal
      submittedHeader: 'Thank you',
      closeAction: 'Close',
      submittedP1: 'Your feedback is essential for future iterations of Kolibri Studio.',
      submittedP2:
        'While we cannot respond to each individual comment, we consider all feedback as we strive to improve the user experience.',
      submittedP3: 'You are welcome to send us feedback anytime.',
    },
  };

</script>
