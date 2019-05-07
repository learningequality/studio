<template>
  <VLayout grid wrap>
    <VFlex xs10>
      <VSelect
        v-model="masteryData.mastery_model"
        :items="masteryCriteria"
        :label="$tr('labelText')"
        color="primary"
        :itemText="translate"
        itemValue="id"
        :required="required"
        :rules="rules.mastery"
        @input="handleInput"
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
              <VFlex xs3 textRight class="mastery-label">
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
    <VLayout v-if="showMofN" alignCenter>
      <VFlex xs3>
        <VTextField
          v-model="masteryData.m"
          type="number"
          min="1"
          :max="masteryData.n"
          :required="required"
          :rules="rules.mValue"
          @input="handleInput"
        />
      </VFlex>
      <VFlex xs2 justifyCenter>
        {{ $tr('ofText') }}
      </VFlex>
      <VFlex xs3>
        <VTextField
          v-model="masteryData.n"
          type="number"
          min="1"
          max="20"
          :required="required"
          :rules="rules.nValue"
          @input="updateMValue"
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
    },
    components: {
      InfoModal,
    },
    props: {
      mastery: {
        type: String,
        default: 'num_5_in_a_row',
        validator: function(value) {
          let data = JSON.parse(value);
          return !value || _.contains(Constants.MasteryModels, data.mastery_model);
        },
      },
      required: {
        type: Boolean,
        default: true,
      },
    },
    data() {
      return {
        masteryData: JSON.parse(this.mastery),
        rules: {
          mastery: [v => !!v || this.$tr('masteryValidationMessage')],
          mValue: [
            v => !!v || this.$tr('requiredValidationMessage'),
            v => v > 0 || this.$tr('mnValueValidationMessage'),
            v => v <= this.masteryData.n || this.$tr('mValueValidationMessage'),
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
        return this.masteryData.mastery_model === 'm_of_n';
      },
    },
    methods: {
      translate(item) {
        return translate(item.id || item);
      },
      updateMValue(value) {
        if (value < this.masteryData.m) {
          this.masteryData.m = value;
        }
        this.handleInput();
      },
      handleInput() {
        this.$emit('changed', this.masteryData);
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
