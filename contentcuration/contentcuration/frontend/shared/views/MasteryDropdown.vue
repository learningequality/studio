<template>

  <VLayout grid wrap alignTop>
    <VFlex xs12 md5>
      <VSelect
        ref="masteryModel"
        v-model="masteryModel"
        :items="masteryCriteria"
        :label="$tr('labelText')"
        color="primary"
        box
        :placeholder="placeholder"
        :required="required"
        :readonly="readonly"
        :disabled="disabled"
        :rules="masteryRules"
        menu-props="offsetY"
        @focus="$emit('focus')"
      >
        <template #append-outer>
          <InfoModal :header="$tr('exerciseHeader')" :items="masteryCriteria">
            <p>{{ $tr('exerciseDescripiton') }}</p>
            <p>{{ $tr('masteryDescripiton') }}</p>
            <template #header="{ item }">
              {{ translateConstant(item.value) }}
            </template>
            <template #description="{ item }">
              {{ translateConstant(item.value + '_description') }}
            </template>
          </InfoModal>
        </template>
      </VSelect>
    </VFlex>
    <VFlex md1 />
    <VFlex v-if="showMofN" xs12 md5 class="mofn-options">
      <VLayout row>
        <VFlex xs5>
          <VTextField
            ref="mValue"
            v-model="mValue"
            type="number"
            singleLine
            box
            min="1"
            :required="mRequired"
            :placeholder="mPlaceholder"
            :readonly="readonly"
            :rules="mRules"
            :disabled="disabled"
            :hint="$tr('mHint')"
            persistentHint
            @keypress="isIntegerInput($event)"
            @paste="isIntegerPaste($event)"
            @focus="$emit('mFocus')"
          />
        </VFlex>
        <VFlex xs2 justifyCenter class="out-of">
          /
        </VFlex>
        <VFlex xs5>
          <VTextField
            ref="nValue"
            v-model="nValue"
            type="number"
            singleLine
            box
            min="1"
            :hint="$tr('nHint')"
            persistentHint
            :required="nRequired"
            :readonly="readonly"
            :placeholder="nPlaceholder"
            :rules="nRules"
            :disabled="disabled"
            @keypress="isIntegerInput($event)"
            @paste="isIntegerPaste($event)"
            @focus="$emit('nFocus')"
          />
        </VFlex>
      </VLayout>
    </VFlex>
  </VLayout>

</template>

<script>

  import {
    getMasteryModelValidators,
    getMasteryModelMValidators,
    getMasteryModelNValidators,
    translateValidator,
  } from '../utils/validation';
  import MasteryModels, {
    MasteryModelsList,
    MasteryModelsNames,
  } from 'shared/leUtils/MasteryModels';
  import InfoModal from 'shared/views/InfoModal.vue';
  import { constantsTranslationMixin } from 'shared/mixins';

  export default {
    name: 'MasteryDropdown',
    components: {
      InfoModal,
    },
    mixins: [constantsTranslationMixin],
    props: {
      value: {
        type: Object,
        required: false,
        validator: function(value) {
          return !value || !value.type || !value.type.toString() || MasteryModels.has(value.type);
        },
      },
      placeholder: {
        type: String,
      },
      required: {
        type: Boolean,
        default: true,
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
      masteryModel: {
        get() {
          return this.value && this.value.type;
        },
        set(type) {
          this.handleInput({ type });
        },
      },
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
      masteryCriteria() {
        return MasteryModelsList.map(model => ({
          text: this.translateConstant(model),
          value: model,
        }));
      },
      showMofN() {
        return this.masteryModel === MasteryModelsNames.M_OF_N;
      },
      masteryRules() {
        return this.required ? getMasteryModelValidators().map(translateValidator) : [];
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
      labelText: 'Mastery criteria',
      exerciseHeader: 'About exercises',
      exerciseDescripiton:
        'Exercises contain a set of interactive questions that a learner can engage with in Kolibri. Learners receive instant feedback for each answer (correct or incorrect). Kolibri will display available questions in an exercise until the learner achieves mastery.',
      masteryDescripiton:
        'Kolibri marks an exercise as "completed" when the mastery criteria is met. Here are the different types of mastery criteria for an exercise:',
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
    margin-top: 20px;
    font-size: 16pt;
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
