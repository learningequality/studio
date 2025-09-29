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
    const mergedChanges = mergeAllChanges(updateChanges(), true);
    it('should return only one change', () => {
      expect(mergedChanges.length).toBe(1);
    });
    const mergedChange = mergedChanges[0];
    it('should retain the most recent update for a property', () => {
      expect(mergedChange.obj.question).toBe(finalQuestionValue);
      expect(mergedChange.mods.question).toBe(finalQuestionValue);
    });
    it("should keep record of the first change's initial value", () => {
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

    const createAndUpdateChanges = [createChange(), ...updateChanges()];
    const mergedChanges = mergeAllChanges(createAndUpdateChanges, true);

    it('should return only one change', () => {
      expect(mergedChanges.length).toBe(1);
    });
    const mergedChange = mergedChanges[0];
    it('should retain the most recent update for a property', () => {
      expect(mergedChange.obj.question).toBe(finalQuestionValue);
    });
    it('should result in a change of type `created`', () => {
      expect(mergedChange.type).toBe(1);
      expect(mergedChange.mods).toBeUndefined();
      expect(mergedChange.oldObj).toBeUndefined();
    });
  });

  describe('failure to merge changes with order issues', () => {
    it('should refuse to merge changes without `rev` set', () => {
      const changesMissingRev = updateChanges();
      delete changesMissingRev[0].rev;
      expect(() => mergeAllChanges(changesMissingRev, true)).toThrow(Error);
    });
    it('should refuse to merge out of order changes', () => {
      const disorderedChanges = updateChanges();
      disorderedChanges[0].rev = 5e100;
      expect(() => mergeAllChanges(disorderedChanges, true)).toThrow(Error);
    });
  });
});
