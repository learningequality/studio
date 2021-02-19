// Constant values for MasteryModels sorted by value
const MasteryModels = new Set([
  'do_all',
  'm_of_n',
  'num_correct_in_a_row_10',
  'num_correct_in_a_row_2',
  'num_correct_in_a_row_3',
  'num_correct_in_a_row_5',
]);

export default MasteryModels;

export const MasteryModelsList = Array.from(MasteryModels);

export const MasteryModelsNames = {
  DO_ALL: 'do_all',
  M_OF_N: 'm_of_n',
  NUM_CORRECT_IN_A_ROW_10: 'num_correct_in_a_row_10',
  NUM_CORRECT_IN_A_ROW_2: 'num_correct_in_a_row_2',
  NUM_CORRECT_IN_A_ROW_3: 'num_correct_in_a_row_3',
  NUM_CORRECT_IN_A_ROW_5: 'num_correct_in_a_row_5',
};
