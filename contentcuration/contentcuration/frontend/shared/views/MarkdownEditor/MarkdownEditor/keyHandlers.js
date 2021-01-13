import { CLASS_MATH_FIELD, KEY_ARROW_RIGHT, KEY_ARROW_LEFT, KEY_BACKSPACE } from '../constants';

/**
 * When arrow right pressed and next element is a math field
 * then move cursor to a first position after the math field
 *
 * @param {Object} squire Squire instance
 */
const onArrowRight = squire => {
  const selection = squire.getSelection();

  if (
    selection &&
    selection.startContainer.nextSibling &&
    selection.startOffset === selection.startContainer.length &&
    selection.startContainer.nextSibling.classList.contains(CLASS_MATH_FIELD)
  ) {
    const rangeAfterMathField = new Range();
    rangeAfterMathField.setStartAfter(selection.startContainer.nextSibling);

    squire.setSelection(rangeAfterMathField);
  }
};

/**
 * When arrow left pressed and previous element is a math field
 * then move cursor to a last position before the math field
 *
 * @param {Object} squire Squire instance
 */
const onArrowLeft = squire => {
  const selection = squire.getSelection();

  if (
    selection &&
    selection.startContainer.previousSibling &&
    selection.startOffset === 1 &&
    selection.startContainer.previousSibling.classList.contains(CLASS_MATH_FIELD)
  ) {
    const rangeBeforeMathField = new Range();
    rangeBeforeMathField.setStartBefore(selection.startContainer.previousSibling);

    squire.setSelection(rangeBeforeMathField);
  }
};

/**
 * When backspace pressed and previous element is a math field
 * then remove the math field
 *
 * @param {Object} squire Squire instance
 */
const onBackspace = squire => {
  const selection = squire.getSelection();

  if (
    selection &&
    selection.startContainer.previousSibling &&
    selection.startOffset === 1 &&
    selection.startContainer.previousSibling.classList.contains(CLASS_MATH_FIELD)
  ) {
    const mathFieldRange = new Range();
    mathFieldRange.setStartBefore(selection.startContainer.previousSibling);
    mathFieldRange.setEndBefore(selection.startContainer);

    mathFieldRange.deleteContents();
  }
};

export default {
  [KEY_ARROW_RIGHT]: onArrowRight,
  [KEY_ARROW_LEFT]: onArrowLeft,
  [KEY_BACKSPACE]: onBackspace,
};
