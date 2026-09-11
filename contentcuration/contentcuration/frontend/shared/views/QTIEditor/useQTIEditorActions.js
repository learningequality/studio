import { qtiEditorStrings } from './qtiEditorStrings';
import { AssessmentItemTypes } from './constants';

/**
 * Generates the toolbar actions array for a specific QTI item in the list.
 */
export default function useQTIEditorActions({
  items,
  activeId,
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

  function getToolbarActions(item, idx) {
    const result = [];
    const isEditMode = activeId.value === item.assessment_id;

    result.push({
      id: 'edit',
      icon: 'edit',
      label: toolbarLabelEdit$(),
      handler: () => openItem(item.assessment_id),
      collapsed: false,
      // Items authored elsewhere (e.g. Perseus) can be moved or removed, but not opened.
      disabled: isEditMode || item.type !== AssessmentItemTypes.QTI,
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
