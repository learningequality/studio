<template>

  <div>
    <span v-if="(!storageIsFull && !showWarning) || showProgress">
      {{ $tr('storageUsed', {
        used: formatFileSize(usedSpace),
        total: formatFileSize(totalSpace) }) }}
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
          used: formatFileSize(usedSpace),
          total: formatFileSize(totalSpace) })
        }}
      </span>
    </span>
    <span v-else-if="showWarning">
      <Icon icon="warningIncomplete" />
      <span v-if="showProgress">{{ $tr('storageLow') }}</span>
      <span v-else>
        {{ $tr('storageLowWithSize', {
          used: formatFileSize(usedSpace),
          total: formatFileSize(totalSpace) })
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

  import { mapActions, mapGetters } from 'vuex';
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
      ...mapGetters(['usedSpace', 'totalSpace']),
      storagePercent() {
        return this.totalSpace ? Math.min(1, this.usedSpace / this.totalSpace) * 100 : 100;
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
        return `${window.Urls.settings()}#/storage`;
      },
    },
    mounted() {
      this.fetchUserStorage();
    },
    methods: {
      ...mapActions(['fetchUserStorage']),
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

<style lang="scss" scoped>

  .v-icon {
    margin-right: 5px;
    vertical-align: sub !important;
  }

</style>
