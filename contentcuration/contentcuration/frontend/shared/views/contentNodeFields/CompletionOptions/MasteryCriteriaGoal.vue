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
            :menu-props="{ ...menuProps, lazy: false, maxHeight: maxMenuHeight }"
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

  import {
    getMasteryModelValidators,
    translateValidator,
    getInvalidText,
  } from 'shared/utils/validation';
  import MasteryModels, { MasteryModelsList } from 'shared/leUtils/MasteryModels';
  import { constantsTranslationMixin } from 'shared/mixins';
  import DropdownWrapper from 'shared/views/form/DropdownWrapper';

  export default {
    name: 'MasteryCriteriaGoal',
    components: { DropdownWrapper },
    mixins: [constantsTranslationMixin],
    props: {
      value: {
        type: String,
        required: false,
        validator: function (value) {
          return !value || MasteryModels.has(value);
        },
        default: '',
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
      maxMenuHeight: {
        type: Number,
        default: 300,
      },
    },
    computed: {
      masteryModel: {
        get() {
          return this.value;
        },
        set(mastery_model) {
          this.$emit('input', mastery_model);
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
      /**
       * @public
       */
      validate() {
        if (this.masteryRules.length) {
          if (this.$refs.masteryModel) {
            this.$refs.masteryModel.validate(true);
          }
          return getInvalidText(this.masteryRules, this.masteryModel);
        }
      },
    },
    $trs: {
      labelText: 'Goal',
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
