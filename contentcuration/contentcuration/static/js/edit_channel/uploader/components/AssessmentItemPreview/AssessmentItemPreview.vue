<template>
  <div>
    <VLayout align-top justify-space-between>
      <VFlex>
        <div class="caption grey--text mb-1">
          {{ kindLabel }}
        </div>
        <div>
          {{ question }}
        </div>
      </VFlex>
    </VLayout>

    <VLayout v-if="detailed" mt-3>
      <VFlex>
        <div class="caption grey--text mb-2">
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
                readonly
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
              readonly
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

        <div class="mt-1">
          <!--
            class="hints-preview" is needed for precise click
            target detection in AssessmentView.vue
          -->
          <span v-if="hintsCount === 0">No hints yet</span>
          <div v-else class="hints-preview">
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
                <VFlex>
                  {{ hint.hint }}
                </VFlex>
              </VListTile>
            </VList>
          </div>
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
        if (this.hintsCount === 0) {
          return 'No hints yet';
        }

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
      top: 1px;
    }
  }

  /deep/ .v-input--selection-controls {
    margin-top: 0;

    .accent--text {
      color: gray !important;
    }

    .v-input__slot {
      margin-bottom: 0 !important;
    }
  }

</style>
