<template>

  <tr :class="channel.deleted ? 'red--text' : 'black--text'">
    <td
      v-if="$vuetify.breakpoint.smAndDown"
      class="pt-2"
    >
      <Checkbox v-model="selected" />
    </td>
    <td>
      <VLayout
        align-center
        justify-start
        fill-height
      >
        <VFlex
          v-if="$vuetify.breakpoint.mdAndUp"
          shrink
          class="pb-3 pt-3"
        >
          <Checkbox v-model="selected" />
        </VFlex>
        <VFlex shrink>
          <VTooltip
            v-if="channel.public && !channel.deleted"
            bottom
            z-index="200"
            lazy
          >
            <template #activator="{ on }">
              <span
                class="px-1 py-2"
                v-on="on"
              >
                <Icon icon="unpublishedResource" />
              </span>
            </template>
            <span>This channel is public</span>
          </VTooltip>
        </VFlex>
        <VFlex
          class="text-truncate"
          grow
          style="max-width: 200px"
        >
          <ActionLink
            :to="channelModalLink"
            :text="channel.name || '---'"
            :color="channel.deleted ? 'red' : 'primary'"
          />
        </VFlex>
        <VSpacer />
        <VFlex
          v-if="!channel.deleted"
          shrink
        >
          <VBtn
            icon
            flat
            small
            :href="channelLink"
            target="_blank"
            class="ma-0"
          >
            <Icon icon="openNewTab" />
          </VBtn>
        </VFlex>
      </VLayout>
    </td>
    <td>
      <span v-if="channel.deleted">Deleted</span>
      <ClipboardChip
        v-else-if="channel.published"
        :value="token"
        successMessage="Token copied to clipboard"
      />
      <span
        v-else
        class="grey--text"
      >
        Unpublished
      </span>
    </td>
    <td>
      <ClipboardChip
        :value="channel.id"
        successMessage="ID copied to clipboard"
      />
    </td>
    <td class="text-xs-right">
      {{ formatFileSize(channel.size) }}
    </td>
    <td class="text-xs-right">
      {{ channel.editors_count }}
      <VBtn
        icon
        small
        :to="searchChannelEditorsLink"
        target="_blank"
      >
        <Icon icon="openNewTab" />
      </VBtn>
    </td>
    <td class="text-xs-right">
      {{ channel.viewers_count }}
    </td>
    <td>
      {{
        $formatDate(channel.created, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      }}
    </td>
    <td>
      {{ $formatRelative(channel.modified, { now: new Date() }) }}
    </td>
    <td style="min-width: 150px">
      <VEditDialog
        v-if="!channel.deleted"
        :return-value.sync="channel.demo_server_url"
        lazy
        large
        @save="saveDemoServerUrl"
      >
        <ActionLink
          v-if="channel.demo_server_url"
          :text="channel.demo_server_url"
          :href="channel.demo_server_url"
          target="_blank"
          class="pa-0 text-truncate"
          style="min-width: unset; max-width: 100px"
        />
        <span
          v-else
          class="grey--text"
        >Not set</span>
        <VBtn
          small
          icon
          flat
        >
          <Icon icon="edit" />
        </VBtn>
        <template #input>
          <VTextField
            v-model="channel.demo_server_url"
            label="Demo URL"
            maxlength="200"
            counter
            autofocus
            box
            class="mt-4"
          />
        </template>
      </VEditDialog>
      <span v-else>Deleted</span>
    </td>
    <td style="min-width: 150px">
      <VEditDialog
        v-if="!channel.deleted"
        :return-value.sync="channel.source_url"
        lazy
        large
        @save="saveSourceUrl"
      >
        <ActionLink
          v-if="channel.source_url"
          :text="channel.source_url"
          :href="channel.source_url"
          target="_blank"
          class="pa-0 text-truncate"
          style="min-width: unset; max-width: 100px"
        />
        <span
          v-else
          class="grey--text"
        >Not set</span>
        <VBtn
          small
          icon
          flat
        >
          <Icon icon="edit" />
        </VBtn>
        <template #input>
          <VTextField
            v-model="channel.source_url"
            maxlength="200"
            counter
            label="Source URL"
            box
            class="mt-4"
          />
        </template>
      </VEditDialog>
      <span v-else>Deleted</span>
    </td>
    <td data-test="community-library-status">
      <CommunityLibraryStatusButton
        v-if="communityLibraryStatus"
        :status="communityLibraryStatus"
        @click="submissionToReview = channel.latest_community_library_submission_id"
      />
      <KEmptyPlaceholder v-else />
    </td>
    <td class="text-xs-center">
      <ChannelActionsDropdown
        :channelId="channelId"
        flat
      />
    </td>
    <ReviewSubmissionSidePanel
      v-if="submissionToReview"
      :channel="channel"
      :submissionId="submissionToReview"
      @close="submissionToReview = null"
    />
  </tr>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import ClipboardChip from '../../components/ClipboardChip';
  import ReviewSubmissionSidePanel from '../../components/sidePanels/ReviewSubmissionSidePanel';
  import CommunityLibraryStatusButton from '../../components/CommunityLibraryStatusButton.vue';
  import { RouteNames } from '../../constants';
  import ChannelActionsDropdown from './ChannelActionsDropdown';
  import { fileSizeMixin } from 'shared/mixins';
  import Checkbox from 'shared/views/form/Checkbox';
  import { getUiSubmissionStatus } from 'shared/utils/communityLibrary';

  export default {
    name: 'ChannelItem',
    components: {
      ChannelActionsDropdown,
      ClipboardChip,
      Checkbox,
      CommunityLibraryStatusButton,
      ReviewSubmissionSidePanel,
    },
    mixins: [fileSizeMixin],
    props: {
      value: {
        type: Array,
        required: true,
      },
      channelId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        submissionToReview: null,
      };
    },
    computed: {
      ...mapGetters('channel', ['getChannel']),
      selected: {
        get() {
          return this.value.includes(this.channelId);
        },
        set(value) {
          this.$emit(
            'input',
            value
              ? this.value.concat([this.channelId])
              : this.value.filter(id => id !== this.channelId),
          );
        },
      },
      channel() {
        return this.getChannel(this.channelId);
      },
      token() {
        return `${this.channel.primary_token.slice(0, 5)}-${this.channel.primary_token.slice(5)}`;
      },
      channelModalLink() {
        return {
          name: RouteNames.CHANNEL,
          params: { channelId: this.channelId },
          query: this.$route.query,
        };
      },
      channelLink() {
        return window.Urls.channel(this.channelId);
      },
      searchChannelEditorsLink() {
        return {
          name: RouteNames.USERS,
          query: {
            keywords: `${this.channelId}`,
          },
        };
      },
      communityLibraryStatus() {
        return getUiSubmissionStatus(this.channel.latest_community_library_submission_status);
      },
    },
    methods: {
      ...mapActions('channelAdmin', ['updateChannel']),
      saveDemoServerUrl() {
        return this.updateChannel({
          id: this.channelId,
          demo_server_url: this.channel.demo_server_url,
        }).then(() => {
          this.$store.dispatch('showSnackbarSimple', 'Demo URL saved');
        });
      },
      saveSourceUrl() {
        return this.updateChannel({
          id: this.channelId,
          source_url: this.channel.source_url,
        }).then(() => {
          this.$store.dispatch('showSnackbarSimple', 'Source URL saved');
        });
      },
    },
  };

</script>


<style scoped>

  /deep/ .action-link .v-btn__content {
    justify-content: start;
  }

</style>
