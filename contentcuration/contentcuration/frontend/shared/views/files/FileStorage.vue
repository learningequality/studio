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
    <span v-if="storageIsFull" class="red--text">
      <span v-if="showProgress">{{ $tr('storageFull') }}</span>
      <span v-else>
        {{ $tr('storageFullWithSize', {
          used: formatFileSize(usedStorage),
          total: formatFileSize(totalStorage)})
        }}
      </span>
    </span>
    <span v-else-if="showWarning">
      <Icon color="amber" small>warning</Icon>
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
      class="ml-3"
      :text="$tr('requestStorage')"
      :href="storageRequestUrl"
    />
  </div>

</template>

<script>

  import { mapState } from 'vuex';
  import { fileSizeMixin } from 'shared/mixins';
  import ActionLink from 'shared/views/ActionLink.vue';

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
      availableStorage() {
        return this.user.available_space;
      },
      usedStorage() {
        // If availableStorage is negative, user has exceeded storage limit
        // (e.g. limit was decreased at some point, but files were
        // uploaded before then)
        if (this.availableStorage > this.totalStorage) {
          return this.totalStorage + this.availableStorage;
        }
        return this.totalStorage - this.availableStorage;
      },
      storagePercent() {
        return this.totalStorage ? Math.min(1, this.usedStorage / this.totalStorage) * 100 : 100;
      },
      storageIsFull() {
        return this.storagePercent >= 100;
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
      storageUsed: 'Total storage used: {used} of {total}',
      requestStorage: 'Request storage',
      storageFull: 'Storage limit reached',
      storageFullWithSize: 'Total storage limit reached: {used} of {total}',
      storageLow: 'Storage is running low',
      storageLowWithSize: 'Total storage is running low: {used} of {total}',
    },
  };

</script>

<style lang="less" scoped>

  .v-icon {
    margin-right: 5px;
    vertical-align: sub !important;
  }

</style>
