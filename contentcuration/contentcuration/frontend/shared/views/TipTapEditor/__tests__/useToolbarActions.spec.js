import { useToolbarActions } from '../TipTapEditor/composables/useToolbarActions';

const names = actions => actions.value.map(action => action.name);

/**
 * The actions themselves stay defined and carry a `hide` flag, so what is worth pinning
 * is that no toolbar hands them out — the desktop one and both mobile bars read these
 * same arrays.
 */
describe('the toolbar', () => {
  it('offers no underline or strikethrough, which a QTI item cannot carry', () => {
    const { textActions } = useToolbarActions(jest.fn());
    expect(names(textActions)).not.toContain('underline');
    expect(names(textActions)).not.toContain('strikethrough');
  });

  it('offers no link, which conversion strips for an offline reader', () => {
    const { insertTools } = useToolbarActions(jest.fn());
    expect(names(insertTools)).not.toContain('link');
  });

  it('offers no alignment, which QTI has no attribute to express', () => {
    const { alignActionHidden } = useToolbarActions(jest.fn());
    expect(alignActionHidden).toBe(true);
  });

  it('offers subscript and superscript, which QTI does support', () => {
    const { scriptActions } = useToolbarActions(jest.fn());
    expect(names(scriptActions)).toEqual(expect.arrayContaining(['subscript', 'superscript']));
  });

  it('still offers the formatting a QTI item can carry', () => {
    const { textActions, insertTools } = useToolbarActions(jest.fn());
    expect(names(textActions)).toEqual(expect.arrayContaining(['bold', 'italic']));
    expect(names(insertTools)).toEqual(expect.arrayContaining(['image', 'math', 'code']));
  });
});
