<template>

  <div v-if="showPolicy === policy">
    <KModal
      v-if="requirePolicyAcceptance"
      size="large"
      data-test="policies-modal-required"
      :title="updatedPolicyTitle"
    >
      <p class="body-1 mt-2">
        {{ $tr('lastUpdated', { date: $formatDate(date) }) }}
      </p>
      <slot></slot>

      <template slot="actions">
        <VForm
          ref="form"
          lazy-validation
          data-test="accept-policy-form"
          @submit.prevent="onPolicyAcceptance"
        >
          <KFixedGrid :numCols="2">
            <KGridItem :layout="{ span: 1 }">
              <Checkbox
                v-model="policyAccepted"
                :label="$tr('checkboxText')"
                :rules="rules"
                required
                :hide-details="false"
                class="mt-0"
                data-test="accept-policy-checkbox"
              />
            </KGridItem>
            <KGridItem :layout="{ span: 1 }">
              <KButton
                :text="$tr('continueButton')"
                :primary="true"
                :style="{ 'display': 'block', 'margin-left': 'auto' }"
                type="submit"
              />
            </KGridItem>
          </KFixedGrid>
        </VForm>
      </template>
    </KModal>

    <KModal
      v-else
      size="large"
      data-test="policies-modal"
      :title="policyTitle"
      :cancelText="$tr('closeButton')"
      @cancel="onPolicyClose"
    >
      <p class="body-1 mt-2">
        {{ $tr('lastUpdated', { date: $formatDate(date) }) }}
      </p>
      <slot></slot>
    </KModal>
  </div>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import Checkbox from 'shared/views/form/Checkbox';
  import { policies, policyDates } from 'shared/constants';

  export default {
    name: 'PoliciesModal',
    components: {
      Checkbox,
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
      policyTitle() {
        switch (this.policy) {
          case policies.TERMS_OF_SERVICE:
            return this.$tr('ToSHeader');
          case policies.PRIVACY:
            return this.$tr('privacyHeader');
          case policies.COMMUNITY_STANDARDS:
            return this.$tr('communityStandardsHeader');
          default:
            return '';
        }
      },
      updatedPolicyTitle() {
        switch (this.policy) {
          case policies.TERMS_OF_SERVICE:
            return this.$tr('updatedToSHeader');
          case policies.PRIVACY:
            return this.$tr('updatedPrivacyHeader');
          case policies.COMMUNITY_STANDARDS:
            return this.$tr('communityStandardsHeader');
          default:
            return '';
        }
      },
      date() {
        return policyDates[this.policy];
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
      onPolicyClose() {
        this.closePolicy(this.policy);
      },
      onPolicyAcceptance() {
        if (this.$refs.form.validate()) {
          // Submit policy acceptance
          const policyData = this.getPolicyAcceptedData(this.policy);
          this.acceptPolicy(policyData);
        }
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
