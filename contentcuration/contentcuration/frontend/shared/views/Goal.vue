<template>
  <!-- xs12 sm11 md10 lg9 xl8 -->
  <VFlex>
    <VLayout>
      <VFlex>
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
          class="mb-2"
          @focus="$emit('focus')"
        />
      </VFlex>
    </VLayout>

  </VFlex>

</template>

<script>

  import {
    getMasteryModelValidators,
    translateValidator,
  } from '../utils/validation';
  import MasteryModels, {
    MasteryModelsList,
    MasteryModelsNames,
  } from 'shared/leUtils/MasteryModels';
  // import InfoModal from 'shared/views/InfoModal.vue';
  import { constantsTranslationMixin } from 'shared/mixins';

  export default {
    name: 'Goal',
    components: {
      // InfoModal,
    },
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
    },
    computed: {
      masteryModel: {
        get() {
          return this.value && this.value.mastery_model;
        },
        set(mastery_model) {
          if (mastery_model !== 'm of n') {
            this.handleInput({ mastery_model });
          }
        },
      },
      masteryCriteria() {
        return MasteryModelsList.map(model => ({
          text: this.translateConstant(model),
          value: model,
        }));
      },
      masteryRules() {
        return this.required ? getMasteryModelValidators().map(translateValidator) : [];
      },
    },
    methods: {
      handleInput(newValue) {
        let data = {
          ...this.value,
          ...newValue,
        };
        console.log('data', data)
        this.$emit('input', data);
      },
    },
    $trs: {
      labelText: 'Goal',
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
