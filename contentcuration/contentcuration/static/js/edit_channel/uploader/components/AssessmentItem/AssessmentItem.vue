<template>
  <VCard>
    <VCardTitle
      v-if="!isOpen"
      :style="{ 'cursor': 'pointer' }"
      @click="onClosedQuestionClick"
    >
      <VContainer fluid>
        <!-- eslint-disable-next-line -->
        <VLayout row align-center>
          <VFlex xs1>
            {{ order }}
          </VFlex>

          <VFlex xs4 md5>
            <div class="caption grey--text mb-1">
              {{ kindLabel }}
            </div>
            <div data-test="questionText">
              {{ question }}
            </div>
          </VFlex>

          <VSpacer />

          <VFlex
            v-if="isInvalid"
            xs1
            lg2
            data-test="invalidIndicator"
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

          <AssessmentItemToolbar
            itemLabel="question"
            :displayDeleteIcon="false"
            :canMoveUp="!isFirst"
            :canMoveDown="!isLast"
            class="toolbar"
            @click="onToolbarClick"
          />
        </VLayout>

        <template v-if="displayAnswersPreview">
          <!-- eslint-disable-next-line -->
          <VLayout row mt-3 justify-end>
            <VFlex xs11>
              <div class="caption grey--text mb-1">
                Answers
              </div>

              <AnswersPreview
                :questionKind="kind"
                :answers="answers"
              />

              <HintsPreview
                :hints="hints"
                class="hintsPreview"
              />
            </VFlex>
          </VLayout>
        </template>
      </VContainer>
    </VCardTitle>

    <template v-else>
      <VCardTitle data-test="open">
        <VContainer fluid>
          <VLayout row>
            <VFlex xs1>
              {{ order }}
            </VFlex>

            <VFlex xs5>
              <VSelect
                :key="kindSelectKey"
                :items="kindSelectItems"
                :value="kind"
                label="Question type"
                data-test="kindSelect"
                @input="onKindChange"
              />
            </VFlex>

            <VSpacer />
            <AssessmentItemToolbar
              itemLabel="question"
              :displayDeleteIcon="false"
              :displayEditIcon="false"
              :canMoveUp="!isFirst"
              :canMoveDown="!isLast"
              class="toolbar"
              @click="onToolbarClick"
            />
          </VLayout>

          <!-- eslint-disable-next-line -->
          <VLayout row justify-end>
            <VFlex xs11>
              <ErrorList
                :errors="questionErrors"
                data-test="questionErrors"
              />

              <VTextField
                label="Question"
                :value="question"
                data-test="questionInput"
                @input="onQuestionChange"
              />
            </VFlex>
          </VLayout>
        </VContainer>
      </VCardTitle>

      <VCardText>
        <VContainer fluid>
          <!-- eslint-disable-next-line -->
          <VLayout row justify-end>
            <VFlex xs11>
              <ErrorList
                :errors="answersErrors"
                data-test="answersErrors"
              />

              <AnswersEditor
                :questionKind="kind"
                :answers="answers"
                :openAnswerIdx="openAnswerIdx"
                @update="onAnswersChange"
                @open="openAnswer"
                @close="closeAnswer"
              />

              <VDivider class="mt-3 mb-3" />

              <HintsEditor
                :hints="hints"
                :openHintIdx="openHintIdx"
                @update="onHintsChange"
                @open="openHint"
                @close="closeHint"
              />
            </VFlex>
          </VLayout>

          <!-- eslint-disable-next-line -->
          <VLayout row justify-end>
            <VBtn
              flat
              color="primary"
              data-test="closeBtn"
              @click="onCloseClick"
            >
              Close
            </VBtn>
          </VLayout>
        </VContainer>
      </VCardText>
    </template>
  </VCard>
</template>

<script>

  import { mapGetters, mapMutations } from 'vuex';

  import { AssessmentItemTypes, AssessmentItemToolbarActions } from '../../constants';
  import { getAssessmentItemErrorMessage, updateAnswersToQuestionKind } from '../../utils';

  import AnswersEditor from '../AnswersEditor/AnswersEditor.vue';
  import AnswersPreview from '../AnswersPreview/AnswersPreview.vue';
  import HintsPreview from '../HintsPreview/HintsPreview.vue';
  import AssessmentItemToolbar from '../AssessmentItemToolbar/AssessmentItemToolbar.vue';
  import HintsEditor from '../HintsEditor/HintsEditor.vue';
  import ErrorList from '../ErrorList/ErrorList.vue';

  export default {
    name: 'AssessmentItem',
    components: {
      AnswersEditor,
      AnswersPreview,
      AssessmentItemToolbar,
      HintsEditor,
      HintsPreview,
      ErrorList,
    },
    props: {
      nodeId: {
        type: String,
      },
      itemIdx: {
        type: Number,
      },
      isOpen: {
        type: Boolean,
        default: false,
      },
      displayAnswersPreview: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        openHintIdx: null,
        openAnswerIdx: null,
        kindSelectKey: 0,
      };
    },
    computed: {
      ...mapGetters('edit_modal', ['nodeAssessmentDraft']),
      itemData() {
        if (
          this.nodeAssessmentDraft(this.nodeId) === null ||
          this.nodeAssessmentDraft(this.nodeId)[this.itemIdx] === undefined
        ) {
          return null;
        }

        return this.nodeAssessmentDraft(this.nodeId)[this.itemIdx].data;
      },
      itemValidation() {
        if (
          this.nodeAssessmentDraft(this.nodeId) === null ||
          this.nodeAssessmentDraft(this.nodeId)[this.itemIdx] === undefined
        ) {
          return null;
        }

        return this.nodeAssessmentDraft(this.nodeId)[this.itemIdx].validation;
      },
      order() {
        if (!this.itemData || this.itemData.order === undefined) {
          return 1;
        }

        return this.itemData.order + 1;
      },
      question() {
        if (!this.itemData || !this.itemData.question) {
          return '';
        }

        return this.itemData.question;
      },
      kind() {
        if (!this.itemData || !this.itemData.type) {
          return AssessmentItemTypes.SINGLE_SELECTION;
        }

        return this.itemData.type;
      },
      kindSelectItems() {
        return [
          { value: AssessmentItemTypes.SINGLE_SELECTION, text: 'Single selection' },
          { value: AssessmentItemTypes.MULTIPLE_SELECTION, text: 'Multiple selection' },
          { value: AssessmentItemTypes.INPUT_QUESTION, text: 'Input question' },
          { value: AssessmentItemTypes.TRUE_FALSE, text: 'True/False' },
        ];
      },
      kindLabel() {
        return this.kindSelectItems.find(item => item.value === this.kind).text;
      },
      answers() {
        if (!this.itemData || !this.itemData.answers) {
          return [];
        }

        return this.itemData.answers;
      },
      hints() {
        if (!this.itemData || !this.itemData.hints) {
          return [];
        }

        return this.itemData.hints;
      },
      questionErrors() {
        if (!this.itemValidation.questionErrors) {
          return [];
        }

        return this.itemValidation.questionErrors.map(error =>
          getAssessmentItemErrorMessage(error, this.kind)
        );
      },
      answersErrors() {
        if (!this.itemValidation.answersErrors) {
          return [];
        }

        return this.itemValidation.answersErrors.map(error =>
          getAssessmentItemErrorMessage(error, this.kind)
        );
      },
      isInvalid() {
        return (
          (this.questionErrors && this.questionErrors.length) ||
          (this.answersErrors && this.answersErrors.length)
        );
      },
      isFirst() {
        return this.itemIdx === 0;
      },
      isLast() {
        return this.itemIdx === this.nodeAssessmentDraft(this.nodeId).length - 1;
      },
      hasMoreCorrectAnswers() {
        const correctAnswers = this.answers.filter(answer => answer.correct === true);

        return correctAnswers.length > 1;
      },
    },
    methods: {
      ...mapMutations('edit_modal', [
        'updateNodeAssessmentDraftItemData',
        'sanitizeNodeAssessmentDraftItem',
        'validateNodeAssessmentDraftItem',
        'openDialog',
      ]),
      updateItem(data) {
        this.updateNodeAssessmentDraftItemData({
          nodeId: this.nodeId,
          assessmentItemIdx: this.itemIdx,
          data,
        });

        this.sanitizeNodeAssessmentDraftItem({
          nodeId: this.nodeId,
          assessmentItemIdx: this.itemIdx,
        });

        this.validateNodeAssessmentDraftItem({
          nodeId: this.nodeId,
          assessmentItemIdx: this.itemIdx,
        });
      },
      changeKind(newKind) {
        const newAnswers = updateAnswersToQuestionKind(newKind, this.answers);

        this.updateItem({ type: newKind, answers: newAnswers });
      },
      /* question type VSelect needs to be rerended when confirmation dialog
         cancelled to display a correct, previous, value that has changed
         in the select but has not been changed in data storage actually
         because of cancel action
      */
      rerenderKindSelect() {
        this.kindSelectKey += 1;
      },
      onQuestionChange(newQuestion) {
        this.updateItem({ question: newQuestion });
      },
      onKindChange(newKind) {
        if (this.kind === newKind) {
          return;
        }

        switch (newKind) {
          case AssessmentItemTypes.SINGLE_SELECTION:
            if (this.hasMoreCorrectAnswers) {
              this.openDialog({
                title: 'Changing question type',
                message:
                  'Switching to single selection will set only one answer as correct. Continue?',
                submitLabel: 'Change',
                onSubmit: () => this.changeKind(newKind),
                onCancel: this.rerenderKindSelect,
              });
            } else {
              this.changeKind(newKind);
            }

            break;

          case AssessmentItemTypes.TRUE_FALSE:
            this.openDialog({
              title: 'Changing question type',
              message: 'Switching to true or false will remove any current answers. Continue?',
              submitLabel: 'Change',
              onSubmit: () => this.changeKind(newKind),
              onCancel: this.rerenderKindSelect,
            });
            break;

          case AssessmentItemTypes.INPUT_QUESTION:
            this.openDialog({
              title: 'Changing question type',
              message:
                'Switching to numeric input will set all answers as correct and remove all non-numeric answers. Continue?',
              submitLabel: 'Change',
              onSubmit: () => this.changeKind(newKind),
              onCancel: this.rerenderKindSelect,
            });
            break;

          default:
            this.changeKind(newKind);
            break;
        }
      },
      onAnswersChange(newAnswers) {
        this.updateItem({ answers: newAnswers });
      },
      onHintsChange(newHints) {
        this.updateItem({ hints: newHints });
      },
      onCloseClick() {
        this.$emit('close');
      },
      onClosedQuestionClick(event) {
        // ignore toolbar click in this case (click on edit
        // icon is processed in toolbar click handler)
        if (event.target.closest('.toolbar') !== null) {
          return;
        }

        // allow hints preview toggling when question closed
        if (event.target.closest('.hintsPreview') !== null) {
          return;
        }

        this.$emit('open');
      },
      onToolbarClick(action) {
        switch (action) {
          case AssessmentItemToolbarActions.EDIT_ITEM:
            this.$emit('open');
            break;

          case AssessmentItemToolbarActions.DELETE_ITEM:
            this.$emit('delete');
            break;

          case AssessmentItemToolbarActions.ADD_ITEM_ABOVE:
            this.$emit('addItemAbove');
            break;

          case AssessmentItemToolbarActions.ADD_ITEM_BELOW:
            this.$emit('addItemBelow');
            break;

          case AssessmentItemToolbarActions.MOVE_ITEM_UP:
            if (this.isFirst) {
              break;
            }

            this.$emit('moveUp');
            break;

          case AssessmentItemToolbarActions.MOVE_ITEM_DOWN:
            if (this.isLast) {
              break;
            }

            this.$emit('moveDown');
            break;
        }
      },
      openHint(hintIdx) {
        this.openHintIdx = hintIdx;
        this.closeAnswer();
      },
      closeHint() {
        this.openHintIdx = null;
      },
      openAnswer(answerIdx) {
        this.openAnswerIdx = answerIdx;
        this.closeHint();
      },
      closeAnswer() {
        this.openAnswerIdx = null;
      },
    },
  };

</script>
