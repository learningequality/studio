<template>

  <LoadingText v-if="stagingDiff._status === 'loading'" />
  <VDataTable
    v-else-if="items.length"
    hide-actions
    disable-initial-sort
    :headers="headers"
    :items="items"
  >
    <template #items="props">
      <!-- Type column -->
      <td>{{ props.item.type }}</td>

      <!-- Live column -->
      <td>
        <template v-if="props.item.key === 'file_size_in_bytes'">
          {{ formatFileSize(props.item.live) }}
        </template>
        <template v-else>
          {{ props.item.live === '' ? '-' : props.item.live }}
        </template>
      </td>

      <!-- Staged column -->
      <td>
        <template v-if="props.item.key === 'file_size_in_bytes'">
          {{ formatFileSize(props.item.staged) }}
        </template>
        <template v-else>
          {{ props.item.staged === '' ? '-' : props.item.staged }}
        </template>
      </td>

      <!-- Net changes column -->
      <td>
        <template v-if="props.item.key === 'ricecooker_version'"> - </template>
        <template v-else>
          <Diff
            :value="props.item.diff"
            class="font-weight-bold"
          >
            <template #default="{ sign, value }">
              <span v-if="props.item.key === 'file_size_in_bytes'">
                {{ sign }}{{ value ? formatFileSize(value) : '-' }}
              </span>
              <span v-else> {{ sign }}{{ value ? value : '-' }} </span>
            </template>
          </Diff>
        </template>
      </td>
    </template>
  </VDataTable>
  <VLayout
    v-else
    justify-center
    column
  >
    <Icon
      icon="error"
      class="mb-2"
    />

    <!-- TODO: wrap string -->
    <div class="text-xs-center">
      <ActionLink
        text="Retry"
        @click="$emit('reload')"
      />
    </div>
  </VLayout>

</template>


<script>

  import Diff from './Diff';
  import LoadingText from 'shared/views/LoadingText';
  import { fileSizeMixin } from 'shared/mixins';

  export default {
    name: 'DiffTable',
    components: {
      Diff,
      LoadingText,
    },
    mixins: [fileSizeMixin],
    props: {
      stagingDiff: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        headers: [
          { text: this.$tr('headerType'), value: 'type', sortable: false },
          { text: this.$tr('headerLive'), value: 'live', sortable: false },
          { text: this.$tr('headerStaged'), value: 'staged', sortable: false },
          { text: this.$tr('headerDiff'), value: 'diff', sortable: false },
        ],
      };
    },
    computed: {
      items() {
        if (!this.stagingDiff) {
          return [];
        }

        const labelsMap = {
          ricecooker_version: this.$tr('typeVersion'),
          file_size_in_bytes: this.$tr('typeFileSize'),
          count_topics: this.$tr('typeTopics'),
          count_videos: this.$tr('typeVideos'),
          count_audios: this.$tr('typeAudios'),
          count_exercises: this.$tr('typeExercises'),
          count_documents: this.$tr('typeDocuments'),
          count_html5_apps: this.$tr('typeHtml5Apps'),
          count_slideshows: this.$tr('typeSlideshows'),
        };

        const items = Object.keys(this.stagingDiff).map(key => {
          if (!Object.keys(labelsMap).includes(key)) {
            return;
          }
          const type = labelsMap[key];
          const live = this.stagingDiff[key].live;
          const staged = this.stagingDiff[key].staged;
          if (live === 0 && staged === 0) {
            return; // skip content kinds not present in channel
          }
          const diff = staged - live;

          return { key, type, live, staged, diff };
        });

        return items.filter(Boolean);
      },
    },
    $trs: {
      headerType: 'Type',
      headerLive: 'Live',
      headerStaged: 'Staged',
      headerDiff: 'Net changes',
      typeVersion: 'API version',
      typeFileSize: 'File size',
      typeTopics: 'Folders',
      typeVideos: 'Videos',
      typeAudios: 'Audios',
      typeExercises: 'Exercises',
      typeDocuments: 'Documents',
      typeHtml5Apps: 'HTML5 apps',
      typeSlideshows: 'Slideshows',
    },
  };

</script>


<style lang="scss" scoped>

  ::v-deep th,
  ::v-deep td {
    padding: 0 12px !important;
  }

</style>
