<template>

  <ResponsiveDialog
    :value="showPolicy === policy"
    width="600"
    :persistent="requirePolicyAcceptance"
    :header="header"
    :closeButtonLabel="buttonMessage"
    :close="submit"
    @input="closePolicy(policy)"
  >
    <p class="body-1 mt-2">
      {{ $tr('lastUpdated', { date: $formatDate(date) }) }}
    </p>
    <slot></slot>

    <template v-if="requirePolicyAcceptance" #action>
      <VForm
        ref="form"
        lazy-validation
        @submit.prevent="submit"
      >
        <Checkbox
          v-model="policyAccepted"
          :label="$tr('checkboxText')"
          :rules="rules"
          required
          :hide-details="false"
          class="mt-0"
          data-test="accept"
        />
      </VForm>
    </template>
  </ResponsiveDialog>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import Checkbox from 'shared/views/form/Checkbox';
  import ResponsiveDialog from 'shared/views/ResponsiveDialog';
  import { policies, policyDates } from 'shared/constants';

  export default {
    name: 'PoliciesModal',
    components: {
      Checkbox,
      ResponsiveDialog,
    },
    props: {
      ignoreAcceptance: {
        type: Boolean,
        default: false,
      },
      policy: {
        type: String,
        required: true,
        validator(p) {
          return Object.values(policies).includes(p);
        },
      },
    },
    data() {
      return {
        policyAccepted: false,
      };
    },
    computed: {
      ...mapGetters('policies', ['getPolicyAcceptedData', 'isPolicyUnaccepted', 'showPolicy']),
      header() {
        if (this.policy === policies.TERMS_OF_SERVICE) {
          return this.requirePolicyAcceptance
            ? this.$tr('updatedToSHeader')
            : this.$tr('ToSHeader');
        } else if (this.policy === policies.PRIVACY) {
          return this.requirePolicyAcceptance
            ? this.$tr('updatedPrivacyHeader')
            : this.$tr('privacyHeader');
        } else if (this.policy === policies.COMMUNITY_STANDARDS) {
          return this.$tr('communityStandardsHeader');
        }
        return '';
      },
      date() {
        return policyDates[this.policy];
      },
      buttonMessage() {
        if (this.requirePolicyAcceptance) {
          return this.$tr('continueButton');
        } else {
          return this.$tr('closeButton');
        }
      },
      rules() {
        return [v => v || this.$tr('checkboxValidationErrorMessage')];
      },
      requirePolicyAcceptance() {
        return !this.ignoreAcceptance && this.isPolicyUnaccepted(this.policy);
      },
    },
    methods: {
      ...mapActions('policies', ['acceptPolicy', 'closePolicy']),
      submit() {
        if (this.requirePolicyAcceptance) {
          if (this.$refs.form.validate()) {
            // Submit policy acceptance
            const policyData = this.getPolicyAcceptedData(this.policy);
            this.acceptPolicy(policyData);
          }
        } else {
          this.closePolicy(this.policy);
        }
        return Promise.resolve();
      },
    },
    $trs: {
      // Policy titles
      ToSHeader: 'Terms of Service',
      updatedToSHeader: 'Updated terms of service',
      privacyHeader: 'Privacy policy',
      updatedPrivacyHeader: 'Updated privacy policy',
      communityStandardsHeader: 'Community Standards',

      lastUpdated: 'Last updated {date}',
      closeButton: 'Close',
      continueButton: 'Continue',
      checkboxValidationErrorMessage: 'Field is required',
      checkboxText: 'I have agreed to the above terms',
    },
  };

</script>

<style scoped lang="less">

  /deep/ .v-input__slot {
    margin-bottom: 4px !important;
    label {
      color: black !important;
    }
  }

</style>
