import { computed, unref } from 'vue';
import useStore from 'shared/composables/useStore';
import { ContentModalities } from 'shared/constants';

/**
 * Work out what changed between the list Studio holds and the list the editor produced.
 *
 * The QTI editor is a controlled list component: it hands back the whole array and knows
 * nothing about how questions are stored. Studio, on the other hand, syncs one change
 * record per assessment item, so the array has to be translated back into per-item writes.
 *
 * Position in the array is the question's order, and `raw_data` is the only field the
 * editor ever rewrites.
 *
 * @param {Array} prevItems - The items currently in the store
 * @param {Array} nextItems - The items the editor emitted
 * @returns {{ orders: Array, added: Array, updated: Array, deleted: Array }}
 */
function diffAssessmentItems(prevItems, nextItems) {
  const prevById = new Map(prevItems.map(item => [item.assessment_id, item]));
  const nextIds = new Set(nextItems.map(item => item.assessment_id));

  const orders = [];
  const added = [];
  const updated = [];
  const deleted = prevItems.filter(item => !nextIds.has(item.assessment_id));

  nextItems.forEach((item, order) => {
    const previous = prevById.get(item.assessment_id);

    if (!previous) {
      added.push({ ...item, order });
      return;
    }
    if (previous.order !== order) {
      orders.push({ assessment_id: item.assessment_id, order });
    }
    if (previous.raw_data !== item.raw_data) {
      updated.push({ assessment_id: item.assessment_id, raw_data: item.raw_data });
    }
  });

  return { orders, added, updated, deleted };
}

/**
 * Everything the questions tab needs about one content node's assessment items: the
 * ordered list to render, how many of them are incomplete, and a way to save an edited
 * list back through the change-sync layer.
 *
 * @param {string|import('vue').Ref<string>} nodeId
 */
export default function useAssessmentItems(nodeId) {
  const store = useStore();

  const assessmentItems = computed(() =>
    store.getters['assessmentItem/getAssessmentItems'](unref(nodeId)),
  );

  /**
   * Currently free responses are only allowed in surveys
   */
  const allowFreeResponse = computed(
    () =>
      store.getters['contentNode/getContentNode'](unref(nodeId))?.extra_fields?.options
        ?.modality === ContentModalities.SURVEY,
  );

  const invalidItemsCount = computed(() =>
    store.getters['assessmentItem/getInvalidAssessmentItemsCount']({
      contentNodeId: unref(nodeId),
    }),
  );

  /**
   * Persist an edited list of items.
   *
   * Reordering runs first so that added and removed questions never leave two items
   * claiming the same position, even briefly.
   *
   * @param {Array} nextItems - The full ordered list emitted by the editor
   */
  async function applyUpdate(nextItems) {
    const contentnode = unref(nodeId);
    const { orders, added, updated, deleted } = diffAssessmentItems(
      assessmentItems.value,
      nextItems,
    );

    if (orders.length) {
      await store.dispatch(
        'assessmentItem/updateAssessmentItems',
        orders.map(order => ({ contentnode, ...order })),
      );
    }
    for (const item of added) {
      await store.dispatch('assessmentItem/addAssessmentItem', { contentnode, ...item });
    }
    for (const item of updated) {
      await store.dispatch('assessmentItem/updateAssessmentItem', { contentnode, ...item });
    }
    for (const item of deleted) {
      await store.dispatch('assessmentItem/deleteAssessmentItem', {
        contentnode,
        assessment_id: item.assessment_id,
      });
    }
  }

  return { assessmentItems, invalidItemsCount, allowFreeResponse, applyUpdate };
}
