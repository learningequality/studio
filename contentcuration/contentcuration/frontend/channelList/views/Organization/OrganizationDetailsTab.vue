<template>

  <div class="organization-details-tab">
    <div
      v-if="loading"
      class="loader"
    >
      <KCircularLoader />
    </div>

    <template v-else>
      <span class="thumbnail-placeholder">
        <KIcon
          :color="$themePalette.grey.v_400"
          class="thumbnail-placeholder-icon"
          icon="image"
        />
      </span>

      <h2>{{ $tr('organizationDetails') }}</h2>

      <p
        v-if="!isAdmin"
        class="view-only-notice"
      >
        {{ $tr('viewOnlyNotice') }}
      </p>

      <KTextbox
        v-model="name"
        data-test="name-input"
        :label="$tr('nameLabel')"
        :maxlength="200"
        :disabled="!isAdmin"
        :invalid="Boolean(nameError)"
        :invalidText="nameError"
        :showInvalidText="Boolean(nameError)"
        @input="nameError = ''"
      />

      <KTextbox
        v-model="description"
        data-test="description-input"
        textArea
        :label="$tr('descriptionLabel')"
        :disabled="!isAdmin"
        style="margin-top: 16px"
      />

      <KCheckbox
        :checked="isPublic"
        :label="$tr('publicLabel')"
        :description="$tr('publicDescription')"
        :disabled="!isAdmin"
        style="margin-top: 16px"
        @change="value => (isPublic = value)"
      />

      <KButton
        v-if="isAdmin"
        appearance="raised-button"
        primary
        class="save-button"
        :text="isNew ? $tr('createOrganization') : $tr('saveChanges')"
        :disabled="saving"
        @click="submit"
      />
    </template>
  </div>

</template>


<script>

  import useSnackbar from 'shared/composables/useSnackbar';

  export default {
    name: 'OrganizationDetailsTab',
    setup() {
      const { createSnackbar } = useSnackbar();
      return { createSnackbar };
    },
    props: {
      organization: {
        type: Object,
        default: null,
      },
      loading: {
        type: Boolean,
        default: false,
      },
      save: {
        type: Function,
        required: true,
      },
      isNew: {
        type: Boolean,
        default: false,
      },
      isAdmin: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        name: '',
        description: '',
        isPublic: false,
        nameError: '',
        saving: false,
      };
    },
    watch: {
      organization: {
        immediate: true,
        handler(organization) {
          if (organization) {
            this.name = organization.name || '';
            this.description = organization.description || '';
            this.isPublic = Boolean(organization.public);
          }
        },
      },
    },
    methods: {
      submit() {
        if (!this.name.trim()) {
          this.nameError = this.$tr('nameRequired');
          return;
        }
        this.saving = true;
        this.save({
          name: this.name.trim(),
          description: this.description.trim(),
          public: this.isPublic,
        })
          .then(organization => {
            if (this.isNew) {
              this.createSnackbar(this.$tr('organizationCreated'));
              this.$emit('created', organization.id);
            } else {
              this.createSnackbar(this.$tr('changesSaved'));
            }
          })
          .finally(() => {
            this.saving = false;
          });
      },
    },
    $trs: {
      organizationDetails: 'Organization details',
      nameLabel: 'Organization name',
      descriptionLabel: 'Organization description',
      nameRequired: 'Organization name is required',
      viewOnlyNotice: 'Only organization admins can edit these details.',
      publicLabel: 'Public',
      publicDescription: 'If this organization can be seen by users outside the organization',
      saveChanges: 'Save changes',
      createOrganization: 'Create organization',
      changesSaved: 'Changes saved',
      organizationCreated: 'Organization created',
    },
  };

</script>


<style lang="scss" scoped>

  .loader {
    margin: 84px auto;
    text-align: center;
  }

  .thumbnail-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 120px;
    height: 120px;
    border: 1px solid v-bind('$themeTokens.fineLine');
    border-radius: 8px;
  }

  .thumbnail-placeholder-icon {
    width: 50%;
    height: 50%;
  }

  .view-only-notice {
    margin-top: 16px;
  }

  .save-button {
    margin-top: 24px;
  }

</style>
