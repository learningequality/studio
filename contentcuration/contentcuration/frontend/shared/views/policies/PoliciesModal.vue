<template>

  <KModal
    size="large"
    :title="title"
  >
    <p class="body-1 mt-2">
      {{ $tr('lastUpdated', { date: $formatDate(date) }) }}
    </p>

    <slot></slot>

    <template slot="actions">
      <VForm
        v-if="needsAcceptance"
        ref="form"
        lazy-validation
        data-test="accept-form"
        @submit.prevent="onPolicyAccept"
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
              data-test="accept-checkbox"
            />
          </KGridItem>
          <KGridItem :layout="{ span: 1 }">
            <KButton
              :text="$tr('continueButton')"
              :primary="true"
              :style="{ 'display': 'block', 'margin-left': 'auto' }"
              data-test="continue-button"
              type="submit"
            />
          </KGridItem>
        </KFixedGrid>
      </VForm>

      <KButton
        v-else
        :text="$tr('closeButton')"
        data-test="close-button"
        @click="onPolicyClose"
      />
    </template>
  </KModal>

</template>

<script>

  import Checkbox from 'shared/views/form/Checkbox';
  import { policies, policyDates } from 'shared/constants';

  export default {
    name: 'PoliciesModal',
    components: {
      Checkbox,
    },
    props: {
      /**
       * A policy constant
       * - policies.TERMS_OF_SERVICE
       * - policies.PRIVACY
       * - policies.COMMUNITY_STANDARDS
       */
      policy: {
        type: String,
        required: true,
        validator(p) {
          return Object.values(policies).includes(p);
        },
      },
      /**
       * A policy title
       */
      title: {
        type: String,
        required: true,
      },
      /**
       * Accept checkbox will be displayed
       * and it won't be possible to close
       * the modal until a policy is accepted
       */
      needsAcceptance: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        policyAccepted: false,
      };
    },
    computed: {
      date() {
        return policyDates[this.policy];
      },
      rules() {
        return [v => v || this.$tr('checkboxValidationErrorMessage')];
      },
    },
    methods: {
      onPolicyClose() {
        this.$emit('close');
      },
      onPolicyAccept() {
        if (this.$refs.form.validate()) {
          this.$emit('accept');
        }
      },
    },
    $trs: {
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
