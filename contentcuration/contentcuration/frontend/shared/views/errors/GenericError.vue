<template>

  <div>
    <AppError>
      <template #header>
        {{ $tr('genericErrorHeader') }}
      </template>
      <template #details>
        {{ $tr('genericErrorDetails') }}
      </template>
      <template #actions>
        <VLayout
          column
          align-center
        >
          <div class="mb-3">
            <VBtn
              color="primary"
              @click="reloadPage"
            >
              {{ $tr('refreshAction') }}
            </VBtn>
            <VBtn v-bind="backHomeLink">
              {{ $tr('backToHomeAction') }}
            </VBtn>
          </div>
          <KButton
            appearance="basic-link"
            :text="$tr('helpByReportingAction')"
            @click="showModal = true"
          />
        </VLayout>
      </template>
    </AppError>
    <!-- Modal here -->
    <ReportErrorModal
      v-if="showModal"
      :error="error.errorText"
      @cancel="showModal = false"
    />
  </div>

</template>


<script>

  import AppError from './AppError';
  import ReportErrorModal from './ReportErrorModal';

  export default {
    name: 'GenericError',
    components: {
      AppError,
      ReportErrorModal,
    },
    props: {
      backHomeLink: {
        type: Object,
        required: true,
      },
      error: {
        type: [Object, Error],
        required: true,
      },
    },
    data() {
      return {
        showModal: false,
      };
    },
    methods: {
      reloadPage() {
        global.location.reload();
      },
    },
    $trs: {
      genericErrorHeader: 'Sorry, something went wrong',
      genericErrorDetails: 'Try refreshing this page or going back to the home page',
      refreshAction: 'Refresh',
      backToHomeAction: 'Back to home',
      helpByReportingAction: 'Help us by reporting this error',
    },
  };

</script>


<style lang="scss" scoped></style>
