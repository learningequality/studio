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

      <h2>{{ organizationStrings.organizationDetails$() }}</h2>

      <p
        v-if="!isAdmin"
        class="view-only-notice"
      >
        {{ organizationStrings.adminAccessRequiredForEdits$() }}
      </p>

      <KTextbox
        v-model="name"
        data-test="name-input"
        :label="organizationStrings.nameLabel$()"
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
        :label="organizationStrings.descriptionLabel$()"
        :disabled="!isAdmin"
        style="margin-top: 16px"
      />

      <KButton
        v-if="isAdmin"
        appearance="raised-button"
        primary
        class="save-button"
        :text="isNew ? organizationStrings.createOrganization$() : organizationStrings.saveChanges$()"
        :disabled="saving"
        @click="submit"
      />
    </template>
  </div>

</template>


<script>

  import { getApiErrorMessage } from '../../utils';
  import { organizationStrings } from 'shared/strings/organizationStrings';
  import useSnackbar from 'shared/composables/useSnackbar';

  export default {
    name: 'OrganizationDetailsTab',
    setup() {
      const { createSnackbar } = useSnackbar();
      return { createSnackbar, organizationStrings };
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
          }
        },
      },
    },
    methods: {
      submit() {
        if (!this.name.trim()) {
          this.nameError = organizationStrings.nameRequired$();
          return;
        }
        this.saving = true;
        this.save({
          name: this.name.trim(),
          description: this.description.trim(),
        })
          .then(organization => {
            if (this.isNew) {
              this.createSnackbar(organizationStrings.organizationCreated$());
              this.$emit('created', organization.id);
            } else {
              this.createSnackbar(organizationStrings.changesSaved$());
            }
          })
          .catch(error => {
            this.createSnackbar(getApiErrorMessage(error, organizationStrings.saveError$()));
          })
          .finally(() => {
            this.saving = false;
          });
      },
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
