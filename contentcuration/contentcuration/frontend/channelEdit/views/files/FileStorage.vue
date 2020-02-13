<template>

  <div>
    <span v-if="(!storageIsFull && !showWarning) || showProgress">
      {{ $tr('storageUsed', {
        used: formatFileSize(usedStorage),
        total: formatFileSize(totalStorage)}) }}
    </span>


    <VProgressLinear
      v-if="showProgress"
      :color="progressBarColor"
      :value="storagePercent"
    />
    <span v-if="storageIsFull">
      <VIcon color="red" small>error</VIcon>
      <span v-if="showProgress">{{ $tr('storageFull') }}</span>
      <span v-else>
        {{ $tr('storageFullWithSize', {
          used: formatFileSize(usedStorage),
          total: formatFileSize(totalStorage)})
        }}
      </span>
    </span>
    <span v-else-if="showWarning">
      <VIcon color="amber" small>warning</VIcon>
      <span v-if="showProgress">{{ $tr('storageLow') }}</span>
      <span v-else>
        {{ $tr('storageLowWithSize', {
          used: formatFileSize(usedStorage),
          total: formatFileSize(totalStorage)})
        }}
      </span>
    </span>
    <ActionLink
      v-if="storageIsFull || showWarning"
      target="_blank"
      class="action-link"
      :text="$tr('requestStorage')"
      :href="storageRequestUrl"
    />
  </div>

</template>

<script>

  import { mapState } from 'vuex';
  import { fileSizeMixin } from './mixins';
  import ActionLink from 'edit_channel/sharedComponents/ActionLink.vue';

  export default {
    name: 'FileStorage',
    components: {
      ActionLink,
    },
    mixins: [fileSizeMixin],
    props: {
      showProgress: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapState({
        user: state => state.session.currentUser,
      }),
      totalStorage() {
        return this.user.disk_space;
      },
      usedStorage() {
        return this.totalStorage - this.user.available_space;
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
    $trs: {
      storageUsed: 'Storage used: {used} of {total}',
      requestStorage: 'Request storage',
      storageFull: 'Storage limit reached',
      storageFullWithSize: 'Storage limit reached: {used} of {total}',
      storageLow: 'Storage is running low',
      storageLowWithSize: 'Storage is running low: {used} of {total}',
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
