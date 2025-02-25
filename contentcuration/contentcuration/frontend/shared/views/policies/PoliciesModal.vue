<template>

  <KModal
    size="large"
    :title="title"
  >
    <p class="body-1 mt-2">
      {{ $tr('lastUpdated', { date: $formatDate(date) }) }}
    </p>

    <slot></slot>

    <template #actions>
      <template v-if="needsAcceptance">
        <KFixedGrid :numCols="2">
          <KGridItem :layout="{ span: 1 }">
            <KCheckbox
              :label="$tr('checkboxText')"
              :checked="policyAccepted"
              data-test="accept-checkbox"
              @change="togglePolicyAccepted"
            />
          </KGridItem>
          <KGridItem :layout="{ span: 1 }">
            <KButton
              :text="$tr('continueButton')"
              :primary="true"
              :style="{ display: 'block', 'margin-left': 'auto' }"
              :disabled="!policyAccepted"
              data-test="continue-button"
              @click="onPolicyAccept"
            />
          </KGridItem>
        </KFixedGrid>
      </template>

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

  import { policies, policyDates } from 'shared/constants';

  export default {
    name: 'PoliciesModal',
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
    },
    methods: {
      togglePolicyAccepted() {
        this.policyAccepted = !this.policyAccepted;
        this.validate();
      },
      onPolicyClose() {
        this.$emit('close');
      },
      validate() {
        return this.policyAccepted;
      },
      onPolicyAccept() {
        if (this.validate()) {
          this.$emit('accept');
        }
      },
    },
    $trs: {
      lastUpdated: 'Last updated {date}',
      closeButton: 'Close',
      continueButton: 'Continue',
      checkboxText: 'I have agreed to the above terms',
    },
  };

</script>
