import { getCurrentInstance } from 'vue';

export default function useStore() {
  const instance = getCurrentInstance();
  const store = instance.proxy.$store;
  return store;
}
