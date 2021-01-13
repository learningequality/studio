<template>

  <div>
    <VNavigationDrawer
      v-model="drawer"
      fixed
      temporary
      style="z-index: 1000;"
      :right="$isRTL"
    >
      <VToolbar color="primary" dark>
        <VBtn flat icon @click="drawer = false">
          <Icon>clear</Icon>
        </VBtn>
        <VToolbarTitle class="notranslate">
          Kolibri Studio
        </VToolbarTitle>
      </VToolbar>
      <VList>
        <VListTile :href="channelsLink">
          <VListTileAction>
            <Icon>home</Icon>
          </VListTileAction>
          <VListTileContent class="subheading">
            <VListTileTitle>{{ $tr('channelsLink') }}</VListTileTitle>
          </VListTileContent>
        </VListTile>
        <VListTile v-if="user.is_admin" :href="administrationLink">
          <VListTileAction>
            <Icon>people</Icon>
          </VListTileAction>
          <VListTileContent class="subheading">
            <VListTileTitle>{{ $tr('administrationLink') }}</VListTileTitle>
          </VListTileContent>
        </VListTile>
        <VListTile :href="settingsLink" @click="trackClick('Settings')">
          <VListTileAction>
            <Icon>settings</Icon>
          </VListTileAction>
          <VListTileContent class="subheading">
            <VListTileTitle>{{ $tr('settingsLink') }}</VListTileTitle>
          </VListTileContent>
        </VListTile>
        <VListTile :href="helpLink" target="_blank" @click="trackClick('Help')">
          <VListTileAction>
            <Icon>open_in_new</Icon>
          </VListTileAction>
          <VListTileContent class="subheading">
            <VListTileTitle>{{ $tr('helpLink') }}</VListTileTitle>
          </VListTileContent>
        </VListTile>
        <VListTile @click="logout">
          <VListTileAction>
            <Icon>exit_to_app</Icon>
          </VListTileAction>
          <VListTileContent class="subheading">
            <VListTileTitle>{{ $tr('logoutLink') }}</VListTileTitle>
          </VListTileContent>
        </VListTile>
      </VList>
      <VContainer>
        <KolibriLogo :height="75" />
        <ActionLink
          :text="$tr('copyright', { year: new Date().getFullYear() })"
          href="https://learningequality.org/"
          target="_blank"
        />
        <p class="mt-4">
          <ActionLink
            :text="$tr('giveFeedback')"
            @click="showFeedbackForm"
          />
        </p>
      </VContainer>
    </VNavigationDrawer>
    <!-- Overwrite dark mode -->
    <span style="color: var(--v-grey-darken4);">
      <FeedbackForm v-model="showFeedbackDialog" />
    </span>

  </div>

</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import KolibriLogo from './KolibriLogo';
  import FeedbackForm from 'shared/views/errors/FeedbackForm';

  export default {
    name: 'MainNavigationDrawer',
    components: {
      KolibriLogo,
      FeedbackForm,
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        showFeedbackDialog: false,
      };
    },
    computed: {
      ...mapState({
        user: state => state.session.currentUser,
      }),
      drawer: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      channelsLink() {
        return window.Urls.channels();
      },
      administrationLink() {
        return window.Urls.administration();
      },
      settingsLink() {
        return window.Urls.settings();
      },
      helpLink() {
        return 'https://kolibri-studio.readthedocs.io/en/latest/index.html';
      },
    },
    methods: {
      ...mapActions(['logout']),
      showFeedbackForm() {
        this.showFeedbackDialog = true;
        this.drawer = false;
      },
      trackClick(label) {
        this.$analytics.trackClick('general', `User dropdown - ${label}`);
      },
    },
    $trs: {
      channelsLink: 'Channels',
      administrationLink: 'Administration',
      settingsLink: 'Settings',
      helpLink: 'Help and support',
      logoutLink: 'Sign out',
      copyright: '© {year} Learning Equality',
      giveFeedback: 'Give feedback',
    },
  };

</script>


<style lang="less" scoped>

</style>
