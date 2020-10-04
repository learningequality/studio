export function generateMaps(requisitePairs) {
  const nextStepsMap = {};
  const previousStepsMap = {};
  for (let [targetNode, prerequisite] of requisitePairs) {
    if (!nextStepsMap[targetNode]) {
      nextStepsMap[targetNode] = {};
    }
    nextStepsMap[targetNode][prerequisite] = true;
    if (!previousStepsMap[prerequisite]) {
      previousStepsMap[prerequisite] = {};
    }
    previousStepsMap[prerequisite][targetNode] = true;
  }
  return { nextStepsMap, previousStepsMap };
}
