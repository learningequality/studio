<template>
  <VExpansionPanelContent>
    <template v-slot:header>
      <template v-if="!isOpen">
        <VContainer fluid>
          <VLayout row>
            <VFlex xs1>
              {{ order }}
            </VFlex>
            <VFlex>
              <div class="caption grey--text mb-1">
                {{ kindLabel }}
              </div>
              <div>
                {{ question }}
              </div>
            </VFlex>
          </VLayout>

          <template v-if="displayAnswersPreview">
            <!-- eslint-disable-next-line -->
            <VLayout row mt-3>
              <div class="caption grey--text mb-1">
                Answers
              </div>
            </VLayout>

            <VLayout row>
              <AnswersPreview
                :questionKind="kind"
                :answers="answers"
              />
            </VLayout>
          </template>
        </VContainer>
      </template>

      <template v-else>
        <VFlex xs12>
          {{ order }}
        </VFlex>
      </template>
    </template>

    <VCard
      v-if="isOpen"
      data-test="open"
    >
      <VContainer fluid>
        <VLayout row>
          <VFlex xs5>
            <VSelect
              :items="kindSelectItems"
              :value="kind"
              label="Question type"
              data-test="kindSelect"
              @input="onKindChange"
            />
          </VFlex>
        </VLayout>

        <VLayout row>
          <VFlex>
            <VTextField
              label="Question text"
              :value="question"
              @input="onQuestionChange"
            />
          </VFlex>
        </VLayout>

        <AnswersEditor
          :questionKind="kind"
          :answers="answers"
          @update="onAnswersChange"
        />

        <VDivider />

        <HintsEditor
          :hints="hints"
          @update="onHintsChange"
        />

        <!-- TODO @MisRob: Find out which linter tool is removing
        dashes from Vuetify attributes and disable -->
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
    </VCard>
  </VExpansionPanelContent>
</template>

<script>

  import { AssessmentItemTypes } from '../../constants';
  import AnswersEditor from '../AnswersEditor/AnswersEditor.vue';
  import AnswersPreview from '../AnswersPreview/AnswersPreview.vue';
  import HintsEditor from '../HintsEditor/HintsEditor.vue';

  export default {
    name: 'AssessmentItem',
    components: {
      AnswersEditor,
      AnswersPreview,
      HintsEditor,
    },
    props: {
      item: {
        type: Object,
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
    computed: {
      order() {
        if (!this.item || this.item.order === undefined) {
          return 1;
        }

        return this.item.order + 1;
      },
      question() {
        if (!this.item || !this.item.question) {
          return '';
        }

        return this.item.question;
      },
      kind() {
        if (!this.item || !this.item.type) {
          return AssessmentItemTypes.SINGLE_SELECTION;
        }

        return this.item.type;
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
        if (!this.item || !this.item.answers) {
          return [];
        }

        return this.item.answers;
      },
      hints() {
        if (!this.item || !this.item.hints) {
          return [];
        }

        return this.item.hints;
      },
    },
    methods: {
      onQuestionChange(newQuestion) {
        this.$emit('update', {
          itemIdx: this.itemIdx,
          payload: { question: newQuestion },
        });
      },
      onKindChange(newKind) {
        this.$emit('update', { itemIdx: this.itemIdx, payload: { type: newKind } });
      },
      onAnswersChange(newAnswers) {
        this.$emit('update', { itemIdx: this.itemIdx, payload: { answers: newAnswers } });
      },
      onHintsChange(newHints) {
        this.$emit('update', { itemIdx: this.itemIdx, payload: { hints: newHints } });
      },
      onCloseClick() {
        this.$emit('close');
      },
    },
  };

</script>
