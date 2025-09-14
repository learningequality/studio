import { ref } from 'vue';

export function useFetch({ asyncFetchFunc }) {
  const isLoading = ref(true);
  const isFinished = ref(false);
  const data = ref(null);
  const error = ref(null);

  async function fetchData() {
    isLoading.value = true;
    isFinished.value = false;
    data.value = null;
    error.value = null;
    try {
      data.value = await asyncFetchFunc();
      isLoading.value = false;
      isFinished.value = true;
    } catch (error) {
      error.value = error;
      throw error;
    } finally {
      isLoading.value = false;
    }
  }
  fetchData();

  return { isLoading, isFinished, data, error };
}
