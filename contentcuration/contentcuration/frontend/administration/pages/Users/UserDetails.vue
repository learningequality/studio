<template>

  <FullscreenModal v-if="user" v-model="dialog" color="black">
    <template #close>
      <VBtn flat exact style="font-size: 14pt; text-transform: none;" @click="dialog = false">
        <Icon class="mr-2">
          arrow_back
        </Icon>
        User list
      </VBtn>
    </template>
    <LoadingText v-if="loading" absolute />
    <VContainer v-else-if="details" classs="ml-5">
      <VLayout>
        <VSpacer />
        <UserActionsDropdown
          :userId="userId"
          color="greyBackground"
          data-test="dropdown"
          @deleted="dialog = false"
        />
      </VLayout>
      <h1>{{ user.name }}</h1>

      <!-- Basic information -->
      <h2 class="mt-4 mb-2">
        Basic information
      </h2>
      <DetailsRow label="Status" :text="user.is_active? 'Active' : 'Inactive'" />
      <DetailsRow v-if="user.is_admin" label="Privileges">
        <VLayout align-center>
          <VFlex shrink class="pr-2">
            Admin
          </VFlex>
          <ActionLink
            v-if="currentId !== userId"
            text="Remove admin privilege"
            data-test="revoke"
            @click="showRemoveAdminPrivileges = true"
          />
          <UserPrivilegeModal v-model="showRemoveAdminPrivileges" :userId="userId" />
        </VLayout>
      </DetailsRow>
      <DetailsRow label="Email" :text="user.email" />
      <DetailsRow
        label="Where do you plan to use Kolibri?"
        :text="details.locations? details.locations.join(', ') : 'N/A'"
      />
      <DetailsRow
        label="How did you hear about us?"
        :text="details.heard_from || 'N/A'"
      />
      <DetailsRow
        label="How do you plan to use Kolibri Studio?"
        :text="details.uses | formatList"
      />
      <DetailsRow
        label="Signed up on"
        :text="$formatDate(user.date_joined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })"
      />
      <DetailsRow
        label="Last active"
        :text="user.last_login? lastLogin : 'N/A'"
      />

      <!-- Disk space -->
      <h2 class="mt-5 mb-2">
        Disk space
      </h2>
      <h3>{{ storageUsed.toFixed() }}% storage used</h3>
      <div style="max-width: 600px;">
        <VProgressLinear
          :value="storageUsed"
          color="greenSuccess"
        />
      </div>
      <p>
        {{ formatFileSize(details.used_space) }} of {{ formatFileSize(user.disk_space) }}
      </p>
      <UserStorage :value="user.disk_space" :userId="userId" />

      <!-- Policies -->
      <h2 class="mt-5 mb-2">
        Policies accepted
      </h2>
      <VDataTable :headers="policyHeaders" :items="policies" hide-actions>
        <template #items="{item}">
          <tr>
            <td>{{ item.name }}</td>
            <td>{{ $formatDate(item.latest) }}</td>
            <td :class="{'red--text': !item.signed}">
              {{ item.lastSignedPolicy? $formatDate(item.lastSignedPolicy) : 'Not signed' }}
            </td>
            <td :class="{'red--text': !item.signed}">
              {{ item.signedOn? $formatDate(item.signedOn) : 'Not signed' }}
            </td>
          </tr>
        </template>
      </VDataTable>

      <!-- Channels -->
      <h2 class="mt-5 mb-2">
        Editing {{ user.edit_count | pluralChannels }}
      </h2>
      <p v-if="!user.edit_count" class="grey--text">
        No channels found
      </p>
      <div v-for="channel in details.edit_channels" :key="channel.id" class="mb-2">
        <ActionLink
          :text="channel.name"
          :href="`/channels/${channel.id}`"
          target="_blank"
        />
      </div>

      <h2 class="mt-5 mb-2">
        Viewing {{ user.view_count | pluralChannels }}
      </h2>
      <p v-if="!user.view_count" class="grey--text">
        No channels found
      </p>
      <div v-for="channel in details.viewonly_channels" :key="channel.id" class="mb-2">
        <ActionLink
          :text="channel.name"
          :href="`/channels/${channel.id}`"
          target="_blank"
        />
      </div>
    </VContainer>
  </FullscreenModal>

</template>


<script>

  import capitalize from 'lodash/capitalize';
  import { mapActions, mapGetters, mapState } from 'vuex';
  import UserStorage from './UserStorage';
  import UserActionsDropdown from './UserActionsDropdown';
  import UserPrivilegeModal from './UserPrivilegeModal';
  import { routerMixin, fileSizeMixin } from 'shared/mixins';
  import LoadingText from 'shared/views/LoadingText';
  import FullscreenModal from 'shared/views/FullscreenModal';
  import DetailsRow from 'shared/views/details/DetailsRow';
  import { requiredPolicies } from 'shared/constants';

  export default {
    name: 'UserDetails',
    components: {
      FullscreenModal,
      DetailsRow,
      LoadingText,
      UserStorage,
      UserActionsDropdown,
      UserPrivilegeModal,
    },
    filters: {
      formatList(value) {
        return value ? capitalize(value.join(', ')) : 'N/A';
      },
      pluralChannels(value) {
        return `${value} ${value === 1 ? 'channel' : 'channels'}`;
      },
    },
    mixins: [fileSizeMixin, routerMixin],
    props: {
      userId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        loading: true,
        loadError: false,
        details: {},
        showRemoveAdminPrivileges: false,
      };
    },
    computed: {
      ...mapState({
        currentId: state => state.session.currentUser.id.toString(),
      }),
      ...mapGetters('policies', ['getPolicies']),
      ...mapGetters('userAdmin', ['getUser']),
      dialog: {
        get() {
          return this.userId && this.$route.params.userId === this.userId;
        },
        set(value) {
          if (!value) {
            this.$router.push(this.backLink);
          }
        },
      },
      backLink() {
        return {
          name: this.$route.matched[0].name,
          query: this.$route.query,
          params: {
            ...this.$route.params,
            userId: null,
          },
        };
      },
      user() {
        return this.getUser(this.userId);
      },
      storageUsed() {
        return (this.details.used_space / this.user.disk_space) * 100;
      },
      lastLogin() {
        return capitalize(this.$formatRelative(this.user.last_login, { now: new Date() }));
      },
      policies() {
        return Object.entries(this.getPolicies(this.details.policies))
          .map(([key, value]) => {
            const lastSigned = value.lastSignedPolicy;
            return {
              key,
              name: capitalize(key.replaceAll('_', ' ')),
              signed: lastSigned && value.latest.getTime() >= lastSigned.getTime(),
              ...value,
            };
          })
          .filter(policy => requiredPolicies.includes(policy.key));
      },
      policyHeaders() {
        return [
          { text: 'Policy', align: 'left', sortable: false },
          { text: 'Latest version', align: 'left', sortable: false },
          { text: 'Signed version', align: 'left', sortable: false },
          { text: 'Signed on', align: 'left', sortable: false },
        ];
      },
    },
    beforeRouteEnter(to, from, next) {
      next(vm => {
        if (vm.user) {
          // Modal has already been opened
          vm.updateTabTitle(vm.user.name);
        }
      });
    },
    mounted() {
      this.load();
    },
    methods: {
      ...mapActions('userAdmin', ['loadUser', 'loadUserDetails']),
      load() {
        const userPromise = this.loadUser(this.userId);
        this.loading = true;
        return Promise.all([userPromise, this.loadUserDetails(this.userId)])
          .then(([user, details]) => {
            // User not found
            if (!user) {
              this.$router.replace(this.backLink);
              return;
            }
            this.updateTabTitle(user.name);
            this.details = details;
            this.loading = false;
          })
          .catch(() => {
            this.loading = false;
            this.loadError = true;
          });
      },
    },
  };

</script>


<style lang="less" scoped>

</style>
