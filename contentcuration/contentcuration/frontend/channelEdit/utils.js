import translator from './translator';
import { RouteNames } from './constants';
import { AssessmentItemTypes } from 'shared/constants';

/**
 * Get correct answer index/indices out of an array of answer objects.
 * @param {String} questionType single/multiple selection, true/false, input question
 * @param {Array} answers An array of answer objects { answer: ..., correct: ..., ...}
 * @returns {Number|null|Array} Returns a correct answer index or null for single selection
 * or true/false question. Returns an array of correct answers indices for multiple selection
 * or input question.
 */
export function getCorrectAnswersIndices(questionType, answers) {
  if (!questionType || !answers || !answers.length) {
    return null;
  }

  if (
    questionType === AssessmentItemTypes.SINGLE_SELECTION ||
    questionType === AssessmentItemTypes.TRUE_FALSE
  ) {
    const idx = answers.findIndex(answer => answer.correct);
    return idx === -1 ? null : idx;
  }

  return answers
    .map((answer, idx) => {
      return answer.correct ? idx : undefined;
    })
    .filter(idx => idx !== undefined);
}

/**
 * Updates `correct` fields of answers based on index/indexes stored in `correctAnswersIndices`.
 * @param {Array} answers An array of answer objects { answer: ..., correct: ..., ...}
 * @param {Number|null|Array} correctAnswersIndices A correct answer index or an array
 * of correct answers indexes.
 * @returns {Array} An array of answer objects with updated `correct` fields.
 */
export function mapCorrectAnswers(answers, correctAnswersIndices) {
  if (!answers || !answers.length) {
    return null;
  }

  return answers.map((answer, idx) => {
    const isAnswerCorrect =
      correctAnswersIndices === idx ||
      (Array.isArray(correctAnswersIndices) && correctAnswersIndices.includes(idx));

    return {
      ...answer,
      correct: isAnswerCorrect,
    };
  });
}

// RegEx to test for signed floats or ints. Also allows the letter e
// to comply with what Chrome permits in their type="number" fields
export const floatOrIntRegex = /^(?=.)([+-]?([0-9e]*)(\.([0-9e]+))?)$/;

/**
 * Update answers to correspond to a question type:
 * - multiple selection: No answers updates needed.
 * - input question: Make all answers correct and remove non-numerics altogether
 * - true/false: Remove answers in favour of new true/false values.
 * - single selection: Keep first correct choice only if there is any.
 *                     Otherwise mark first choice as correct.
 * @param {String} newQuestionType single/multiple selection, true/false, input question
 * @param {Array} answers An array of answer objects.
 * @returns {Array} An array of updated answer objects.
 */
export function updateAnswersToQuestionType(questionType, answers) {
  const NEW_TRUE_FALSE_ANSWERS = [
    { answer: translator.$tr('true'), correct: true, order: 1 },
    { answer: translator.$tr('false'), correct: false, order: 2 },
  ];

  if (!answers || !answers.length) {
    if (questionType === AssessmentItemTypes.TRUE_FALSE) {
      return NEW_TRUE_FALSE_ANSWERS;
    } else {
      return [];
    }
  }

  const answersCopy = JSON.parse(JSON.stringify(answers));

  switch (questionType) {
    case AssessmentItemTypes.MULTIPLE_SELECTION:
      return answersCopy;

    case AssessmentItemTypes.INPUT_QUESTION:
      return answersCopy.reduce((obj, answer) => {
        // If there is anything other than a number in the answer
        // we'll just skip it - removing non-numeric answers
        if (floatOrIntRegex.test(answer.answer) === false) {
          return obj;
        }

        // Otherwise, set the answer to correct and push it to our obj
        answer.correct = true;
        obj.push(answer);
        return obj;
      }, []);

    case AssessmentItemTypes.TRUE_FALSE:
      return NEW_TRUE_FALSE_ANSWERS;

    case AssessmentItemTypes.SINGLE_SELECTION: {
      let firstCorrectAnswerIdx = answers.findIndex(answer => answer.correct === true);
      if (firstCorrectAnswerIdx === -1) {
        firstCorrectAnswerIdx = 0;
      }

      const newAnswers = answersCopy.map(answer => {
        answer.correct = false;
        return answer;
      });

      newAnswers[firstCorrectAnswerIdx].correct = true;

      return newAnswers;
    }
  }
}

export function isImportedContent(node) {
  return Boolean(
    node && node.original_source_node_id && node.node_id !== node.original_source_node_id
  );
}

export function importedChannelLink(node, router) {
  if (node && isImportedContent(node)) {
    const channelURI = window.Urls.channel(node.original_channel_id);
    const sourceNodeRoute = router.resolve({
      name: RouteNames.ORIGINAL_SOURCE_NODE_IN_TREE_VIEW,
      params: { originalSourceNodeId: node.original_source_node_id },
    });
    return `${channelURI + sourceNodeRoute.href}`;
  } else {
    return null;
  }
}

// AssessmentItems are referenced by `[contentnode, assessment_id]`
export function assessmentItemKey(assessmentItem) {
  return {
    contentnode: assessmentItem.contentnode,
    assessment_id: assessmentItem.assessment_id,
  };
}
