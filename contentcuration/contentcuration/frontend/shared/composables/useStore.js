import { getCurrentInstance } from 'vue';

export default function useStore() {
  const instance = getCurrentInstance();
  if (!instance) {
    throw new Error('useStore must be called within setup()');
  }
  const store = instance.proxy.$store;
  return store;
}
