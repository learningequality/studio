<template>

  <KModal
    v-if="dialog"
    :title="$tr('reportIssueHeader')"
    :submitText="$tr('submitAction')"
    :cancelText="$tr('cancelAction')"
    @submit="submit"
    @cancel="dialog = false"
  >
    <Banner
      :value="Boolean(errorCount())"
      error
      :text="errorText()"
      class="mb-2"
    />
    <KTextbox
      v-model="operating_system"
      :label="$tr('OSLabel')"
      :invalid="errors.operating_system"
      :invalidText="$tr('fieldRequiredText')"
    />
    <KTextbox
      v-model="browser"
      :label="$tr('browserLabel')"
      :invalid="errors.browser"
      :invalidText="$tr('fieldRequiredText')"
    />
    <KTextbox
      v-model="channel"
      :label="$tr('channelLabel')"
      :invalid="errors.channel"
      :invalidText="$tr('fieldRequiredText')"
    />
    <KTextbox
      v-model="description"
      :label="$tr('descriptionLabel')"
      textArea
      :invalid="errors.description"
      :invalidText="$tr('fieldRequiredText')"
    />
  </KModal>

</template>


<script>

  import { mapActions } from 'vuex';
  import { generateFormMixin } from '../mixins';
  import Banner from 'shared/views/Banner';

  const formMixin = generateFormMixin({
    operating_system: {
      required: true,
    },
    browser: {
      required: true,
    },
    channel: {
      required: false,
    },
    description: {
      required: true,
    },
  });

  export default {
    name: 'ReportIssueForm',
    components: {
      Banner,
    },
    mixins: [formMixin],
    props: {
      value: {
        type: Boolean,
        default: false,
      },
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
      ...mapActions('settings', ['reportIssue']),

      // eslint-disable-next-line kolibri/vue-no-unused-methods
      onSubmit() {
        this.reportIssue(this.form)
          .then(() => {
            this.$store.dispatch('showSnackbar', { text: this.$tr('issueSubmitted') });
            this.dialog = false;
            this.reset();
          })
          .catch(() => {
            this.$store.dispatch('showSnackbar', { text: this.$tr('issueFailed') });
          });
      },
    },
    $trs: {
      reportIssueHeader: 'Report an issue',
      fieldRequiredText: 'Field is required',
      OSLabel: 'Operating system (e.g. Windows, MacOS, Linux)',
      browserLabel: 'Browser (e.g. Chrome, Firefox, Safari)',
      channelLabel: 'Channel you discovered the issue in (if applicable)',
      descriptionLabel: 'Describe your issue with as much detail as possible',
      submitAction: 'Submit',
      cancelAction: 'Cancel',
      issueSubmitted: 'Issue submitted',
      issueFailed: 'Unable to submit issue. Please try again.',
    },
  };

</script>
