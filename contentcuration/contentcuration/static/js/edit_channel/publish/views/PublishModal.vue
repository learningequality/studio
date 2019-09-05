<template>
  <div class="publish-items">
    <label v-if="!isReadOnly && !isChanged" class="unchanged-label">
      {{ $tr('noChangesLabel') }}
    </label>
    <VBtn
      v-if="!isReadOnly"
      ref="open-modal-button"
      depressed
      color="primary"
      :class="{disabled: !isChanged}"
      :disabled="!isChanged"
      :title="$tr('publishButtonTitle')"
      @click.stop="openModal"
    >
      {{ $tr('publishButton') }}
    </VBtn>
    <VDialog v-model="dialog" class="publish-modal" maxWidth="500px" attach="body">
      <PublishView v-if="dialog" @publish="dialog=false" @cancel="dialog=false" />
    </VDialog>
  </div>
</template>

<script>

  import { mapActions, mapState } from 'vuex';
  import PublishView from './PublishView.vue';

  export default {
    name: 'PublishModal',
    $trs: {
      modalHeader: 'Publish Channel',
      noChangesLabel: 'No changes',
      publishButton: 'Publish',
      publishButtonTitle: 'Make this channel available for download into Kolibri',
      publishErrorHeader: 'Publishing error',
    },
    components: {
      PublishView,
    },
    data() {
      return {
        dialog: false,
      };
    },
    computed: {
      ...mapState('publish', ['channel']),
      isChanged() {
        return this.channel.main_tree.metadata.has_changed_descendant;
      },
      isReadOnly() {
        return !this.$store.getters.canEdit;
      },
    },
    methods: {
      ...mapActions('publish', ['setChannelLanguage', 'loadChannelSize']),
      openModal() {
        this.dialog = true;
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  * {
    font-family: 'Noto Sans';
  }

  .unchanged-label {
    color: @gray-500;
  }

  .v-btn {
    font-weight: bold;
  }

  .publish-items {
    min-width: max-content;
  }

  /deep/ .v-dialog {
    cursor: default;
  }

</style>
