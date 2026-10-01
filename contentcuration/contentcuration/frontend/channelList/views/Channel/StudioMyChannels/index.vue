<template>

  <StudioChannelsPage
    :loading="loading"
    :invitations="editInvitations"
  >
    <template #header>
      <h1 class="visuallyhidden">{{ strings.title$() }}</h1>

      <div
        v-if="!loading"
        class="button-container"
      >
        <KButton
          primary
          :text="strings.newChannel$()"
          @click="newChannel"
        />
        <div
          class="organization-actions"
          :class="{ 'small-window': windowIsSmall }"
        >
          <KSelect
            v-model="organizationFilter"
            class="organization-filter"
            data-testid="organization-filter"
            :label="filterByOrganization$()"
            :options="organizationOptions"
          />
          <KButton
            primary
            :text="strings.createOrganization$()"
            @click="newOrganization"
          />
        </div>
      </div>
      <p
        v-if="organizationLoadError"
        role="alert"
      >
        {{ organizationLoadError$() }}
        <KButton
          :text="retryOrganizations$()"
          @click="loadOrganizations"
        />
      </p>
    </template>

    <template
      v-if="editableChannels.length"
      #cards
    >
      <StudioChannelCard
        v-for="channel in editableChannels"
        :key="channel.id"
        :headingLevel="2"
        :channel="channel"
        @click="onCardClick(channel)"
      >
        <template #footerActions>
          <ChannelStar
            :channelId="channel.id"
            :bookmark="channel.bookmark"
          />

          <KIconButton
            size="small"
            icon="optionsVertical"
            appearance="flat-button"
            :ariaLabel="strings.moreOptions$()"
            @click.stop
          >
            <template #menu>
              <KDropdownMenu
                :hasIcons="true"
                :options="getDropdownItems(channel)"
                @select="option => handleDropdownSelect(option, channel)"
              />
            </template>
          </KIconButton>
        </template>
      </StudioChannelCard>
    </template>

    <DeleteChannelModal
      v-if="deleteChannelId"
      :channelId="deleteChannelId"
      @close="deleteChannelId = null"
    />

    <ChannelTokenModal
      :value="Boolean(tokenChannel)"
      appendToOverlay
      data-testid="copy-modal"
      :channel="tokenChannel"
      @input="onTokenModalInput"
    />
  </StudioChannelsPage>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { useChannelList } from '../../../composables/useChannelList';
  import { useChannelOrganizationFilter } from '../../../composables/useChannelOrganizationFilter';
  import { RouteNames, InvitationShareModes } from '../../../constants';
  import StudioChannelsPage from '../StudioChannelsPage';
  import StudioChannelCard from '../StudioChannelCard';
  import ChannelStar from '../ChannelStar';
  import DeleteChannelModal from '../DeleteChannelModal';
  import { studioMyChannelsStrings as strings } from 'shared/strings/studioMyChannelsStrings';
  import ChannelTokenModal from 'shared/views/channel/ChannelTokenModal';
  import { ChannelListTypes } from 'shared/constants';
  import { redirectBrowser } from 'shared/utils/navigation';

  export default {
    name: 'StudioMyChannels',
    components: {
      StudioChannelsPage,
      StudioChannelCard,
      ChannelStar,
      DeleteChannelModal,
      ChannelTokenModal,
    },
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      const { loading, channels } = useChannelList({
        listType: ChannelListTypes.EDITABLE,
        sortFields: ['modified'],
        orderFields: ['desc'],
      });

      const {
        organizationFilter,
        organizationOptions,
        filteredChannels,
        filterByOrganization$,
        organizationLoadError,
        organizationLoadError$,
        retryOrganizations$,
        loadOrganizations,
      } = useChannelOrganizationFilter(channels);

      return {
        windowIsSmall,
        strings,
        loading,
        editableChannels: filteredChannels,
        organizationLoadError,
        organizationLoadError$,
        retryOrganizations$,
        loadOrganizations,
        organizationFilter,
        organizationOptions,
        filterByOrganization$,
      };
    },
    data() {
      return {
        deleteChannelId: null,
        tokenChannelId: null,
      };
    },
    computed: {
      ...mapGetters('channelList', ['invitations']),
      editInvitations() {
        return this.invitations.filter(i => i.share_mode === InvitationShareModes.EDIT);
      },
      tokenChannel() {
        if (!this.tokenChannelId) return null;
        return this.editableChannels.find(c => c.id === this.tokenChannelId) || null;
      },
    },
    created() {
      this.loadInvitationList();
    },
    methods: {
      ...mapActions('channelList', ['loadInvitationList']),
      onTokenModalInput(val) {
        if (!val) this.tokenChannelId = null;
      },
      newChannel() {
        this.$analytics.trackClick('channel_list', 'Create channel');
        this.$router.push({
          name: RouteNames.NEW_CHANNEL,
          query: { last: this.$route.name },
        });
      },
      newOrganization() {
        this.$router.push({ name: RouteNames.NEW_ORGANIZATION });
      },
      onCardClick(channel) {
        redirectBrowser(window.Urls.channel(channel.id));
      },
      getDropdownItems(channel) {
        const items = [
          { label: this.strings.editChannel$(), icon: 'edit', value: 'edit' },
          { label: this.strings.deleteChannel$(), icon: 'trash', value: 'delete' },
        ];
        if (channel.published) {
          items.push({ label: this.strings.copyToken$(), icon: 'copy', value: 'copy' });
        }
        if (channel.source_url) {
          items.push({
            label: this.strings.goToWebsite$(),
            icon: 'openNewTab',
            value: 'source-url',
          });
        }
        if (channel.demo_server_url) {
          items.push({ label: this.strings.viewContent$(), icon: 'openNewTab', value: 'demo-url' });
        }
        return items;
      },
      handleDropdownSelect(option, channel) {
        if (option.value === 'edit') {
          this.$router.push({
            name: RouteNames.CHANNEL_EDIT,
            query: { ...this.$route.query, last: this.$route.name },
            params: { channelId: channel.id, tab: 'edit' },
          });
        } else if (option.value === 'copy') {
          this.tokenChannelId = channel.id;
        } else if (option.value === 'delete') {
          this.deleteChannelId = channel.id;
        } else if (option.value === 'source-url') {
          window.open(channel.source_url, '_blank');
        } else if (option.value === 'demo-url') {
          window.open(channel.demo_server_url, '_blank');
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  .button-container {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-top: 20px;
  }

  .organization-actions {
    display: flex;
    gap: 16px;
    align-items: center;
    max-width: 100%;
    margin-inline-start: auto;
  }

  .organization-filter {
    width: 280px;
    min-width: 0;
    max-width: 100%;
  }

  .organization-actions.small-window {
    width: 100%;

    .organization-filter {
      flex: 1 1 auto;
      width: auto;
    }
  }

</style>
