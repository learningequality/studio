import mergeAllChanges from 'shared/data/mergeChanges';

describe('Merge all changes', () => {
  const initialQuestionValue = '';
  const finalQuestionValue = 'What is the correct answer?';

  // merging will mutate `rev`, so we generate fresh test data from a function
  const updateChanges = () => [
    {
      table: 'assessmentitem',
      key: ['contentnode_1', 'assessment_x'],
      type: 2,
      mods: {
        question: 'What',
      },
      oldObj: {
        assessment_id: 'assessment_x',
        contentnode: 'contentnode_1',
        question: initialQuestionValue,
      },
      obj: {
        assessment_id: 'assessment_x',
        contentnode: 'contentnode_1',
        question: 'What',
      },
      rev: 1,
    },
    {
      table: 'assessmentitem',
      key: ['contentnode_1', 'assessment_x'],
      type: 2,
      mods: {
        question: 'What is',
      },
      oldObj: {
        assessment_id: 'assessment_x',
        contentnode: 'contentnode_1',
        question: 'What',
      },
      obj: {
        assessment_id: 'assessment_x',
        contentnode: 'contentnode_1',
        question: 'What is',
      },
      rev: 2,
    },
    {
      table: 'assessmentitem',
      key: ['contentnode_1', 'assessment_x'],
      type: 2,
      mods: {
        question: finalQuestionValue,
      },
      oldObj: {
        assessment_id: 'assessment_x',
        contentnode: 'contentnode_1',
        question: 'What is',
      },
      obj: {
        assessment_id: 'assessment_x',
        contentnode: 'contentnode_1',
        question: finalQuestionValue,
      },
      rev: 3,
    },
  ];
  describe('merging updates', () => {
    it('should retain the most recent update for a property', () => {
      const mergedChanges = mergeAllChanges(updateChanges(), true);
      expect(mergedChanges.length).toBe(1);

      const mergedChange = mergedChanges[0];
      expect(mergedChange.obj.question).toBe(finalQuestionValue);
      expect(mergedChange.mods.question).toBe(finalQuestionValue);
      expect(mergedChange.oldObj.question).toBe(initialQuestionValue);
    });
  });
  describe('merging create and update', () => {
    const createChange = () => ({
      table: 'assessmentitem',
      key: ['contentnode_1', 'assessment_x'],
      type: 1,
      obj: {
        assessment_id: 'assessment_x',
        contentnode: 'contentnode_1',
        question: initialQuestionValue,
      },
      rev: 0,
    });

    it('should retain the most recent update for a property', () => {
      const createAndUpdateChanges = [createChange(), ...updateChanges()];
      const mergedChanges = mergeAllChanges(createAndUpdateChanges, true);
      expect(mergedChanges.length).toBe(1);

      const mergedChange = mergedChanges[0];
      expect(mergedChange.type).toBe(1);
      expect(mergedChange.obj.question).toBe(finalQuestionValue);
      expect(mergedChange.mods).toBeUndefined();
      expect(mergedChange.oldObj).toBeUndefined();
    });
  });
});
