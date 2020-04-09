<template>

  <VLayout grid wrap alignTop>
    <VFlex xs12 md5>
      <VSelect
        ref="masteryModel"
        v-model="masteryModel"
        :items="masteryCriteria"
        :label="$tr('labelText')"
        color="primary"
        :placeholder="placeholder"
        :required="required"
        :readonly="readonly"
        :disabled="disabled"
        :rules="masteryRules"
      >
        <template v-slot:append-outer>
          <InfoModal :header="$tr('exerciseHeader')">
            <template v-slot:content>
              <p>{{ $tr('exerciseDescripiton') }}</p>
              <VDivider />
              <h3 class="headline">
                {{ $tr('masterySubheader') }}
              </h3>
              <p>{{ $tr('masteryDescripiton') }}</p>
              <div class="mastery-table">
                <VLayout
                  v-for="criteria in masteryCriteria"
                  :key="criteria.value"
                  row
                  class="mastery-row"
                >
                  <VFlex xs3 class="mastery-label text-right">
                    {{ translateConstant(criteria.value) }}
                  </VFlex>
                  <VFlex xs9>
                    {{ translateConstant(criteria.value + '_description') }}
                  </VFlex>
                </VLayout>
              </div>
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
            min="1"
            :required="mRequired"
            :placeholder="mPlaceholder"
            :readonly="readonly"
            :rules="mRules"
            :disabled="disabled"
            :hint="$tr('mHint')"
            persistentHint
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
            min="1"
            :hint="$tr('nHint')"
            persistentHint
            :required="nRequired"
            :readonly="readonly"
            :placeholder="nPlaceholder"
            :rules="nRules"
            :disabled="disabled"
          />
        </VFlex>
      </VLayout>
    </VFlex>
  </VLayout>

</template>

<script>

  import MasteryModels, { MasteryModelsList } from 'shared/leUtils/MasteryModels';
  import InfoModal from 'edit_channel/sharedComponents/InfoModal.vue';
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
          return !value || !value.mastery_model || MasteryModels.has(value.mastery_model);
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
          return this.value && this.value.mastery_model;
        },
        set(value) {
          this.handleInput({ mastery_model: value });
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
        return MasteryModelsList.map(model => ({ text: this.translateConstant(model), value: model }));
      },
      showMofN() {
        return this.masteryModel === 'm_of_n';
      },
      masteryRules() {
        return this.required ? [v => !!v || this.$tr('masteryValidationMessage')] : [];
      },
      mRules() {
        return this.mRequired
          ? [
              v => !!v || this.$tr('requiredValidationMessage'),
              v => v > 0 || this.$tr('mnValueValidationMessage'),
              v => v <= this.nValue || this.$tr('mValueValidationMessage'),
            ]
          : [];
      },
      nRules() {
        return this.nRequired
          ? [
              v => !!v || this.$tr('requiredValidationMessage'),
              v => v > 0 || this.$tr('mnValueValidationMessage'),
            ]
          : [];
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
    },
    $trs: {
      labelText: 'Mastery Criteria',
      exerciseHeader: 'What is an Exercise?',
      exerciseDescripiton:
        'An exercise contains a set of interactive ' +
        'questions that a learner can engage with in Kolibri. They ' +
        'will receive instant feedback on whether they answer each ' +
        'question correctly or incorrectly. Kolibri will cycle through ' +
        'the available questions in an exercise until the learner achieves mastery.',
      masterySubheader: 'Achieving Mastery',
      masteryDescripiton:
        'Kolibri marks an exercise as "completed" when the mastery ' +
        'criteria is met. Here are the different types of mastery criteria for an exercise:',
      masteryValidationMessage: 'Mastery is required',
      mnValueValidationMessage: 'Must be at least 1',
      mValueValidationMessage: 'Must be lesser than or equal to N',
      requiredValidationMessage: 'Required',
      mHint: 'Correct answers needed',
      nHint: 'Recent answers',
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../less/global-variables.less';

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
    color: @gray-500;
    text-align: center;
  }

  .mastery-table {
    padding: 15px;
    .mastery-row {
      padding: 5px;
      &:nth-child(odd) {
        background-color: @gray-200;
      }
      .mastery-label {
        padding-right: 15px;
        font-weight: bold;
      }
    }
  }
  /deep/ a {
    .linked-list-item;
  }

  /deep/ .v-list__tile {
    width: 100%;
  }

</style>
