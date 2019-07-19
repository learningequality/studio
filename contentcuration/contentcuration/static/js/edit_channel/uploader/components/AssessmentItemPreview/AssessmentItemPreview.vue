<template>
  <div>
    <!-- eslint-disable-next-line -->
    <VLayout align-top justify-space-between>
      <VFlex>
        <div class="caption grey--text mb-1">
          {{ kindLabel }}
        </div>
        <div>
          {{ question }}
        </div>
      </VFlex>

      <VFlex
        v-if="isInvalid"
        :style="{paddingTop: '12px'}"
        xs1
        lg3
      >
        <template v-if="$vuetify.breakpoint.lgAndUp">
          <VIcon class="red--text">
            error
          </VIcon>
          <span
            v-if="$vuetify.breakpoint.lgAndUp"
            class="red--text font-weight-bold"
          >
            Incomplete
          </span>
        </template>

        <VTooltip v-else top>
          <template slot="activator" slot-scope="{ on }">
            <VIcon class="red--text" v-on="on">
              error
            </VIcon>
          </template>
          <span>Incomplete</span>
        </VTooltip>
      </VFlex>
    </VLayout>

    <!-- eslint-disable-next-line -->
    <VLayout v-if="detailed" mt-3>
      <VFlex>
        <div class="caption grey--text mb-1">
          Answers
        </div>

        <div v-if="!answers || !answers.length">
          No answers yet
        </div>

        <template v-else>
          <template v-if="isSingleSelection || isTrueFalse">
            <VRadioGroup v-model="correctAnswersIndices">
              <VRadio
                v-for="(answer, idx) in answers"
                :key="idx"
                :label="answer.answer"
                :value="idx"
                disabled
              />
            </VRadioGroup>
          </template>

          <template v-if="isMultipleSelection">
            <VCheckbox
              v-for="(answer, idx) in answers"
              :key="idx"
              v-model="correctAnswersIndices"
              :label="answer.answer"
              :value="idx"
              disabled
            />
          </template>

          <VList v-if="isInputQuestion">
            <VListTile
              v-for="(answer, idx) in answers"
              :key="idx"
            >
              {{ answer.answer }}
            </VListTile>
          </VList>
        </template>

        <!--
          class="hints-preview" is needed for precise click
          target detection in AssessmentView.vue
        -->
        <div class="hints-preview">
          <span
            class="hints-toggle"
            data-test="hintsToggle"
            @click="areHintsOpen= !areHintsOpen"
          >
            <span>{{ hintsToggleLabel }}</span>

            <span class="icon">
              <v-icon v-if="areHintsOpen">arrow_drop_down</v-icon>
              <v-icon v-else>arrow_drop_up</v-icon>
            </span>
          </span>

          <VList v-if="areHintsOpen">
            <VListTile
              v-for="(hint, hintIdx) in hints"
              :key="hintIdx"
            >
              <VFlex xs1>
                {{ hint.order }}
              </VFlex>
              <VFlex xs2>
                {{ hint.hint }}
              </VFlex>
            </VListTile>
          </VList>
        </div>
      </VFlex>
    </VLayout>
  </div>
</template>

<script>

  import { AssessmentItemTypes, AssessmentItemTypeLabels } from '../../constants';
  import { getCorrectAnswersIndices } from '../../utils';

  export default {
    name: 'AssessmentItemPreview',
    props: {
      question: {
        type: String,
      },
      kind: {
        type: String,
        validator: value => {
          return Object.values(AssessmentItemTypes).includes(value);
        },
      },
      answers: {
        type: Array,
      },
      hints: {
        type: Array,
      },
      detailed: {
        type: Boolean,
        default: false,
      },
      isInvalid: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        areHintsOpen: false,
      };
    },
    computed: {
      kindLabel() {
        return AssessmentItemTypeLabels[this.kind];
      },
      isSingleSelection() {
        return this.kind === AssessmentItemTypes.SINGLE_SELECTION;
      },
      isMultipleSelection() {
        return this.kind === AssessmentItemTypes.MULTIPLE_SELECTION;
      },
      isTrueFalse() {
        return this.kind === AssessmentItemTypes.TRUE_FALSE;
      },
      isInputQuestion() {
        return this.kind === AssessmentItemTypes.INPUT_QUESTION;
      },
      correctAnswersIndices() {
        return getCorrectAnswersIndices(this.kind, this.answers);
      },
      hintsToggleLabel() {
        if (this.areHintsOpen) {
          return 'Hide hints';
        }

        if (this.hintsCount === 1) {
          return 'Show 1 hint';
        }

        return `Show ${this.hintsCount} hints`;
      },
      hintsCount() {
        if (!this.hints) {
          return 0;
        }

        return this.hints.length;
      },
    },
  };

</script>

<style lang="less" scoped>

  .hints-toggle {
    text-decoration: underline;
    cursor: pointer;

    .icon {
      position: relative;
      top: 3px;
    }
  }

</style>
