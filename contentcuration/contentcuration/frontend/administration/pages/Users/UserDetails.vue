<template>

  <FullscreenModal v-if="user" v-model="dialog">
    <template #close>
      <VBtn flat exact style="font-size: 14pt; text-transform: none;" @click="dialog = false">
        <Icon class="mr-2" icon="back" :color="$themeTokens.textInverted" />
        User list
      </VBtn>
    </template>
    <LoadingText v-if="loading" absolute />
    <VCardText v-else-if="details">
      <VCard flat class="px-5">
        <Banner error :value="!user.is_active" class="mb-4">
          This user has been deactivated
        </Banner>
        <VLayout>
          <VSpacer />
          <UserActionsDropdown
            :userId="userId"
            color="greyBackground"
            data-test="dropdown"
            @deleted="dialog = false"
          />
        </VLayout>
        <h1>{{ userFullName }}</h1>

        <!-- Basic information -->
        <h2 class="mb-2 mt-4">
          Basic information
        </h2>
        <DetailsRow label="Privileges" :text="user.is_admin ? 'Admin' : 'Default'" />
        <DetailsRow label="Email" :text="user.email" />
        <DetailsRow
          label="Where do you plan to use Kolibri?"
          :text="details.locations ? details.locations.join(', ') : 'N/A'"
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
          :text="user.last_login ? lastLogin : 'N/A'"
        />

        <!-- Disk space -->
        <h2 class="mb-2 mt-5">
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

        <!-- Feature flags -->
        <h2 class="mb-2 mt-5">
          Feature flags
        </h2>
        <VDataTable
          :headers="featureFlagHeaders"
          :items="featureFlags"
          class="user-table"
          hide-actions
        >
          <template #items="{ item }">
            <tr>
              <td>{{ item.title }}</td>
              <td>{{ item.description }}</td>
              <td>
                <KSwitch
                  :value="featureFlagValue(item.key)"
                  :disabled="loading"
                  title="Toggle feature"
                  @input="handleFeatureFlagChange(item.key, $event)"
                />
              </td>
            </tr>
          </template>
        </VDataTable>

        <!-- Policies -->
        <h2 class="mb-2 mt-5">
          Policies accepted
        </h2>
        <VDataTable
          :headers="policyHeaders"
          :items="policies"
          class="user-table"
          hide-actions
        >
          <template #items="{ item }">
            <tr>
              <td>{{ item.name }}</td>
              <td>{{ $formatDate(item.latest) }}</td>
              <td :class="{ 'red--text': !item.isUpToDate }">
                {{ item.lastSigned ? $formatDate(item.lastSigned) : 'Not signed' }}
              </td>
              <td :class="{ 'red--text': !item.isUpToDate }">
                {{ item.signed ? $formatDate(item.signed ) : 'Not signed' }}
              </td>
            </tr>
          </template>
        </VDataTable>

        <!-- Channels -->
        <h2 class="mb-2 mt-5">
          Editing {{ details.edit_channels.length | pluralChannels }}
        </h2>
        <p v-if="!details.edit_channels.length" class="grey--text">
          No channels found
        </p>
        <div v-for="channel in details.edit_channels" :key="channel.id" class="mb-2">
          <ActionLink
            :text="channel.name"
            :href="channelUrl(channel)"
            target="_blank"
          />
        </div>

        <h2 class="mb-2 mt-5">
          Viewing {{ details.viewonly_channels.length | pluralChannels }}
        </h2>
        <p v-if="!details.viewonly_channels.length" class="grey--text">
          No channels found
        </p>
        <div v-for="channel in details.viewonly_channels" :key="channel.id" class="mb-2">
          <ActionLink
            :text="channel.name"
            :href="channelUrl(channel)"
            target="_blank"
          />
        </div>
      </VCard>
    </VCardText>
  </FullscreenModal>

</template>


<script>

  import capitalize from 'lodash/capitalize';
  import { mapActions, mapGetters } from 'vuex';
  import { RouteNames } from '../../constants';
  import UserStorage from './UserStorage';
  import UserActionsDropdown from './UserActionsDropdown';
  import { routerMixin, fileSizeMixin } from 'shared/mixins';
  import LoadingText from 'shared/views/LoadingText';
  import FullscreenModal from 'shared/views/FullscreenModal';
  import DetailsRow from 'shared/views/details/DetailsRow';
  import Banner from 'shared/views/Banner';
  import {
    createPolicyKey,
    policyDates,
    requiredPolicies,
    FeatureFlagsSchema,
  } from 'shared/constants';

  function getPolicyDate(dateString) {
    const [date, time] = dateString.split(' ');
    const [day, month, year] = date.split('/');
    return date && new Date(`${month}/${day}/${year} ${time}`);
  }

  export default {
    name: 'UserDetails',
    components: {
      FullscreenModal,
      DetailsRow,
      LoadingText,
      UserStorage,
      UserActionsDropdown,
      Banner,
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
      };
    },
    computed: {
      ...mapGetters('userAdmin', ['getUser']),
      dialog: {
        get() {
          return this.userId && this.$route.params.userId === this.userId;
        },
        set(value) {
          if (!value && this.$route.name === RouteNames.USER) {
            this.$router.push(this.backLink);
          }
        },
      },
      backLink() {
        return {
          name: RouteNames.USERS,
          query: this.$route.query,
        };
      },
      user() {
        return this.getUser(this.userId);
      },
      userFullName() {
        // Return full name if `user.name` is not being returned in getter
        if (this.user.name) {
          return this.user.name;
        } else {
          return this.user.first_name + ' ' + this.user.last_name;
        }
      },
      storageUsed() {
        return (this.details.used_space / this.user.disk_space) * 100;
      },
      lastLogin() {
        return capitalize(this.$formatRelative(this.user.last_login, { now: new Date() }));
      },
      policies() {
        /**
         * Get list of policies and whether the user has signed them
         *
         * Returns dict:
         *   {
         *     key: <str>, policy name (e.g. terms_of_service)
         *     name: <str>, readable policy name (e.g. Terms of service)
         *     latest: <date>, date of latest policy version available
         *     signed: <date>, date user signed the policy last
         *     lastSigned: <date>, date of policy version user signed last
         *     isUpToDate: <boolean>, whether the user has signed the latest policy
         *   }
         * */
        return requiredPolicies.map(policyName => {
          // Get most recent policy information
          const latest = policyDates[policyName];
          const latestPolicyKey = createPolicyKey(policyName, latest);

          // Get policy version the user signed last (if available)
          const lastSignedPolicyVersion = Object.keys(this.details.policies)
            .filter(p => p.startsWith(policyName))
            .sort()
            .reverse()[0];
          const lastSigned =
            lastSignedPolicyVersion &&
            new Date(
              lastSignedPolicyVersion
                .split('_')
                .slice(-3)
                .join('-')
            );

          // Get when the user signed the policy last (if available)
          let signed;
          if (lastSignedPolicyVersion) {
            signed = getPolicyDate(this.details.policies[lastSignedPolicyVersion]);
          }
          return {
            key: policyName,
            name: capitalize(policyName.replaceAll('_', ' ')),
            latest,
            signed,
            lastSigned,
            isUpToDate: lastSignedPolicyVersion === latestPolicyKey,
          };
        });
      },
      policyHeaders() {
        return [
          { text: 'Policy', align: 'left', sortable: false },
          { text: 'Latest version', align: 'left', sortable: false },
          { text: 'Signed version', align: 'left', sortable: false },
          { text: 'Signed on', align: 'left', sortable: false },
        ];
      },
      featureFlags() {
        return Object.entries(FeatureFlagsSchema.properties)
          .map(([key, schema]) => ({
            key,
            ...schema,
          }))
          .filter(featureFlag => {
            // Exclude those with `$env` flag that doesn't match current env
            return !featureFlag['$env'] || featureFlag['$env'] === process.env.NODE_ENV;
          });
      },
      featureFlagHeaders() {
        return [
          { text: 'Feature', align: 'left', sortable: false },
          { text: 'Description', align: 'left', sortable: false },
          { text: 'Visibility', align: 'left', sortable: false },
        ];
      },
      featureFlagValue() {
        return function(key) {
          return this.loading
            ? false
            : (this.details && this.details.feature_flags && this.details.feature_flags[key]) ||
                false;
        };
      },
    },
    beforeRouteEnter(to, from, next) {
      next(vm => {
        if (vm.user) {
          // Modal has already been opened
          vm.updateTitleForPage();
        }
      });
    },
    beforeMount() {
      return this.load();
    },
    methods: {
      ...mapActions('userAdmin', ['loadUser', 'loadUserDetails', 'updateUser']),
      channelUrl(channel) {
        return window.Urls.channel(channel.id);
      },
      updateTitleForPage() {
        this.updateTabTitle(`${this.userFullName} - Users - Administration`);
      },
      load() {
        const userPromise = this.loadUser(this.userId);
        this.loading = true;
        return Promise.all([userPromise, this.loadUserDetails(this.userId)])
          .then(([user, details]) => {
            // User not found
            if (!user) {
              this.$router.replace(this.backLink).catch(() => {});
              return;
            }
            this.updateTitleForPage();
            this.details = details;
            this.loading = false;
          })
          .catch(error => {
            this.loadError = true;
            this.$store.dispatch('errors/handleAxiosError', error);
          });
      },
      handleFeatureFlagChange(key, value) {
        // Don't try to update on server if it hasn't changed
        if (Boolean(this.details.feature_flags[key]) === value) {
          return;
        }

        // Merge current state
        const update = { [key]: value };
        this.details.feature_flags = {
          ...(this.details.feature_flags || {}),
          ...update,
        };

        // Only send updated values since it will require validation and lingering
        // flags could exist in user's flags data
        return this.updateUser({
          id: this.userId,
          feature_flags: update,
        }).then(() => {
          this.$store.dispatch(
            'showSnackbarSimple',
            value ? 'Feature enabled' : 'Feature disabled'
          );
        });
      },
    },
  };

</script>


<style lang="scss" scoped>

  .user-table {
    max-width: 1024px;
  }

</style>
