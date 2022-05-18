import { ref, computed, onUnmounted } from '@vue/composition-api';
import useFiles from 'shared/composables/useFiles';

export default function useContentNodesFiles() {
  const { subscribeNodesFiles } = useFiles();

  let _subscription = null;
  const contentNodesFiles = ref([]);

  const primaryContentNodesFiles = computed(() => {
    return contentNodesFiles.value.filter(f => !f.preset.supplementary);
  });

  function _resetContentNodesFiles() {
    if (_subscription) {
      _subscription.unsubscribe();
      _subscription = null;
    }
    contentNodesFiles.value = [];
  }

  function subscribeContentNodesFiles(nodesIds) {
    _resetContentNodesFiles();
    _subscription = subscribeNodesFiles(nodesIds, files => {
      contentNodesFiles.value = files;
    });
  }

  onUnmounted(() => {
    if (_subscription) {
      _subscription.unsubscribe();
    }
  });

  return {
    subscribeContentNodesFiles,
    contentNodesFiles,
    primaryContentNodesFiles,
  };
}
