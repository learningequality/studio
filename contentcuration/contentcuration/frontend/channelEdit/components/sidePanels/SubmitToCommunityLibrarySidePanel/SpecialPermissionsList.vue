<template>

  <div data-test="special-permissions-list">
    <div class="header-section">
      <div class="title">
        {{ specialPermissionsDetected$() }}
      </div>
      <div class="description">
        {{ confirmDistributionRights$() }}
      </div>
    </div>

    <div
      v-if="isLoading"
      class="loader-wrapper"
    >
      <KCircularLoader />
    </div>

    <template v-else-if="currentPagePermissions.length > 0">
      <div class="permissions-box">
        <KCheckbox
          v-for="permission in currentPagePermissions"
          :key="permission.id"
          :checked="checkedIds.includes(permission.id)"
          :label="permission.description"
          class="permission-checkbox"
          @change="togglePermission(permission.id)"
        />
      </div>

      <div
        v-if="totalPages > 1"
        class="pagination"
      >
        <KButton
          :disabled="currentPage === 1"
          appearance="basic-link"
          class="nav-button"
          @click="previousPage"
        >
          &lt; Previous
        </KButton>
        <span class="page-indicator">{{ currentPage }} of {{ totalPages }}</span>
        <KButton
          :disabled="currentPage === totalPages"
          appearance="basic-link"
          class="nav-button"
          @click="nextPage"
        >
          Next &gt;
        </KButton>
      </div>
    </template>
  </div>

</template>


<script>

  import { computed, watch } from 'vue';
  import { themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { useSpecialPermissions } from './composables/useSpecialPermissions';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

  const { specialPermissionsDetected$, confirmDistributionRights$ } = communityChannelsStrings;

  export default {
    name: 'SpecialPermissionsList',
    components: {},
    setup(props, { emit }) {
      const paletteTheme = themePalette();
      const permissionIdsRef = computed(() => {
        const ids = props.permissionIds || [];
        return ids;
      });

      const {
        permissions,
        currentPagePermissions,
        isLoading,
        currentPage,
        totalPages,
        nextPage,
        previousPage,
      } = useSpecialPermissions(permissionIdsRef);

      function togglePermission(permissionId) {
        const currentChecked = [...props.modelValue];
        const index = currentChecked.indexOf(permissionId);
        if (index === -1) {
          currentChecked.push(permissionId);
        } else {
          currentChecked.splice(index, 1);
        }
        emit('update:modelValue', currentChecked);
      }

      const allChecked = computed(() => {
        if (!permissions.value || permissions.value.length === 0) {
          return true;
        }
        return permissions.value.every(p => props.modelValue.includes(p.id));
      });

      watch(
        allChecked,
        val => {
          emit('update:allChecked', val);
        },
        { immediate: true },
      );

      return {
        currentPagePermissions,
        isLoading,
        checkedIds: computed(() => props.modelValue),
        currentPage,
        totalPages,
        togglePermission,
        nextPage,
        previousPage,
        specialPermissionsDetected$,
        confirmDistributionRights$,
        paletteTheme,
      };
    },
    model: {
      prop: 'modelValue',
      event: 'update:modelValue',
    },
    props: {
      permissionIds: {
        type: Array,
        required: false,
        default: () => [],
      },
      modelValue: {
        type: Array,
        required: false,
        default: () => [],
      },
    },
    emits: ['update:modelValue', 'update:allChecked'],
  };

</script>


<style scoped lang="scss">

  .header-section {
    margin-bottom: 8px;
  }

  .title {
    margin-bottom: 4px;
    font-weight: bold;
  }

  .description {
    margin-bottom: 12px;
    font-size: 14px;
  }

  .permissions-box {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background-color: v-bind('paletteTheme.grey.v_100');
    border: 1px solid v-bind('paletteTheme.grey.v_200');
    border-radius: 4px;
  }

  .permission-checkbox {
    margin: 0;
    font-size: 14px;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 8px;
    margin-top: 8px;
  }

  .page-indicator {
    font-size: 14px;
    color: v-bind('$themeTokens.text');
  }

  .nav-button {
    color: v-bind('paletteTheme.grey.v_700') !important;
    text-decoration: none;
  }

  .loader-wrapper {
    display: flex;
    justify-content: center;
    padding: 20px;
  }

</style>
