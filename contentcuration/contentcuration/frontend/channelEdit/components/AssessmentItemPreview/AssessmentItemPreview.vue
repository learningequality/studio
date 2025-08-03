<template>

  <div>
    <VLayout
      align-top
      justify-space-between
    >
      <VFlex mt-2>
        <div class="caption grey--text mb-2">
          {{ kindLabel }}
        </div>
        <TipTapEditor
          v-model="question"
          mode="view"
        />
      </VFlex>
    </VLayout>

    <VLayout
      v-if="detailed && !isPerseus"
      mt-3
      class="item-answers-preview"
      data-test="item-answers-preview"
    >
      <VFlex>
        <div class="caption grey--text mb-2">
          {{ $tr('answersLabel') }}
        </div>

        <div v-if="!answers || !answers.length">
          {{ $tr('noAnswersPlaceholder') }}
        </div>

        <template v-else>
          <template v-if="isSingleSelection || isTrueFalse">
            <VRadioGroup v-model="correctAnswersIndices">
              <VRadio
                v-for="(answer, idx) in answers"
                :key="idx"
                :value="idx"
                readonly
              >
                <template #label>
                  <div class="px-2">
                    <TipTapEditor
                      v-model="answer.answer"
                      mode="view"
                    />
                  </div>
                </template>
              </VRadio>
            </VRadioGroup>
          </template>

          <template v-if="isMultipleSelection">
            <Checkbox
              v-for="(answer, idx) in answers"
              :key="idx"
              v-model="correctAnswersIndices"
              :value="idx"
              disabled
            >
              <div class="px-2">
                <TipTapEditor
                  v-model="answer.answer"
                  mode="view"
                />
              </div>
            </Checkbox>
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

        <div class="my-1">
          <!--
            class="hints-preview" is needed for precise click
            target detection in AssessmentView.vue
          -->
          <div
            v-if="hintsCount"
            class="hints-preview"
          >
            <span
              class="grey--text hints-toggle"
              :class="{ open: areHintsOpen }"
              data-test="hintsToggle"
              @click="areHintsOpen = !areHintsOpen"
            >
              <Icon icon="chevronRight" />
              <span>{{ hintsToggleLabel }}</span>
            </span>

            <div v-if="areHintsOpen">
              <VLayout
                v-for="(hint, hintIdx) in hints"
                :key="hintIdx"
                class="hint"
                flat
              >
                <VFlex
                  class="hint-number"
                  shrink
                >
                  {{ hintIdx + 1 }}
                </VFlex>
                <VFlex>
                  <TipTapEditor
                    v-model="hint.hint"
                    mode="view"
                  />
                </VFlex>
              </VLayout>
            </div>
          </div>
        </div>
      </VFlex>
    </VLayout>
  </div>

</template>


<script>

  import sortBy from 'lodash/sortBy';
  import { AssessmentItemTypeLabels } from '../../constants';
  import { getCorrectAnswersIndices } from '../../utils';
  import translator from '../../translator';
  import { AssessmentItemTypes } from 'shared/constants';
  import Checkbox from 'shared/views/form/Checkbox';
  import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor.vue';

  export default {
    name: 'AssessmentItemPreview',
    components: {
      Checkbox,
      TipTapEditor,
    },
    props: {
      /**
       * An assessment item as retrieved from API:
       * {
       *    question
       *    type
       *    order
       *    answers
       *    hints
       *    ...
       * }
       */
      item: {
        type: Object,
        default: null,
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
      question() {
        if (!this.item || !this.item.question) {
          return '';
        }

        return this.item.question;
      },
      kind() {
        if (!this.item || !this.item.type) {
          return '';
        }

        return this.item.type;
      },
      isPerseus() {
        return this.kind === AssessmentItemTypes.PERSEUS_QUESTION;
      },
      answers() {
        if (!this.item || !this.item.answers) {
          return [];
        }

        return sortBy(this.item.answers, 'order');
      },
      hints() {
        if (!this.item || !this.item.hints) {
          return [];
        }

        return sortBy(this.item.hints, 'order');
      },
      kindLabel() {
        return translator.$tr(AssessmentItemTypeLabels[this.kind]);
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
          return this.$tr('hintsToggleLabelHide');
        }

        return this.$tr('hintsToggleLabelShow', { hintsCount: this.hintsCount });
      },
      hintsCount() {
        if (!this.hints) {
          return 0;
        }

        return this.hints.length;
      },
    },
    $trs: {
      answersLabel: 'Answers',
      noAnswersPlaceholder: 'Question has no answer options',
      hintsToggleLabelHide: 'Hide hints',
      hintsToggleLabelShow: 'Show {hintsCount} {hintsCount, plural, one {hint} other {hints}}',
    },
  };

</script>


<style lang="scss" scoped>

  .hints-toggle {
    cursor: pointer;

    .icon {
      vertical-align: text-bottom;
      transition: transform 200ms ease;
    }

    /*! rtl:begin:ignore */
    &.open .icon {
      transform: rotate(90deg);
    }

    [dir='rtl'] & {
      &:not(.open) .icon {
        transform: rotate(180deg);
      }
    }

    /*! rtl:end:ignore */
  }

  ::v-deep .v-input--selection-controls {
    margin-top: 0;

    .accent--text {
      color: gray !important;
    }

    .v-input__slot {
      margin-bottom: 0 !important;
    }
  }

  ::v-deep img {
    max-width: 100%;
    height: auto;
  }

  .hint-number {
    padding: 11px;
  }

  .item-answers-preview ::v-deep .checkbox-icon {
    top: 8px;
  }

</style>
