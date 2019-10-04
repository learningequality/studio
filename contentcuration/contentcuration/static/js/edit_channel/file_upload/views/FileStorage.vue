<template>
  <div>
    <span v-if="(!storageIsFull && !showWarning) || showProgress">
      {{ $tr('storageUsed', {
        used: formatFileSize(usedStorage),
        total: formatFileSize(totalStorage)}) }}
    </span>


    <v-progress-linear
      v-if="showProgress"
      :color="progressBarColor"
      :value="storagePercent"
    />
    <span v-if="storageIsFull">
      <v-icon color="red" small>error</v-icon>
      <span v-if="showProgress">{{ $tr('storageFull') }}</span>
      <span v-else>
        {{ $tr('storageFullWithSize', {
          used: formatFileSize(usedStorage),
          total: formatFileSize(totalStorage)})
        }}
      </span>
    </span>
    <span v-else-if="showWarning">
      <v-icon color="amber" small>warning</v-icon>
      <span v-if="showProgress">{{ $tr('storageLow') }}</span>
      <span v-else>
        {{ $tr('storageLowWithSize', {
          used: formatFileSize(usedStorage),
          total: formatFileSize(totalStorage)})
        }}
      </span>
    </span>
    <a
      v-if="storageIsFull || showWarning"
      class="action-link"
      target="_blank"
      :href="storageRequestUrl"
    >
      {{ $tr('requestStorage') }}
    </a>
  </div>
</template>

<script>

  import { fileSizeMixin } from '../mixins';
  import State from 'edit_channel/state';

  export default {
    name: 'FileStorage',
    $trs: {
      storageUsed: 'Storage used: {used} of {total}',
      requestStorage: 'Request storage',
      storageFull: 'Storage limit reached',
      storageFullWithSize: 'Storage limit reached: {used} of {total}',
      storageLow: 'Storage is running low',
      storageLowWithSize: 'Storage is running low: {used} of {total}',
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
      storageIsFull() {
        return this.usedStorage >= this.totalStorage;
      },
      showWarning() {
        return this.storagePercent >= 90;
      },
      progressBarColor() {
        if (this.storageIsFull) {
          return 'red lighten-3';
        } else if (this.showWarning) {
          return 'amber lighten-3';
        }
        return 'greenSuccess';
      },
      storageRequestUrl() {
        return window.Urls.storage_settings();
      },
    },
  };

</script>

<style lang="less" scoped>

  .action-link {
    margin-left: 10px;
  }

  .v-icon {
    margin-right: 5px;
    vertical-align: sub !important;
  }

</style>
