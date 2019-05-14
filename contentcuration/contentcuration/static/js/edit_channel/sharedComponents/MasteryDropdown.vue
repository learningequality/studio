<template>
  <VLayout grid wrap class="align-center">
    <VFlex xs10>
      <VSelect
        :value="masteryModel"
        :items="masteryCriteria"
        :label="$tr('labelText')"
        color="primary"
        :itemText="translate"
        :placeholder="placeholder"
        itemValue="id"
        :required="required"
        :rules="required? rules.mastery : []"
        @input="updateMastery"
      />
    </VFlex>
    <VFlex xs2>
      <InfoModal>
        <template v-slot:header>
          {{ $tr('exerciseHeader') }}
        </template>
        <template v-slot:content>
          <p>{{ $tr('exerciseDescripiton') }}</p>
          <VDivider />
          <h3>{{ $tr('masterySubheader') }}</h3>
          <p>{{ $tr('masteryDescripiton') }}</p>
          <div class="mastery-table">
            <VLayout
              v-for="criteria in masteryCriteria"
              :key="criteria.id"
              row
              class="mastery-row"
            >
              <VFlex xs3 class="mastery-label text-right">
                {{ translate(criteria.id) }}
              </VFlex>
              <VFlex xs9>
                {{ translate(criteria.id + '_description') }}
              </VFlex>
            </VLayout>
          </div>
        </template>
      </InfoModal>
    </VFlex>
    <VLayout v-if="showMofN" alignTop>
      <VFlex xs5>
        <VTextField
          :value="mValue"
          type="number"
          min="1"
          :max="nValue"
          :required="mRequired"
          :placeholder="mPlaceholder"
          :rules="mRequired? rules.mValue : []"
          :hint="$tr('mHint')"
          persistentHint
          @input="updateMValue"
        />
      </VFlex>
      <VSpacer />
      <VFlex xs2 justifyCenter class="out-of">
        /
      </VFlex>
      <VFlex xs5>
        <VTextField
          :value="nValue"
          type="number"
          min="1"
          max="20"
          :hint="$tr('nHint')"
          persistentHint
          :required="nRequired"
          :placeholder="nPlaceholder"
          :rules="nRequired? rules.nValue : []"
          @input="updateNValue"
        />
      </VFlex>
    </VLayout>
  </VLayout>
</template>

<script>

  import _ from 'underscore';
  import Constants from 'edit_channel/constants/index';
  import InfoModal from 'edit_channel/sharedComponents/InfoModal.vue';
  import { translate } from 'edit_channel/utils/string_helper';

  // Vuetify item-text property must use objects to translate
  const masteryMap = _.map(Constants.MasteryModels, m => {
    return { id: m };
  });

  export default {
    name: 'MasteryDropdown',
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
      ofText: 'of',
      masteryValidationMessage: 'Mastery is required',
      mnValueValidationMessage: 'Must be at least 1',
      mValueValidationMessage: 'Must be lesser than or equal to N',
      requiredValidationMessage: 'Required',
      mHint: 'Correct answers needed',
      nHint: 'Recent answers',
    },
    components: {
      InfoModal,
    },
    props: {
      masteryModel: {
        type: String,
        required: false,
        validator: function(value) {
          return !value || _.contains(Constants.MasteryModels, value);
        },
      },
      placeholder: {
        type: String,
      },
      required: {
        type: Boolean,
        default: true,
      },
      mValue: {
        type: Number,
        required: false,
      },
      mRequired: {
        type: Boolean,
        default: true,
      },
      mPlaceholder: {
        type: String,
      },
      nValue: {
        type: Number,
        required: false,
      },
      nRequired: {
        type: Boolean,
        default: true,
      },
      nPlaceholder: {
        type: String,
      },
    },
    data() {
      return {
        rules: {
          mastery: [v => !!v || this.$tr('masteryValidationMessage')],
          mValue: [
            v => !!v || this.$tr('requiredValidationMessage'),
            v => v > 0 || this.$tr('mnValueValidationMessage'),
            v => v <= this.nValue || this.$tr('mValueValidationMessage'),
          ],
          nValue: [
            v => !!v || this.$tr('requiredValidationMessage'),
            v => v > 0 || this.$tr('mnValueValidationMessage'),
          ],
        },
      };
    },
    computed: {
      masteryCriteria() {
        return masteryMap;
      },
      showMofN() {
        return this.masteryModel === 'm_of_n';
      },
    },
    methods: {
      translate(item) {
        return translate(item.id || item);
      },
      updateMValue(value) {
        value = Number(value);
        this.handleInput({ m: value });
      },
      updateNValue(value) {
        value = Number(value);
        if (value < this.mValue) {
          this.updateMValue(value);
        }
        this.handleInput({ n: value });
      },
      updateMastery(value) {
        this.handleInput({ mastery_model: value });
      },
      handleInput(newValue) {
        let data = {
          mastery_model: this.masteryModel,
          m: this.mValue,
          n: this.nValue,
          ...newValue,
        };
        this.$emit('changed', data);
      },
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
