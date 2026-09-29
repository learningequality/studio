import { qtiEditorStrings } from './qtiEditorStrings';

/**
 * Generates the toolbar actions array for a specific QTI item in the list.
 */
export default function useQTIEditorActions({
  items,
  windowIsSmall,
  openItem,
  moveItemUp,
  moveItemDown,
  addItem,
  deleteItem,
}) {
  const {
    toolbarLabelEdit$,
    toolbarLabelMoveUp$,
    toolbarLabelMoveDown$,
    toolbarLabelAddAbove$,
    toolbarLabelAddBelow$,
    toolbarLabelDelete$,
  } = qtiEditorStrings;

  /**
   * @param {Object} item
   * @param {number} idx
   * @param {Object} opts
   * @param {boolean} opts.canOpen whether the item's card can be opened for editing
   */
  function getToolbarActions(item, idx, { canOpen }) {
    const result = [];

    result.push({
      id: 'edit',
      icon: 'edit',
      label: toolbarLabelEdit$(),
      handler: () => openItem(item.assessment_id),
      collapsed: false,
      // Items the card cannot open (authored elsewhere, e.g. Perseus, or unreadable) can
      // still be moved or removed.
      disabled: !canOpen,
    });

    result.push({
      id: 'move-up',
      icon: 'chevronUp',
      label: toolbarLabelMoveUp$(),
      handler: () => moveItemUp(idx),
      collapsed: windowIsSmall.value,
      disabled: idx === 0,
    });

    result.push({
      id: 'move-down',
      icon: 'chevronDown',
      label: toolbarLabelMoveDown$(),
      handler: () => moveItemDown(idx),
      collapsed: windowIsSmall.value,
      disabled: idx === items.value.length - 1,
    });

    result.push(
      {
        id: 'add-above',
        icon: null,
        label: toolbarLabelAddAbove$(),
        handler: () => addItem({ atIndex: idx }),
        collapsed: true,
      },
      {
        id: 'add-below',
        icon: null,
        label: toolbarLabelAddBelow$(),
        handler: () => addItem({ atIndex: idx + 1 }),
        collapsed: true,
      },
      {
        id: 'delete',
        icon: 'close',
        label: toolbarLabelDelete$(),
        handler: () => deleteItem(item),
        collapsed: true,
      },
    );

    return result;
  }

  return { getToolbarActions };
}
