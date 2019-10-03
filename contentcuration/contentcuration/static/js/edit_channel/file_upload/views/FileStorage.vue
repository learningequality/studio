<template>
  <div>
    {{ $tr('storageUsed', {
      used: formatFileSize(usedStorage),
      total: formatFileSize(totalStorage)}) }}
    <v-progress-linear
      v-if="showProgress"
      :color="usedStorage >= totalStorage? 'red lighten-3' : 'greenSuccess'"
      :value="storagePercent"
    />
  </div>
</template>

<script>

  import { fileSizeMixin } from '../mixins';
  import State from 'edit_channel/state';

  export default {
    name: 'FileStorage',
    $trs: {
      storageUsed: 'Storage used: {used} of {total}',
    },
    mixins: [fileSizeMixin],
    props: {
      showProgress: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      totalStorage() {
        return State.current_user.get('disk_space');
      },
      usedStorage() {
        return this.totalStorage - State.current_user.get('available_space');
      },
      storagePercent() {
        return this.totalStorage ? (this.usedStorage / this.totalStorage) * 100 : 100;
      },
    },
  };

</script>
