<template>

  <VFlex>
    <VLayout v-if="showMofN" class="mofn-options" row>
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
          :rules="mRules"
          @keypress="isIntegerInput($event)"
          @paste="isIntegerPaste($event)"
          @focus="$emit('mFocus')"
        />
      </VFlex>
      <VFlex xs1 justifyCenter class="out-of">
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
  } from '../../../shared/utils/validation';
  import MasteryModels from 'shared/leUtils/MasteryModels'; // MasteryModelsNames, // MasteryModelsList,
  import { constantsTranslationMixin } from 'shared/mixins';

  export default {
    name: 'MasteryCriteriaMofNFields',
    mixins: [constantsTranslationMixin],
    props: {
      value: {
        type: Object,
        required: false,
        validator: function(value) {
          return (
            !value ||
            !value.mastery_model ||
            !value.mastery_model.toString() ||
            MasteryModels.has(value.mastery_model)
          );
        },
      },
      showMofN: {
        type: Boolean,
        default: false,
      },
      readonly: {
        type: Boolean,
        default: false,
      },
      mRequired: {
        type: Boolean,
        default: true,
      },
      mPlaceholder: {
        type: String,
      },
      nRequired: {
        type: Boolean,
        default: true,
      },
      nPlaceholder: {
        type: String,
      },
    },
    computed: {
      mValue: {
        get() {
          return this.value && this.value.m;
        },
        set(value) {
          value = Number(value);
          // Make sure n is always greater than or equal to m
          this.handleInput(value > this.nValue ? { m: value, n: value } : { m: value });
        },
      },
      nValue: {
        get() {
          return this.value && this.value.n;
        },
        set(value) {
          value = Number(value);
          // Make sure m is always less than or equal to n
          this.handleInput(value < this.mValue ? { m: value, n: value } : { n: value });
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
      handleInput(newValue) {
        let data = {
          ...this.value,
          ...newValue,
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
          let num = Number(evt.clipboardData.getData('Text'));
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
    },
    $trs: {
      mHint: 'Correct answers needed',
      nHint: 'Recent answers',
    },
  };

</script>


<style lang="less" scoped>

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
        background-color: var(--v-greyBackground-base);
      }
      .mastery-label {
        padding-right: 15px;
        font-weight: bold;
      }
    }
  }
  /deep/ a {
    text-decoration: none !important;
    &:hover {
      color: var(--v-blue-darken-1);
    }
  }

  /deep/ .v-list__tile {
    width: 100%;
  }

</style>
