import { ref } from 'vue';

export function useFetch({ asyncFetchFunc }) {
  const isLoading = ref(false);
  const isFinished = ref(false);
  const data = ref(null);
  const error = ref(null);

  async function fetchData() {
    isLoading.value = true;
    isFinished.value = false;
    error.value = null;
    try {
      data.value = await asyncFetchFunc();
      isLoading.value = false;
      isFinished.value = true;
    } catch (caughtError) {
      error.value = caughtError;
      // Setting data to null just in case of error to preserve data visible during
      // refetches.
      data.value = null;
      throw caughtError;
    } finally {
      isLoading.value = false;
    }
  }

  return { isLoading, isFinished, data, error, fetchData };
}
