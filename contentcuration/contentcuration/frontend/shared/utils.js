/**
 * Remove identical pairs from an array.
 *
 * @param {Array} arr Example: [
 *                      ['food', 'chocolate'],
 *                      ['drink', 'juice'],
 *                      ['food', 'chocolate'],
 *                      ['chocolate', 'food']
 *                    ]
 * @returns A new array without identical pairs
 *          (only exact matches will be removed)
 *          E.g. for the array above this function
 *          returns [
 *            ['food', 'chocolate'],
 *            ['drink', 'juice'],
 *            ['chocolate', 'food']
 *          ]
 */
export function removeDuplicatePairs(arr) {
  if (!arr) {
    throw ReferenceError('an array of pairs must be defined');
  }

  const resultArr = [];

  for (let idx = 0; idx < arr.length; idx++) {
    const currentItem = arr[idx];
    const identicalItem = arr.slice(idx + 1).findIndex(step => {
      return step[0] === currentItem[0] && step[1] === currentItem[1];
    });
    const isDuplicate = identicalItem !== -1;

    if (!isDuplicate) {
      resultArr.push(arr[idx]);
    }
  }

  return resultArr;
}
