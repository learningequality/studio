import { gapAnswerText } from '../passageGaps';
import { renderPassage } from './renderPassage';
import { stubProseMirrorLayout } from 'shared/utils/testing';

jest.mock('shared/utils/browserInfo', () => ({ isTouchDevice: false }));
jest.mock('mathlive', () => ({ convertLatexToSpeakableText: latex => `spoken ${latex}` }));

const afterMathLiveLoads = () => new Promise(resolve => setTimeout(resolve));

describe('gapAnswerText', () => {
  stubProseMirrorLayout();

  it('reads a formula as its LaTeX until MathLive loads, then as MathLive speaks it', async () => {
    const { editor } = await renderPassage({ value: '<p>a</p>' });
    const { schema } = editor;
    const node = schema.nodes.gap.create({ identifier: 'gap_m' }, [
      schema.text('area '),
      schema.nodes.math.create({ latex: 'x^2' }),
    ]);

    expect(gapAnswerText(node)).toBe('area x^2');
    await afterMathLiveLoads();
    expect(gapAnswerText(node)).toBe('area spoken x^2');
  });
});
