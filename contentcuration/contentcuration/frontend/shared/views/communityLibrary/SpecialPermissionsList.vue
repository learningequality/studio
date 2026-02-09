<template>

  <div data-test="special-permissions-list">
    <div
      v-if="isLoading"
      class="loader-wrapper"
    >
      <KCircularLoader />
    </div>

    <template v-else-if="currentPagePermissions.length > 0">
      <div class="header-section">
        <div class="header-title">
          {{ specialPermissionsDetected$() }}
        </div>
        <div class="description">
          <slot name="description">
            {{ confirmDistributionRights$() }}
          </slot>
        </div>
      </div>
      <div class="permissions-box">
        <KCheckbox
          v-for="permission in currentPagePermissions"
          :key="permission.id"
          :checked="value.includes(permission.id)"
          :label="permission.description"
          class="permission-checkbox"
          :disabled="disabled"
          @change="togglePermission(permission.id)"
        />
      </div>

      <div
        v-if="totalPages > 1"
        class="pagination"
      >
        <KButton
          :disabled="currentPage === 1"
          appearance="flat-button"
          class="nav-button"
          icon="chevronLeft"
          @click="previousPage"
        >
          {{ previousPageAction$() }}
        </KButton>
        <span class="page-indicator">
          {{ pageIndicator$({ currentPage, totalPages }) }}
        </span>
        <KButton
          :disabled="currentPage === totalPages"
          appearance="flat-button"
          class="nav-button"
          iconAfter="chevronRight"
          @click="nextPage"
        >
          {{ nextPageAction$() }}
        </KButton>
      </div>
    </template>
  </div>

</template>


<script>

  import { computed, watch } from 'vue';
  import { useSpecialPermissions } from 'shared/composables/useSpecialPermissions';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

  export default {
    name: 'SpecialPermissionsList',
    components: {},
    setup(props, { emit }) {
      const {
        specialPermissionsDetected$,
        confirmDistributionRights$,
        previousPageAction$,
        nextPageAction$,
        pageIndicator$,
      } = communityChannelsStrings;

      const {
        permissions,
        currentPagePermissions,
        isLoading,
        currentPage,
        totalPages,
        nextPage,
        previousPage,
      } = useSpecialPermissions(props.channelVersionId);

      function togglePermission(permissionId) {
        const currentChecked = [...props.value];
        const index = currentChecked.indexOf(permissionId);
        if (index === -1) {
          currentChecked.push(permissionId);
        } else {
          currentChecked.splice(index, 1);
        }
        emit('input', currentChecked);
      }

      const allChecked = computed(() => {
        if (isLoading.value) return false;
        return permissions.value.every(p => props.value.includes(p.id));
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
        currentPage,
        totalPages,
        togglePermission,
        nextPage,
        previousPage,
        specialPermissionsDetected$,
        confirmDistributionRights$,
        previousPageAction$,
        nextPageAction$,
        pageIndicator$,
      };
    },
    props: {
      channelVersionId: {
        type: String,
        required: false,
        default: null,
      },
      value: {
        type: Array,
        required: false,
        default: () => [],
      },
      disabled: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    emits: ['input', 'update:allChecked'],
  };

</script>


<style scoped lang="scss">

  .header-section {
    margin-bottom: 8px;
  }

  .header-title {
    margin-bottom: 4px;
    font-weight: bold;
  }

  .description {
    margin-bottom: 12px;
    font-size: 14px;
    color: v-bind('$themePalette.grey.v_700');
  }

  .permissions-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px;
    background-color: v-bind('$themePalette.grey.v_100');
    border: 1px solid v-bind('$themePalette.grey.v_200');
    border-radius: 4px;
  }

  .permission-checkbox {
    margin: 0 !important;
    font-size: 14px !important;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
  }

  .page-indicator {
    font-size: 14px;
    color: v-bind('$themeTokens.text');
  }

  .loader-wrapper {
    display: flex;
    justify-content: center;
    padding: 20px;
  }

</style>
