<template>

  <VFlex>
    <VLayout
      v-if="showMofN"
      class="mofn-options"
      row
    >
      <VFlex xs6>
        <VTextField
          ref="mValue"
          v-model="mValue"
          type="number"
          box
          min="1"
          :label="$tr('mHint')"
          :required="mRequired"
          :placeholder="mPlaceholder"
          :readonly="readonly"
          :disabled="disabled"
          :rules="mRules"
          @keypress="isIntegerInput($event)"
          @paste="isIntegerPaste($event)"
          @focus="$emit('mFocus')"
        />
      </VFlex>
      <VFlex
        xs1
        justifyCenter
        class="out-of"
      >
        /
      </VFlex>
      <VFlex xs6>
        <VTextField
          ref="nValue"
          v-model="nValue"
          type="number"
          box
          min="1"
          :label="$tr('nHint')"
          :required="nRequired"
          :readonly="readonly"
          :placeholder="nPlaceholder"
          :disabled="disabled"
          :rules="nRules"
          @keypress="isIntegerInput($event)"
          @paste="isIntegerPaste($event)"
          @focus="$emit('nFocus')"
        />
      </VFlex>
    </VLayout>
  </VFlex>

</template>


<script>

  import {
    getMasteryModelMValidators,
    getMasteryModelNValidators,
    translateValidator,
    getInvalidText,
  } from 'shared/utils/validation';
  import MasteryModels from 'shared/leUtils/MasteryModels';
  import { constantsTranslationMixin } from 'shared/mixins';

  export default {
    name: 'MasteryCriteriaMofNFields',
    mixins: [constantsTranslationMixin],
    props: {
      value: {
        type: Object,
        required: false,
        validator: function (value) {
          return (
            !value ||
            !value.mastery_model ||
            !value.mastery_model.toString() ||
            MasteryModels.has(value.mastery_model)
          );
        },
        default: null,
      },
      showMofN: {
        type: Boolean,
        default: false,
      },
      readonly: {
        type: Boolean,
        default: false,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      mRequired: {
        type: Boolean,
        default: true,
      },
      mPlaceholder: {
        type: String,
        default: '',
      },
      nRequired: {
        type: Boolean,
        default: true,
      },
      nPlaceholder: {
        type: String,
        default: '',
      },
    },
    computed: {
      mValue: {
        get() {
          return this.value && this.value.m;
        },
        set(value) {
          this.handleInput({ m: Number(value) });
        },
      },
      nValue: {
        get() {
          return this.value && this.value.n;
        },
        set(value) {
          this.handleInput({ n: Number(value) });
        },
      },
      mRules() {
        return this.mRequired
          ? getMasteryModelMValidators(this.nValue).map(translateValidator)
          : [];
      },
      nRules() {
        return this.nRequired ? getMasteryModelNValidators().map(translateValidator) : [];
      },
    },
    methods: {
      handleInput(update) {
        // Don't emit input events unless we're sure we should
        if (!this.showMofN) {
          return;
        }

        const data = {
          ...this.value,
          ...update,
        };
        this.$emit('input', data);
      },
      isIntegerInput(evt) {
        evt = evt ? evt : window.event;
        var charCode = evt.which ? evt.which : evt.keyCode;
        if (charCode > 31 && (charCode < 48 || charCode > 57) && charCode === 46) {
          evt.preventDefault();
        } else {
          return true;
        }
      },
      isIntegerPaste(evt) {
        try {
          const num = Number(evt.clipboardData.getData('Text'));
          if (Number.isInteger(num) && num >= 0) {
            return true;
          } else {
            evt.preventDefault();
            return false;
          }
        } catch (_) {
          evt.preventDefault();
          return false;
        }
      },
      /**
       * @public
       */
      validate() {
        let error;
        if (this.$refs.mValue || this.$refs.nValue) {
          this.$refs.mValue.validate(true);
          this.$refs.nValue.validate(true);
        }
        if (this.mRules && this.mRules.length) {
          error = getInvalidText(this.mRules, this.mValue);
        }
        if (this.nRules && this.nRules.length) {
          error = error || getInvalidText(this.nRules, this.nValue);
        }
        return error;
      },
    },
    $trs: {
      mHint: 'Correct answers needed',
      nHint: 'Recent answers',
    },
  };

</script>


<style lang="scss" scoped>

  .v-autocomplete {
    display: inline-block;
    width: 150px;
  }

  .mastery-field {
    width: 50px;
  }

  .out-of {
    padding-top: 20px;
    font-size: 18pt;
    color: var(--v-grey-darken1);
    text-align: center;
  }

  .mastery-table {
    padding: 15px;

    .mastery-row {
      padding: 5px;

      &:nth-child(odd) {
        /* stylelint-disable-next-line custom-property-pattern */
        background-color: var(--v-greyBackground-base);
      }

      .mastery-label {
        padding-right: 15px;
        font-weight: bold;
      }
    }
  }

  ::v-deep a {
    text-decoration: none !important;

    &:hover {
      color: var(--v-blue-darken-1);
    }
  }

  ::v-deep .v-list__tile {
    width: 100%;
  }

</style>
