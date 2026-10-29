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

  it('loads MathLive again after a failed load', async () => {
    const node = await formulaGap();
    jest.resetModules();
    jest.doMock('mathlive', () => {
      throw new Error('Loading chunk mathlive failed');
    });
    const { gapAnswerText: freshAnswerText } = require('../passageGaps');

    expect(freshAnswerText(node)).toBe('area x^2');
    await afterMathLiveLoads();
    jest.doMock('mathlive', mathLive);
    expect(freshAnswerText(node)).toBe('area x^2');
    await afterMathLiveLoads();
    expect(freshAnswerText(node)).toBe('area spoken x^2');
  });
});
