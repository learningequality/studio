<template>

  <section class="organization-field">
    <KSelect
      ref="organizationSelect"
      v-model="selected"
      :label="strings.label$()"
      :options="options"
      :disabled="performing || Boolean(pending)"
    />
    <KCircularLoader v-if="busy" />
    <p
      v-if="error"
      role="alert"
      :style="{ color: $themeTokens.error }"
    >
      {{ strings.error$() }}
      <KButton
        :text="strings.retry$()"
        @click="load"
      />
    </p>
    <p
      :id="noticeId"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ notice }}
    </p>
    <template v-if="pending">
      <KButton
        v-if="pending.can_decline"
        ref="declineButton"
        :aria-describedby="noticeId"
        :text="strings.decline$()"
        :disabled="busy"
        @click="decline"
      />
    </template>
    <template v-else-if="contested">
      <KButton
        ref="ticketButton"
        primary
        :text="strings.createTicket$()"
        :aria-describedby="noticeId"
        :disabled="busy"
        @click="createTicket"
      />
    </template>
    <KButton
      v-if="standalone"
      primary
      :text="strings.save$()"
      :disabled="blocked || !changed"
      @click="save"
    />
  </section>

</template>


<script>

  import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
  import uniqueId from 'lodash/uniqueId';
  import { Channel, Invitation } from 'shared/data/resources';
  import { createTranslator } from 'shared/i18n';

  const strings = createTranslator('ChannelOrganization', {
    label: { message: 'Channel organization', context: 'Organization selector label' },
    select: { message: 'Select an organization', context: 'Organization selector placeholder' },
    pending: {
      message: 'Migration to {organization} is awaiting review.',
      context: 'Pending channel migration notice',
    },
    declined: {
      message: 'Migration request declined.',
      context: 'Migration cancellation confirmation',
    },
    saved: { message: 'Channel organization saved.', context: 'Organization save confirmation' },
    contested: {
      message:
        'Migration cannot be done automatically. Create a ticket with website administrators below.',
      context: 'Contested channel migration notice',
    },
    createTicket: { message: 'Create ticket', context: 'Request a channel migration' },
    decline: { message: 'Decline', context: 'Cancel a channel migration request' },
    save: { message: 'Save organization', context: 'Save organization from administration' },
    error: {
      message: 'Unable to update the organization. Please try again.',
      context: 'Organization request failed',
    },
    retry: { message: 'Retry', context: 'Reload organization choices' },
  });

  export default {
    name: 'ChannelOrganization',
    setup(props, { emit }) {
      const organizationSelect = ref(null);
      const declineButton = ref(null);
      const ticketButton = ref(null);
      const noticeId = uniqueId('migration-notice-');
      const confirmation = ref('');
      const selected = ref(null);
      const organizations = ref([]);
      const current = ref(null);
      const pending = ref(null);
      const busy = ref(true);
      const performing = ref(false);
      const error = ref(false);
      const contested = ref(false);
      const notice = computed(() =>
        pending.value
          ? strings.pending$({ organization: pending.value.organization_name })
          : contested.value
            ? strings.contested$()
            : confirmation.value,
      );
      let requestNumber = 0;
      const options = computed(() => [
        ...(!current.value ? [{ value: null, label: strings.select$() }] : []),
        ...organizations.value.map(org => ({ value: org.id, label: org.name })),
      ]);
      const changed = computed(() =>
        Boolean(
          !pending.value &&
            selected.value &&
            selected.value.value &&
            selected.value.value !== current.value,
        ),
      );
      const blocked = computed(
        () => changed.value && (busy.value || error.value || contested.value),
      );
      watch(blocked, value => emit('blocked', value), { immediate: true });
      watch(changed, value => emit('changed', value));

      async function load() {
        const request = ++requestNumber;
        busy.value = true;
        error.value = false;
        contested.value = false;
        try {
          const state = await Channel.checkOrganizationMigration(props.channelId);
          if (request !== requestNumber) return;
          organizations.value = state.organizations;
          current.value = state.organization;
          if (
            state.organization &&
            !organizations.value.some(org => org.id === state.organization)
          ) {
            organizations.value = [
              ...organizations.value,
              { id: state.organization, name: state.organization_name },
            ];
          }
          pending.value = state.pending;
          if (
            state.pending &&
            !organizations.value.some(org => org.id === state.pending.organization)
          ) {
            organizations.value = [
              ...organizations.value,
              { id: state.pending.organization, name: state.pending.organization_name },
            ];
          }
          const value = state.organization;
          selected.value = options.value.find(option => option.value === value) || {
            value: null,
            label: strings.select$(),
          };
        } catch (e) {
          if (request === requestNumber) error.value = true;
        } finally {
          if (request === requestNumber) busy.value = false;
        }
      }

      watch(
        () => selected.value && selected.value.value,
        async value => {
          const request = ++requestNumber;
          confirmation.value = '';
          if (pending.value || !value || value === current.value) {
            busy.value = false;
            contested.value = false;
            return;
          }
          busy.value = true;
          error.value = false;
          try {
            const state = await Channel.checkOrganizationMigration(props.channelId, value);
            if (request !== requestNumber) return;
            pending.value = state.pending;
            contested.value = !state.pending && !state.uncontested;
          } catch (e) {
            if (request === requestNumber) error.value = true;
          } finally {
            if (request === requestNumber) busy.value = false;
          }
        },
      );

      async function perform(action, successMessage = '') {
        if (busy.value) return false;
        performing.value = true;
        busy.value = true;
        error.value = false;
        try {
          await action();
          await load();
          if (!error.value) confirmation.value = successMessage;
          return !error.value;
        } catch (e) {
          error.value = true;
          busy.value = false;
          return false;
        } finally {
          performing.value = false;
          await nextTick();
          const button = pending.value
            ? declineButton.value
            : contested.value
              ? ticketButton.value
              : null;
          if (button) button.$el.focus();
          else if (!pending.value)
            organizationSelect.value?.$el.querySelector('[tabindex="0"]')?.focus();
        }
      }
      function createTicket() {
        return perform(() => Invitation.createMigration(props.channelId, selected.value.value));
      }
      function decline() {
        return perform(() => Invitation.decline(pending.value.id), strings.declined$());
      }
      async function save() {
        if (blocked.value) return false;
        if (pending.value || !changed.value) return true;
        return perform(
          () => Channel.migrateOrganization(props.channelId, selected.value.value),
          strings.saved$(),
        );
      }
      watch(() => props.channelId, load, { immediate: true });
      onBeforeUnmount(() => {
        requestNumber += 1;
      });
      return {
        organizationSelect,
        declineButton,
        ticketButton,
        noticeId,
        notice,
        strings,
        selected,
        options,
        pending,
        busy,
        performing,
        error,
        contested,
        blocked,
        changed,
        load,
        createTicket,
        decline,
        save,
      };
    },
    props: {
      channelId: { type: String, required: true },
      standalone: { type: Boolean, default: false },
    },
  };

</script>


<style scoped>

  .organization-field {
    max-width: 480px;
    margin: 24px 0;
  }

</style>
