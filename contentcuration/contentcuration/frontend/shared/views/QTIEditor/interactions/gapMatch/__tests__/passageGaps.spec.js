import { gapAnswerText } from '../passageGaps';
import { renderPassage } from './renderPassage';
import { stubProseMirrorLayout } from 'shared/utils/testing';

jest.mock('shared/utils/browserInfo', () => ({ isTouchDevice: false }));
const mathLive = () => ({ convertLatexToSpeakableText: latex => `spoken ${latex}` });
jest.mock('mathlive', () => ({ convertLatexToSpeakableText: latex => `spoken ${latex}` }));

const afterMathLiveLoads = () => new Promise(resolve => setTimeout(resolve));

async function formulaGap() {
  const { editor } = await renderPassage({ value: '<p>a</p>' });
  const { schema } = editor;
  return schema.nodes.gap.create({ identifier: 'gap_m' }, [
    schema.text('area '),
    schema.nodes.math.create({ latex: 'x^2' }),
  ]);
}

describe('gapAnswerText', () => {
  stubProseMirrorLayout();

  it('reads a formula as its LaTeX until MathLive loads, then as MathLive speaks it', async () => {
    const node = await formulaGap();

    expect(gapAnswerText(node)).toBe('area x^2');
    await afterMathLiveLoads();
    expect(gapAnswerText(node)).toBe('area spoken x^2');
  });

  describe('after a failed MathLive load', () => {
    const RETRY_WAIT = 10000;
    let now;

    async function afterFailedLoad() {
      const node = await formulaGap();
      now = jest.spyOn(Date, 'now').mockReturnValue(0);
      jest.resetModules();
      jest.doMock('mathlive', () => {
        throw new Error('Loading chunk mathlive failed');
      });
      const fresh = require('../passageGaps');
      fresh.gapAnswerText(node);
      await afterMathLiveLoads();
      jest.doMock('mathlive', mathLive);
      return { fresh, node };
    }

    afterEach(() => jest.restoreAllMocks());

    it('reads a formula as its LaTeX until the wait is over, then loads MathLive again', async () => {
      const { fresh, node } = await afterFailedLoad();

      fresh.gapAnswerText(node);
      await afterMathLiveLoads();
      expect(fresh.gapAnswerText(node)).toBe('area x^2');

      now.mockReturnValue(RETRY_WAIT);
      fresh.gapAnswerText(node);
      await afterMathLiveLoads();
      expect(fresh.gapAnswerText(node)).toBe('area spoken x^2');
    });

    it('loads MathLive for the formulas in a passage once the wait is over', async () => {
      const { fresh, node } = await afterFailedLoad();

      fresh.loadFormulaSpeech([node]);
      await afterMathLiveLoads();
      expect(fresh.gapAnswerText(node)).toBe('area x^2');

      now.mockReturnValue(RETRY_WAIT);
      fresh.loadFormulaSpeech([node]);
      await afterMathLiveLoads();
      expect(fresh.gapAnswerText(node)).toBe('area spoken x^2');
    });
  });
});
