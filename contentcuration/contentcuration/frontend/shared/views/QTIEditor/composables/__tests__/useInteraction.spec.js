import { ref, nextTick } from 'vue';
import { useInteraction } from '../useInteraction';

jest.mock('lodash/debounce', () => {
  return jest.fn(fn => {
    const mocked = jest.fn((...args) => fn(...args));
    mocked.cancel = jest.fn();
    return mocked;
  });
});

function makeDescriptor({ parseReturn = {}, buildReturn = null, validateReturn = [] } = {}) {
  return {
    parse: jest.fn(() => parseReturn),
    buildXML: jest.fn(
      () => buildReturn ?? { bodyXml: '<built/>', responseDeclarations: ['<decl/>'] },
    ),
    validate: jest.fn(() => validateReturn),
  };
}

describe('useInteraction', () => {
  it('calls descriptor.parse once with the interaction block on creation', () => {
    const descriptor = makeDescriptor();
    const block = { bodyXml: '<qti-choice-interaction/>', responseDeclarations: ['<decl/>'] };
    const questionType = ref('singleSelect');

    useInteraction(descriptor, block, questionType);

    expect(descriptor.parse).toHaveBeenCalledTimes(1);
    expect(descriptor.parse).toHaveBeenCalledWith(block.bodyXml, block.responseDeclarations);
  });

  it('exposes initial parsed state as a reactive ref', () => {
    const parseReturn = { prompt: 'Hello', answers: [] };
    const descriptor = makeDescriptor({ parseReturn });
    const questionType = ref('singleSelect');

    const { state } = useInteraction(
      descriptor,
      { bodyXml: '', responseDeclarations: [] },
      questionType,
    );

    expect(state.value).toEqual(parseReturn);
  });

  it('bodyXml and responseDeclarations are computed from buildXML', () => {
    const descriptor = makeDescriptor({
      buildReturn: { bodyXml: '<body/>', responseDeclarations: ['<d1/>', '<d2/>'] },
    });
    const questionType = ref('singleSelect');

    const { bodyXml, responseDeclarations } = useInteraction(
      descriptor,
      { bodyXml: '', responseDeclarations: [] },
      questionType,
    );

    expect(bodyXml.value).toBe('<body/>');
    expect(responseDeclarations.value).toEqual(['<d1/>', '<d2/>']);
  });

  it('errors gets populated on instantiation via immediate watcher', () => {
    const validateReturn = [{ code: 'INITIAL_ERROR' }];
    const descriptor = makeDescriptor({ validateReturn });
    const questionType = ref('singleSelect');

    const { errors } = useInteraction(
      descriptor,
      { bodyXml: '', responseDeclarations: [] },
      questionType,
    );

    expect(errors.value).toEqual(validateReturn);
  });

  it('runValidation immediately updates errors when called manually', () => {
    const descriptor = makeDescriptor({ validateReturn: [] });
    const questionType = ref('singleSelect');

    const { errors, runValidation } = useInteraction(
      descriptor,
      { bodyXml: '', responseDeclarations: [] },
      questionType,
    );

    expect(errors.value).toEqual([]);

    descriptor.validate.mockReturnValueOnce([{ code: 'NEW_ERROR' }]);
    runValidation();

    expect(errors.value).toEqual([{ code: 'NEW_ERROR' }]);
  });

  it('runValidation passes current state and questionType to validate', () => {
    const descriptor = makeDescriptor();
    const questionType = ref('singleSelect');
    const block = { bodyXml: '', responseDeclarations: [] };

    const { state, runValidation } = useInteraction(descriptor, block, questionType);
    state.value = { prompt: 'updated' };
    questionType.value = 'multiSelect';
    runValidation();

    expect(descriptor.validate).toHaveBeenCalledWith({ prompt: 'updated' }, 'multiSelect');
  });

  it('bodyXml recomputes when state changes', () => {
    let callCount = 0;
    const descriptor = {
      parse: jest.fn(() => ({ prompt: '' })),
      buildXML: jest.fn(() => ({ bodyXml: `call-${++callCount}`, responseDeclarations: [] })),
      validate: jest.fn(() => []),
    };
    const questionType = ref('singleSelect');

    const { state, bodyXml } = useInteraction(
      descriptor,
      { bodyXml: '', responseDeclarations: [] },
      questionType,
    );

    const first = bodyXml.value;
    state.value = { prompt: 'changed' };
    const second = bodyXml.value;

    expect(first).not.toBe(second);
  });

  it('bodyXml recomputes when questionType changes', () => {
    const descriptor = makeDescriptor();
    const questionType = ref('singleSelect');

    const { bodyXml } = useInteraction(
      descriptor,
      { bodyXml: '', responseDeclarations: [] },
      questionType,
    );

    bodyXml.value; // trigger initial compute
    questionType.value = 'multiSelect';
    bodyXml.value; // trigger recompute

    expect(descriptor.buildXML).toHaveBeenCalledTimes(2);
    expect(descriptor.buildXML).toHaveBeenLastCalledWith(expect.anything(), 'multiSelect');
  });

  it('automatically runs validation when state changes', async () => {
    const validateReturn = [{ code: 'SOME_ERROR' }];
    const descriptor = makeDescriptor({ validateReturn });
    const questionType = ref('singleSelect');

    const { state, errors } = useInteraction(
      descriptor,
      { bodyXml: '', responseDeclarations: [] },
      questionType,
    );

    expect(errors.value).toEqual(validateReturn);

    descriptor.validate.mockReset();
    descriptor.validate.mockReturnValue([{ code: 'UPDATED_ERROR' }]);
    state.value = { prompt: 'updated' };
    await nextTick();

    expect(descriptor.validate).toHaveBeenCalledWith({ prompt: 'updated' }, 'singleSelect');
    expect(errors.value).toEqual([{ code: 'UPDATED_ERROR' }]);
  });
});
