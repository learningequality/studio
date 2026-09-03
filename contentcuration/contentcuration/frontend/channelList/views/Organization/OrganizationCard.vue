<template>

  <KCard
    class="organization"
    :headingLevel="headingLevel"
    data-testid="organization-card"
    thumbnailDisplay="none"
    :title="organization.name"
    @click="$emit('click')"
  >
    <template #title="{ titleText }">
      <KTextTruncator
        class="notranslate"
        dir="auto"
        :text="titleText"
        :maxLines="2"
      />
    </template>

    <template #belowTitle>
      <div class="below-title">
        <span>{{ roleLabel }}</span>
        <div
          v-if="organization.description"
          class="desc notranslate"
          dir="auto"
          :style="{ color: $themeTokens.text }"
        >
          {{ organization.description }}
        </div>
      </div>
    </template>

    <template #footer>
      <div class="footer">
        <KIconButton
          icon="optionsVertical"
          appearance="flat-button"
          :ariaLabel="$tr('moreOptions', { name: organization.name })"
          data-test="organization-options"
          @click.stop
        >
          <template #menu>
            <KDropdownMenu
              :options="dropdownOptions"
              @select="handleDropdownSelect"
            />
          </template>
        </KIconButton>
      </div>
    </template>
  </KCard>

</template>


<script>

  import { OrganizationRoles, OrganizationEditTabs, RouteNames } from '../../constants';

  export default {
    name: 'OrganizationCard',
    props: {
      organization: {
        type: Object,
        required: true,
      },
      headingLevel: {
        type: Number,
        required: true,
      },
    },
    computed: {
      roleLabel() {
        const labels = {
          [OrganizationRoles.ADMIN]: this.$tr('adminRole'),
          [OrganizationRoles.EDITOR]: this.$tr('editorRole'),
          [OrganizationRoles.VIEWER]: this.$tr('viewerRole'),
        };
        return labels[this.organization.role] || '';
      },
      dropdownOptions() {
        return [{ label: this.$tr('editOrganization'), icon: 'edit', value: 'edit' }];
      },
    },
    methods: {
      handleDropdownSelect(option) {
        if (option.value === 'edit') {
          this.$router.push({
            name: RouteNames.ORGANIZATION_EDIT,
            params: { organizationId: this.organization.id, tab: OrganizationEditTabs.DETAILS },
            query: { ...this.$route.query, last: this.$route.name },
          });
        }
      },
    },
    $trs: {
      adminRole: 'Admin',
      editorRole: 'Editor',
      viewerRole: 'Viewer',
      moreOptions: 'More options for {name}',
      editOrganization: 'Edit organization',
    },
  };

</script>


<style lang="scss" scoped>

  .organization {
    width: 100%;
  }

  .below-title {
    font-size: 14px;
  }

  .desc {
    margin-top: 12px;
  }

  .footer {
    display: flex;
    justify-content: flex-end;
  }

</style>
