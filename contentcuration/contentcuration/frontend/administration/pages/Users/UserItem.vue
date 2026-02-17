<template>

  <tr :class="user.is_active ? '' : 'red--text'">
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
            v-if="user.is_admin"
            bottom
            z-index="200"
            lazy
          >
            <template #activator="{ on }">
              <span
                class="px-1 py-2"
                v-on="on"
              >
                <VIconWrapper color="light-green accent-4">$vuetify.icons.indicator</VIconWrapper>
              </span>
            </template>
            <span>Administrator</span>
          </VTooltip>
        </VFlex>
        <VFlex
          class="py-2 text-truncate"
          grow
          style="max-width: 200px"
        >
          <ActionLink
            :to="userModalLink"
            :text="user.name.trim() || '---'"
            :color="user.is_active ? 'primary' : 'red'"
          />
        </VFlex>
      </VLayout>
    </td>
    <td>{{ user.email }}</td>
    <td style="min-width: 175px">
      <!-- Using VMenu instead of VEditDialog to have more control over actions -->
      <BaseMenu
        v-if="user.is_active"
        v-model="showStorage"
        :close-on-content-click="false"
      >
        <template #activator="{ on }">
          {{ formatFileSize(user.disk_space) }}
          <VBtn
            icon
            small
            v-on="on"
          >
            <Icon icon="edit" />
          </VBtn>
        </template>
        <VCard style="min-width: 280px">
          <VCardText>
            <UserStorage
              :userId="userId"
              :value="user.disk_space"
              showCancel
              @close="showStorage = false"
            />
          </VCardText>
        </VCard>
      </BaseMenu>
      <span v-else>Inactive</span>
    </td>
    <td>
      {{ user.edit_count }}
      <VBtn
        icon
        small
        :to="searchUserChannelsLink"
        target="_blank"
      >
        <Icon icon="openNewTab" />
      </VBtn>
    </td>
    <td>{{ user.view_count }}</td>
    <td>
      {{
        $formatDate(user.date_joined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      }}
    </td>
    <td>
      <span v-if="user.last_login">
        {{ $formatRelative(user.last_login, { now: new Date() }) | capitalize }}
      </span>
      <span v-else> N/A </span>
    </td>
    <td class="text-xs-center">
      <UserActionsDropdown
        :userId="userId"
        flat
      />
    </td>
  </tr>

</template>


<script>

  import capitalize from 'lodash/capitalize';
  import { mapGetters } from 'vuex';
  import { RouteNames } from '../../constants';
  import UserActionsDropdown from './UserActionsDropdown';
  import UserStorage from './UserStorage';
  import { fileSizeMixin } from 'shared/mixins';
  import Checkbox from 'shared/views/form/Checkbox';

  export default {
    name: 'UserItem',
    components: {
      Checkbox,
      UserActionsDropdown,
      UserStorage,
    },
    filters: {
      capitalize,
    },
    mixins: [fileSizeMixin],
    props: {
      value: {
        type: Array,
        required: true,
      },
      userId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        showStorage: false,
      };
    },
    computed: {
      ...mapGetters('userAdmin', ['getUser']),
      selected: {
        get() {
          return this.value.includes(this.userId);
        },
        set(value) {
          this.$emit(
            'input',
            value ? this.value.concat([this.userId]) : this.value.filter(id => id !== this.userId),
          );
        },
      },
      user() {
        return this.getUser(this.userId);
      },
      userModalLink() {
        return {
          name: RouteNames.USER,
          params: { userId: this.userId },
          query: this.$route.query,
        };
      },
      searchUserChannelsLink() {
        return {
          name: RouteNames.CHANNELS,
          query: {
            keywords: `${this.user.name} ${this.user.email}`,
          },
        };
      },
    },
  };

</script>
