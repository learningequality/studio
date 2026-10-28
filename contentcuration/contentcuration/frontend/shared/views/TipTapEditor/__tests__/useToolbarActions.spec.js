import { useToolbarActions } from '../TipTapEditor/composables/useToolbarActions';

const names = actions => actions.value.map(action => action.name);

/**
 * A hidden action stays defined and carries a `hide` flag, so what is worth pinning is
 * which actions a toolbar hands out — the desktop one and both mobile bars read these
 * same arrays.
 */
describe('the toolbar', () => {
  it('offers no link, which conversion strips for an offline reader', () => {
    const { insertTools } = useToolbarActions(jest.fn());
    expect(names(insertTools)).not.toContain('link');
  });

  it('offers the inline formatting a QTI item can carry as a style', () => {
    const { textActions } = useToolbarActions(jest.fn());
    expect(names(textActions)).toEqual(
      expect.arrayContaining(['bold', 'italic', 'underline', 'strikethrough']),
    );
  });

  it('offers subscript and superscript, which QTI does support', () => {
    const { scriptActions } = useToolbarActions(jest.fn());
    expect(names(scriptActions)).toEqual(expect.arrayContaining(['subscript', 'superscript']));
  });

  it('still offers the insert tools a QTI item can carry', () => {
    const { insertTools } = useToolbarActions(jest.fn());
    expect(names(insertTools)).toEqual(expect.arrayContaining(['image', 'math', 'code']));
  });
});
