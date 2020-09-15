<template>

  <ResponsiveDialog
    v-model="dialog"
    width="600"
    :persistent="requirePolicyAcceptance"
    :header="header"
    :closeButtonLabel="buttonMessage"
    :close="submit"
  >
    <Banner error :value="!valid" :text="$tr('bannerErrorMessage')" />
    <slot></slot>
    <VForm
      v-if="requirePolicyAcceptance"
      ref="form"
      v-model="valid"
      lazy-validation
      @submit.prevent="submit"
    >
      <Checkbox
        v-model="policyAccepted"
        :label="$tr('checkboxText')"
        :rules="rules"
        required
      />
    </VForm>
  </ResponsiveDialog>

</template>

<script>

  import Checkbox from 'shared/views/form/Checkbox';
  import Banner from 'shared/views/Banner';
  import ResponsiveDialog from 'shared/views/ResponsiveDialog';

  export default {
    name: 'PoliciesModal',
    components: {
      Checkbox,
      Banner,
      ResponsiveDialog,
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      header: {
        type: String,
        required: true,
      },
      requirePolicyAcceptance: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        policyAccepted: false,
        valid: true,
      };
    },
    computed: {
      dialog: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
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
    },
    methods: {
      submit() {
        if (!this.requirePolicyAcceptance || this.$refs.form.validate()) {
          this.dialog = false;
        }
      },
    },
    $trs: {
      closeButton: 'Close',
      continueButton: 'Continue',
      bannerErrorMessage: 'Please accept the policy to continue',
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
