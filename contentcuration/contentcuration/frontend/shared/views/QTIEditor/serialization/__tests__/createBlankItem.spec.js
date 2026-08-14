import { createBlankItemXml, DEFAULT_ITEM_TITLE } from '../createBlankItem';
import { parseItem } from '../parseItem';
import { parseXML } from '../xml';
import { QtiInteraction } from '../../constants';
import { validateQtiItem } from '../../validateItem';

describe('createBlankItemXml', () => {
  it('produces an item holding exactly one default interaction', () => {
    const { interactions } = parseItem(createBlankItemXml());

    expect(interactions).toHaveLength(1);
    expect(parseXML(interactions[0].bodyXml).documentElement.tagName.toLowerCase()).toBe(
      QtiInteraction.CHOICE,
    );
  });

  it('stamps a unique identifier and the default title', () => {
    const first = parseItem(createBlankItemXml());
    const second = parseItem(createBlankItemXml());

    expect(first.title).toBe(DEFAULT_ITEM_TITLE);
    // The identifier is an XML NCName: a letter or underscore, then name characters.
    expect(first.identifier).toMatch(/^[A-Za-z_][\w.-]*$/);
    expect(first.identifier).not.toBe(second.identifier);
  });

  it('is renderable but not yet complete, so the author has something to fill in', () => {
    // A blank item must parse into an interaction — otherwise the editor has nothing to
    // render — while still reporting as invalid until the author fills it in.
    expect(validateQtiItem(createBlankItemXml()).length).toBeGreaterThan(0);
  });
});
