<template>

  <VFlex>
    <VLayout>
      <DropdownWrapper component="VFlex">
        <template #default="{ attach, menuProps }">
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
            :menu-props="menuProps"
            :attach="attach"
            class="mb-2"
            @focus="$emit('focus')"
          />
        </template>
      </DropdownWrapper>
    </VLayout>
  </VFlex>

</template>

<script>

  import { getMasteryModelValidators, translateValidator } from '../../../shared/utils/validation';
  import MasteryModels, { MasteryModelsList } from 'shared/leUtils/MasteryModels';
  import { constantsTranslationMixin } from 'shared/mixins';
  import DropdownWrapper from 'shared/views/form/DropdownWrapper';

  export default {
    name: 'MasteryCriteriaGoal',
    components: { DropdownWrapper },
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
        default: () => ({}),
      },
      placeholder: {
        type: String,
        default: '',
      },
      required: {
        type: Boolean,
        default: true,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      readonly: {
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
          this.handleInput({ mastery_model });
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
