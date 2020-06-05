<template>
  <VDialog v-model="dialog" width="500" persistent>
    <VCard class="pa-4">
      <Banner error :value="!valid" :text="$tr('bannerErrorMessage')" />
      <PrivacyPolicyText />
      <VForm ref="form" v-model="valid" lazy-validation @submit.prevent="submit" >
        <VCheckbox
          v-model="policyAccepted"
          :label="$tr('checkboxText')"
          v-if="requirePolicyAcceptance"
          :rules="rules"
          color="primary"
          required
        />
        <VCardActions>
          <VSpacer />
          <VBtn color="primary" type="submit">
            {{ buttonMessage }}
          </VBtn>
        </VCardActions>
      </VForm>
    </VCard>
  </VDialog>
</template>

<script>
import PrivacyPolicyText from 'shared/views/policies/PrivacyPolicyText';
import Checkbox from 'shared/views/form/Checkbox';
import Banner from 'shared/views/Banner';
export default {
  name: "PoliciesModal",
  components: {
    PrivacyPolicyText,
    Checkbox,
    Banner,
  },
  props: {
    value: {
      type: Boolean,
      default: false,
    },
    requirePolicyAcceptance: {
      type: Boolean,
      default: false,
    }
  },
  data() {
    return {
      policyAccepted: false,
      valid: true,
    }
  },
  computed: {
    dialog: {
      get() {
        return this.value;
      },
      set(value) {
        this.$emit("input", value);
      }
    },
    buttonMessage() {
      if (this.requirePolicyAcceptance) {
        return this.$tr('continueButton');
      } else {
        return this.$tr('closeButton');
      }
    },
    rules() {
      return [v => v || this.$tr('checkboxValidationErrorMessage') ];
    },
  },
  methods: {
    submit() {
      if (this.$refs.form.validate()) {
        this.dialog = false;
      }
    }
  },
  $trs: {
    closeButton: "Close",
    continueButton: "Continue",
    bannerErrorMessage: "Please accept the policy to continue",
    checkboxValidationErrorMessage: "This field is required",
    checkboxText: "I have agreed to the above terms"
  }
}
</script>

<style scoped lang="less">
  /deep/ .v-input__slot {
    margin-bottom: 4px !important;
    label {
      color: black !important;
    }
  }
</style>
