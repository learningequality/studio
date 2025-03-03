<template>

  <!-- Wait for node to load before listing -->
  <VListTile
    v-if="node"
    :style="{ backgroundColor }"
    class="px-1 py-0"
    @click.stop="selected = [nodeId]"
  >
    <VListTileAction
      style="min-width: min-content"
      @click.stop
    >
      <Checkbox
        v-model="selected"
        :value="nodeId"
      />
    </VListTileAction>

    <VListTileAction style="min-width: min-content">
      <ContentNodeIcon
        :kind="node.kind"
        :showColor="false"
      />
    </VListTileAction>
    <VListTileContent class="px-2 py-0">
      <VListTileTitle class="notranslate">
        {{ node.title }}
      </VListTileTitle>
      <VListTileSubTitle v-if="subtitleText">
        {{ subtitleText }}
      </VListTileSubTitle>
    </VListTileContent>
    <VSpacer />
    <VListTileAction class="mr-1 status-indicator">
      <div>
        <div v-if="!uploadingFiles.length">
          <Icon
            v-if="!nodeIsValid"
            icon="error"
            class="error-icon"
          />
        </div>
        <VTooltip
          v-else-if="erroredFiles.length"
          top
          lazy
        >
          <template #activator="{ on }">
            <VIconWrapper
              color="red"
              v-on="on"
            >
              error
            </VIconWrapper>
          </template>
          <span>{{ errorMessage(erroredFiles[0].checksum) }}</span>
        </VTooltip>
        <VIconWrapper
          v-else-if="showUploadProgress && progress >= 1"
          color="secondary"
          data-test="done"
        >
          check_circle
        </VIconWrapper>
        <VProgressCircular
          v-else-if="showUploadProgress"
          :size="20"
          :width="4"
          :value="progress * 100"
          color="greenSuccess"
          rotate="270"
          data-test="progress"
        />
      </div>
    </VListTileAction>
    <VListTileAction v-if="canRemove">
      <VBtn
        icon
        flat
        class="remove-item"
        @click.stop="removeNode"
      >
        <Icon icon="clear" />
      </VBtn>
    </VListTileAction>
  </VListTile>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import { RouteNames } from '../../constants';
  import { fileSizeMixin, fileStatusMixin } from 'shared/mixins';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import Checkbox from 'shared/views/form/Checkbox';

  export default {
    name: 'EditListItem',
    components: {
      Checkbox,
      ContentNodeIcon,
    },
    mixins: [fileSizeMixin, fileStatusMixin],
    props: {
      value: {
        type: Array,
        default: () => [],
      },
      nodeId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        showUploadProgress: false,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit']),
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeIsValid']),
      ...mapGetters('file', ['getContentNodeFiles']),
      selected: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      node() {
        return this.getContentNode(this.nodeId);
      },
      nodeIsValid() {
        return this.getContentNodeIsValid(this.nodeId);
      },
      files() {
        return this.getContentNodeFiles(this.nodeId);
      },
      backgroundColor() {
        if (this.selected.includes(this.nodeId)) {
          return this.selected.length > 1
            ? this.$vuetify.theme.primaryBackground
            : this.$vuetify.theme.greyBackground;
        }
        return 'transparent';
      },
      subtitleText() {
        if (this.node.kind === 'exercise') {
          return this.$tr('questionCount', { count: this.node.assessment_item_count || 0 });
        }
        return this.statusMessage(this.node.files);
      },
      canRemove() {
        return (
          this.canEdit &&
          (this.$route.name === RouteNames.ADD_TOPICS ||
            this.$route.name === RouteNames.UPLOAD_FILES ||
            this.$route.name === RouteNames.ADD_EXERCISE)
        );
      },
      uploadingFiles() {
        return this.files.filter(f => f.uploading || f.progress < 1);
      },
      erroredFiles() {
        return this.files.filter(f => f.error);
      },
      progress() {
        return (
          this.uploadingFiles.reduce((sum, f) => f.progress + sum, 0) / this.uploadingFiles.length
        );
      },
    },
    watch: {
      progress(progress) {
        if (progress >= 1) {
          setTimeout(() => {
            this.showUploadProgress = false;
          }, 3000);
        } else if (progress >= 0) {
          this.showUploadProgress = true;
        }
      },
    },
    methods: {
      ...mapActions('contentNode', ['deleteContentNode']),
      removeNode() {
        this.deleteContentNode(this.nodeId).then(() => {
          this.$emit('removed', this.nodeId);
        });
      },
    },
    $trs: {
      questionCount: '{count, plural,\n =1 {# question}\n other {# questions}}',
    },
  };

</script>


<style lang="scss" scoped>

  .v-list__tile__action {
    min-width: 30px;

    &.changed {
      min-width: 15px;
      font-weight: bold;
    }
  }

  .remove-item {
    display: none;
  }

  ::v-deep .v-list__tile {
    height: max-content !important;
    min-height: 64px;

    &:hover .remove-item {
      display: block;
    }

    .v-list__tile__sub-title {
      white-space: unset;
    }
  }

  .status-indicator {
    min-width: max-content;
  }

</style>
