<template>

  <VToolbar app dark color="purple" :tabs="Boolean($slots.tabs)">
    <VToolbarSideIcon href="/channels">
      <VImg maxHeight="35" contain :src="require('../images/kolibri-logo.svg')" />
    </VToolbarSideIcon>

    <VToolbarTitle class="white--text">
      Kolibri Studio Beta
    </VToolbarTitle>
    <VSpacer />

    <VToolbarTitle class="white--text">
      {{ $tr('helloUser', { username: user.first_name }) }}
    </VToolbarTitle>
    <VMenu offsetY>
      <template v-slot:activator="{ on }">
        <VBtn icon v-on="on">
          <VIcon>account_circle</VIcon>
        </VBtn>
      </template>

      <VList>
        <VListTile
          v-for="item in menuItems"
          :key="item.url"
          :href="item.url"
          :target="item.target"
        >
          <VListTileTitle v-text="item.label" />
        </VListTile>
      </VList>
    </VMenu>
    <template v-if="$slots.tabs" #extension>
      <VTabs
        fixedTabs
        color="transparent"
        sliderColor="white"
      >
        <slot name="tabs"></slot>
      </VTabs>
    </template>
  </VToolbar>

</template>


<script>

  import { mapState } from 'vuex';

  export default {
    name: 'AppBar',
    computed: {
      ...mapState({ user: state => state.session.currentUser }),
      menuItems() {
        const items = [
          {
            url: window.Urls.profile_settings(),
            label: this.$tr('settings'),
          },
          {
            url: 'http://kolibri-studio.readthedocs.io/en/latest/index.html',
            target: '_blank',
            label: this.$tr('help'),
          },
          {
            url: window.Urls.logout(),
            label: this.$tr('logOut'),
          },
        ];
        if (this.user.is_admin) {
          items.unshift({
            url: window.Urls.administration(),
            label: this.$tr('administration'),
          });
        }
        return items;
      },
    },
    $trs: {
      administration: 'Administration',
      settings: 'Settings',
      help: 'Help',
      logOut: 'Log Out',
      helloUser: 'Hello, { username }',
    },
  };

</script>
