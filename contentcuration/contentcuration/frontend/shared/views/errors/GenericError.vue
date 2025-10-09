<template>

  <div>
    <StudioAppError>
      <template #header>
        {{ $tr('genericErrorHeader') }}
      </template>
      <template #details>
        {{ $tr('genericErrorDetails') }}
      </template>
      <template #actions>
        <KButtonGroup>
          <KButton
            :primary="true"
            :text="$tr('refreshAction')"
            @click="reloadPage"
          />
          <KButton
            :text="$tr('backToHomeAction')"
            @click="backToHomeAction"
          />
        </KButtonGroup>
        <div style="margin-top: 1rem">
          <KButton
            appearance="basic-link"
            :text="$tr('helpByReportingAction')"
            @click="showModal = true"
          />
        </div>
      </template>
    </StudioAppError>
    <!-- Modal here -->
    <ReportErrorModal
      v-if="showModal"
      :error="error.errorText"
      @cancel="showModal = false"
    />
  </div>

</template>


<script>

  import StudioAppError from './StudioAppError';
  import ReportErrorModal from './ReportErrorModal';

  export default {
    name: 'GenericError',
    components: {
      StudioAppError,
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
      backToHomeAction() {
        this.$router.push(this.backHomeLink).catch(e => {
          if (e.name === 'NavigationDuplicated') {
            this.reloadPage();
          }
        });
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
