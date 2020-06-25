<template>

  <tr :class="channel.deleted? 'red--text' : 'black--text'">
    <td v-if="$vuetify.breakpoint.smAndDown" class="pt-2">
      <Checkbox v-model="selected" />
    </td>
    <td>
      <VLayout align-center justify-start fill-height>
        <VFlex v-if="$vuetify.breakpoint.mdAndUp" shrink class="pt-3 pb-3">
          <Checkbox v-model="selected" />
        </VFlex>
        <VFlex class="text-truncate" grow>
          <VTooltip v-if="channel.published" bottom z-index="200">
            <template #activator="{on}">
              <span class="py-2 px-1" v-on="on">
                <Icon color="light-green accent-4">
                  $vuetify.icons.indicator
                </Icon>
              </span>
            </template>
            <span>This channel is public</span>
          </VTooltip>

          <VTooltip bottom z-index="200">
            <template #activator="{on}">
              <span v-on="on">
                <ActionLink
                  :to="channelModalLink"
                  :text="channel.name"
                  :color="channel.deleted? 'red' : 'primary'"
                />
              </span>
            </template>
            <span>{{ channel.name }}</span>
          </VTooltip>
        </VFlex>
        <VSpacer />
        <VFlex shrink>
          <VBtn
            icon
            flat
            small
            :href="channelLink"
            target="_blank"
            class="ma-0"
          >
            <Icon small>
              launch
            </Icon>
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
      <span v-else class="grey--text">
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
        <Icon small>
          open_in_new
        </Icon>
      </VBtn>
    </td>
    <td class="text-xs-right">
      {{ channel.viewers_count }}
    </td>
    <td>
      {{ $formatDate(channel.created, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }) }}
    </td>
    <td>
      {{ $formatRelative(channel.modified, { now: new Date() }) }}
    </td>
    <td style="min-width: 150px;">
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
          style="max-width: 100px;min-width: unset;"
        />
        <span v-else class="grey--text">Not set</span>
        <VBtn small icon flat>
          <Icon small>
            edit
          </Icon>
        </VBtn>
        <template #input>
          <VTextField
            v-model="channel.demo_server_url"
            label="Demo URL"
            single-line
            autofocus
          />
        </template>
      </VEditDialog>
      <span v-else>Deleted</span>
    </td>
    <td style="min-width: 150px;">
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
          style="max-width: 100px;min-width: unset;"
        />
        <span v-else class="grey--text">Not set</span>
        <VBtn small icon flat>
          <Icon small>
            edit
          </Icon>
        </VBtn>
        <template #input>
          <VTextField
            v-model="channel.source_url"
            label="Source URL"
            single-line
          />
        </template>
      </VEditDialog>
      <span v-else>Deleted</span>
    </td>
    <td class="text-xs-center">
      <ChannelActionsDropdown :channelId="channelId" />
    </td>
  </tr>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import ClipboardChip from '../../components/ClipboardChip';
  import { RouterNames } from '../../constants';
  import ChannelActionsDropdown from './ChannelActionsDropdown';
  import Checkbox from 'shared/views/form/Checkbox';
  import { fileSizeMixin } from 'shared/mixins';

  export default {
    name: 'ChannelItem',
    components: {
      ChannelActionsDropdown,
      ClipboardChip,
      Checkbox,
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
    computed: {
      ...mapGetters('channel', ['getChannel']),
      selected: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
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
          name: RouterNames.CHANNEL,
          params: { channelId: this.channelId },
        };
      },
      channelLink() {
        return window.Urls.channel(this.channelId);
      },
      searchChannelEditorsLink() {
        return {
          name: RouterNames.USERS,
          query: {
            search: `${this.channel.name} ${this.channelId}`,
          },
        };
      },
    },
    methods: {
      ...mapActions('channel', ['updateChannel']),
      saveDemoServerUrl() {
        this.updateChannel({
          id: this.channelId,
          demo_server_url: this.channel.demo_server_url,
        }).then(() => {
          this.$store.dispatch('showSnackbarSimple', 'Demo URL saved');
        });
      },
      saveSourceUrl() {
        this.updateChannel({
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
