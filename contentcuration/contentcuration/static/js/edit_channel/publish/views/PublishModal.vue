<template>
  <div class="publish-items">
    <label v-if="!isChanged" class="unchanged-label">
      {{ $tr('noChangesLabel') }}
    </label>
    <VBtn
      flat
      dark
      class="open-modal-button publish-button"
      :class="{disabled: !isChanged}"
      :disabled="!isChanged"
      :title="$tr('publishButtonTitle')"
      @click.stop="openModal"
    >
      {{ $tr('publishButton') }}
    </VBtn>
    <VDialog v-model="dialog" class="publish-modal" maxWidth="500px" attach="body">
      <VCard>
        <VCardText>
          <PublishView />
        </VCardText>
        <VCardActions>
          <VBtn
            flat
            dark
            class="cancel-button"
            @click="dialog = false"
          >
            {{ $tr('cancelButton') }}
          </VBtn>
          <div>
            <span class="size-text">
              {{ $tr('publishingSizeText', {count: channelCount, size: sizeText}) }}
            </span>
            <VBtn
              flat
              dark
              class="main-publish-button publish-button"
              :class="{disabled: !channel.language}"
              :disabled="!channel.language"
              @click="handlePublish"
            >
              {{ $tr('publishButton') }}
            </VBtn>
          </div>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<script>

  import { mapActions, mapState } from 'vuex';
  import PublishView from './PublishView.vue';
  import { format_size } from 'edit_channel/utils/string_helper';
  import { alert } from 'edit_channel/utils/dialog';

  export default {
    name: 'PublishModal',
    $trs: {
      modalHeader: 'Publish Channel',
      cancelButton: 'CANCEL',
      publishButton: 'PUBLISH',
      noChangesLabel: 'No changes',
      loadingSize: 'Loading...',
      publishingSizeText: '{count, plural, =1 {# Resource} other {# Resources}} ({size})',
      publishButtonTitle: 'Make this channel available for download into Kolibri',
      publishErrorHeader: 'Publishing error',
    },
    components: {
      PublishView,
    },
    data() {
      return {
        dialog: false,
        size: null,
      };
    },
    computed: {
      ...mapState('publish', ['channel']),
      sizeText() {
        return this.size === null ? this.$tr('loadingSize') : format_size(this.size);
      },
      channelCount() {
        return this.channel.main_tree.metadata.resource_count;
      },
      isChanged() {
        return this.channel.main_tree.metadata.has_changed_descendant;
      },
    },
    methods: {
      ...mapActions('publish', ['publishChannel', 'setChannelLanguage', 'loadChannelSize']),
      openModal() {
        this.dialog = true;
        this.loadChannelSize().then(size => {
          this.size = size;
        });
      },
      handlePublish() {
        this.publishChannel()
          .then(() => {
            this.dialog = false;
          })
          .catch(error => {
            alert(this.$tr('publishErrorHeader'), error.responseText || error);
          });
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

  .publish-button {
    .action-button;

    font-weight: bold;
    color: white;
  }

  .size-text {
    margin-right: 5px;
    font-size: 10pt;
    font-style: italic;
    color: @gray-500;
  }

  .cancel-button {
    .action-text;

    color: @blue-500 !important;
  }

  .v-card__actions {
    display: grid;
    grid-auto-flow: column;
    justify-content: space-between;
  }

  .publish-items {
    min-width: max-content;
  }

  /deep/ .v-dialog {
    cursor: default;
  }

</style>
