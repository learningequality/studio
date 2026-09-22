<template>

  <section>
    <h1>{{ loading ? strings.title$() : strings.count$({ count: migrations.length }) }}</h1>
    <KCircularLoader v-if="loading" />
    <p
      v-else-if="error"
      role="alert"
    >
      {{ strings.error$() }}
      <KButton
        :text="strings.retry$()"
        @click="load"
      />
    </p>
    <p v-else-if="!migrations.length">{{ strings.empty$() }}</p>
    <KTable
      v-else
      :caption="strings.title$()"
      :headers="headers"
      :rows="rows"
    >
      <template #cell="{ content, colIndex }">
        <KRouterLink
          v-if="colIndex === 0"
          class="notranslate"
          :text="content.name"
          :to="{ name: channelRoute, params: { channelId: content.id } }"
        />
        <KButton
          v-else-if="colIndex === 3"
          :text="strings.options$()"
          hasDropdown
          :disabled="Boolean(resolving)"
        >
          <template #menu>
            <KDropdownMenu
              :options="actions"
              @select="option => resolve(content, option.value)"
            />
          </template>
        </KButton>
        <span
          v-else
          class="notranslate"
          dir="auto"
        >{{ content }}</span>
      </template>
    </KTable>
  </section>

</template>


<script>

  import { computed, onMounted, ref } from 'vue';
  import { RouteNames } from '../../constants';
  import { Invitation } from 'shared/data/resources';
  import { createTranslator } from 'shared/i18n';

  const strings = createTranslator('MigrationTable', {
    title: { message: 'Contested migrations', context: 'Administration migration table heading' },
    count: {
      message: '{count, number} contested migrations',
      context: 'Number of pending migration requests',
    },
    channel: { message: 'Channel', context: 'Migration table column' },
    organization: { message: 'Organization', context: 'Migration table column' },
    user: { message: 'Requestor', context: 'Migration table column' },
    options: { message: 'Options', context: 'Migration actions menu' },
    accept: { message: 'Accept', context: 'Approve channel migration' },
    decline: { message: 'Decline', context: 'Reject channel migration' },
    empty: { message: 'No contested migrations', context: 'Empty migration table' },
    error: {
      message: 'Unable to load or resolve migrations. Please try again.',
      context: 'Migration API request failed',
    },
    retry: { message: 'Retry', context: 'Reload migration table' },
  });

  export default {
    name: 'MigrationTable',
    setup() {
      const migrations = ref([]);
      const loading = ref(true);
      const error = ref(false);
      const resolving = ref(null);
      const headers = computed(() =>
        ['channel', 'organization', 'user', 'options'].map(key => ({
          label: strings[`${key}$`](),
          columnId: key,
          dataType: 'string',
        })),
      );
      const rows = computed(() =>
        migrations.value.map(item => [
          { id: item.channel, name: item.channel_name },
          item.organization_name,
          item.sender_email,
          item.id,
        ]),
      );
      const actions = computed(() => [
        { label: strings.accept$(), value: 'accept' },
        { label: strings.decline$(), value: 'decline' },
      ]);
      async function load() {
        loading.value = true;
        error.value = false;
        try {
          const data = await Invitation.fetchCollection({ migration: true });
          migrations.value = Array.isArray(data) ? data : data.results;
        } catch (e) {
          error.value = true;
        } finally {
          loading.value = false;
        }
      }
      async function resolve(id, action) {
        resolving.value = id;
        error.value = false;
        try {
          await Invitation[action](id);
          migrations.value = migrations.value.filter(item => item.id !== id);
        } catch (e) {
          error.value = true;
        } finally {
          resolving.value = null;
        }
      }
      onMounted(load);
      return {
        strings,
        channelRoute: RouteNames.CHANNEL,
        migrations,
        loading,
        error,
        resolving,
        headers,
        rows,
        actions,
        load,
        resolve,
      };
    },
  };

</script>
