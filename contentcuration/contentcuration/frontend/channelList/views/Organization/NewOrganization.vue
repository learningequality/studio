<template>

  <KPageContainer class="form-page">
    <h1>{{ $tr('title') }}</h1>
    <KTextbox
      v-model="name"
      :label="$tr('nameLabel')"
      :maxlength="200"
      :invalid="nameInvalid"
      :invalidText="$tr('nameRequired')"
      :showInvalidText="nameInvalid"
      @input="nameInvalid = false"
    />
    <KTextbox
      v-model="description"
      class="field"
      textArea
      :label="$tr('descriptionLabel')"
    />
    <KCheckbox
      class="field"
      :checked="isPublic"
      :label="$tr('publicLabel')"
      :description="$tr('publicDescription')"
      @change="value => (isPublic = value)"
    />
    <p
      v-if="saveError"
      role="alert"
    >
      {{ $tr('saveError') }}
    </p>
    <div class="actions">
      <KButton
        :text="$tr('cancel')"
        @click="$router.push({ name: routeNames.ORGANIZATIONS })"
      />
      <KButton
        primary
        :disabled="saving"
        :text="$tr('create')"
        @click="submit"
      />
    </div>
  </KPageContainer>

</template>


<script>

  import { ref } from 'vue';
  import { useRouter } from 'vue-router/composables';
  import { RouteNames } from '../../constants';
  import { Organization } from 'shared/data/resources';

  export default {
    name: 'NewOrganization',
    setup() {
      const router = useRouter();
      const name = ref('');
      const description = ref('');
      const isPublic = ref(false);
      const nameInvalid = ref(false);
      const saveError = ref(false);
      const saving = ref(false);

      async function submit() {
        if (!name.value.trim()) {
          nameInvalid.value = true;
          return;
        }
        saving.value = true;
        saveError.value = false;
        try {
          const organization = await Organization.create({
            name: name.value.trim(),
            description: description.value.trim(),
            public: isPublic.value,
          });
          await router.push({
            name: RouteNames.ORGANIZATION_DETAILS,
            params: { organizationId: organization.id },
          });
        } catch (e) {
          saveError.value = true;
        } finally {
          saving.value = false;
        }
      }

      return {
        name,
        description,
        isPublic,
        nameInvalid,
        saveError,
        saving,
        submit,
        routeNames: RouteNames,
      };
    },
    $trs: {
      title: 'New organization',
      nameLabel: 'Organization name',
      descriptionLabel: 'Organization description',
      publicLabel: 'Public',
      publicDescription: 'Allow users outside this organization to find and view it',
      cancel: 'Cancel',
      create: 'Create organization',
      saveError: 'There was a problem creating the organization.',
      nameRequired: 'Organization name is required',
    },
  };

</script>


<style scoped>

  .form-page {
    max-width: 720px;
    margin: 32px auto;
  }

  .field {
    margin-top: 24px;
  }

  .actions {
    display: flex;
    gap: 16px;
    justify-content: flex-end;
    margin-top: 32px;
  }

</style>
