<template>

  <VDialog
    v-model="show"
    width="600"
    max-width="100vw"
    persistent
  >
    <VCard class="px-2 py-3">
      <VCardTitle class="font-weight-bold pb-0 title"> Send email </VCardTitle>
      <VForm
        ref="form"
        lazy-validation
        @submit.prevent="emailHandler"
      >
        <VCardText class="pb-4 pt-3">
          <VLayout
            align-top
            row
            class="mb-2"
          >
            <VFlex
              shrink
              class="pa-2"
            >
              From:
            </VFlex>
            <VFlex>
              <VChip small>
                {{ senderEmail }}
              </VChip>
            </VFlex>
          </VLayout>
          <VLayout
            align-top
            row
          >
            <VFlex
              shrink
              class="pa-2"
            >
              To:
            </VFlex>
            <VFlex data-test="to-line">
              <ExpandableList
                v-if="initialRecipients"
                :items="users"
                :max="4"
                inline
                :delimit="false"
              >
                <template #item="{ item }">
                  <VTooltip
                    bottom
                    lazy
                  >
                    <template #activator="{ on }">
                      <VChip
                        small
                        :close="recipients.length > 1"
                        data-test="remove"
                        v-on="on"
                        @input="remove(item.id)"
                      >
                        <div style="max-width: 72px">
                          <div class="text-truncate">
                            {{ item.name }}
                          </div>
                        </div>
                      </VChip>
                    </template>
                    <span>{{ item.name }} &lt;{{ item.email }}&gt;</span>
                  </VTooltip>
                </template>
              </ExpandableList>
              <VChip
                v-else-if="usersFilterFetchQueryParams"
                small
              >
                {{ searchString }}
              </VChip>
            </VFlex>
          </VLayout>
          <KTextbox
            v-model="subject"
            class="mt-4"
            :label="'Subject line'"
            :required="true"
            :invalid="!subject.trim()"
            :invalidText="requiredRules(subject)[0]"
            :showLabel="true"
            :appearanceOverrides="{ maxWidth: '100%', width: '100%' }"
          />
          <div class="caption grey--text">Add placeholder to message</div>
          <div class="mb-1">
            <VBtn
              v-for="placeholder in placeholders"
              :key="`placeholder-${placeholder.label}`"
              small
              round
              depressed
              color="grey lighten-4"
              style="text-transform: none"
              @click="addPlaceholder(placeholder.placeholder)"
            >
              {{ placeholder.label }}
            </VBtn>
          </div>
          <KTextbox
            ref="message"
            v-model="message"
            label="Email body"
            :required="true"
            :invalid="!message.trim()"
            :invalidText="requiredRules(message)[0]"
            :showLabel="true"
            :appearanceOverrides="{
              maxWidth: '100%',
              width: '100%',
              height: '120px',
            }"
            type="textarea"
            :rows="3"
          />
        </VCardText>
        <VCardActions data-test="buttons">
          <VSpacer />
          <KButtonGroup>
            <KButton
              data-test="cancel"
              appearance="flat-button"
              :text="$tr('cancelButton')"
              @click="cancel"
            />
            <KButton
              data-test="send"
              appearance="raised-button"
              :primary="true"
              :text="$tr('sendButton')"
              type="submit"
            />
          </KButtonGroup>
        </VCardActions>
      </VForm>
      <KModal
        v-if="showWarning"
        :title="$tr('draftWarningTitle')"
        :submitText="$tr('discardDraftButton')"
        :cancelText="$tr('keepOpenButton')"
        data-test="confirm"
        @submit="close"
        @cancel="showWarning = false"
      >
        <p>{{ $tr('draftWarningText') }}</p>
      </KModal>
    </VCard>
  </VDialog>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import ExpandableList from 'shared/views/ExpandableList';

  export default {
    name: 'EmailUsersDialog',
    components: {
      ExpandableList,
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      userTypeFilter: {
        type: String,
        default: 'all',
      },
      locationFilter: {
        type: String,
        default: null,
      },
      keywordFilter: {
        type: String,
        default: null,
      },
      usersFilterFetchQueryParams: {
        type: Object,
        default: null,
      },
      initialRecipients: {
        type: Array,
        required: false,
        default: null,
      },
    },
    data() {
      return {
        subject: '',
        message: '',
        showWarning: false,
        recipients: [],
      };
    },
    computed: {
      ...mapGetters('userAdmin', ['getUsers']),
      show: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      users() {
        return this.getUsers(this.recipients);
      },
      requiredRules() {
        return value => {
          const isValid = Boolean(value && value.trim());
          return isValid ? [] : ['Field is required'];
        };
      },
      senderEmail() {
        return window.senderEmail;
      },
      placeholders() {
        return [
          {
            label: 'First name',
            placeholder: '{first_name}',
          },
          {
            label: 'Last name',
            placeholder: '{last_name}',
          },
          {
            label: 'Email',
            placeholder: '{email}',
          },
          {
            label: 'Date',
            placeholder: '{current_date}',
          },
          {
            label: 'Time',
            placeholder: '{current_time}',
          },
        ];
      },
      searchString() {
        const users = this.userTypeFilter === 'all' ? '' : `${this.userTypeFilter} `;
        const location = this.locationFilter ? ` from ${this.locationFilter}` : '';
        const keywords = this.keywordFilter ? ` matching "${this.keywordFilter}"` : '';
        return `All ${users}users${location}${keywords}`;
      },
    },
    watch: {
      value(value) {
        if (value && this.initialRecipients) {
          this.recipients = this.initialRecipients;
        }
      },
    },
    methods: {
      ...mapActions('userAdmin', ['sendEmail']),
      cancel() {
        if (this.subject.trim() || this.message.trim()) {
          this.showWarning = true;
        } else {
          this.close();
        }
      },
      close() {
        this.show = false;
        this.subject = '';
        this.message = '';
        this.showWarning = false;
      },
      emailHandler() {
        const isSubjectValid = this.requiredRules(this.subject).length === 0;
        const isMessageValid = this.requiredRules(this.message).length === 0;

        if (isSubjectValid && isMessageValid) {
          const query = this.initialRecipients
            ? { ids: this.recipients.join(',') }
            : this.usersFilterFetchQueryParams;

          this.sendEmail({
            query,
            subject: this.subject,
            message: this.message,
          })
            .then(() => {
              this.close();
              this.$store.dispatch('showSnackbarSimple', 'Email sent');
            })
            .catch(() => {
              this.$store.dispatch('showSnackbarSimple', 'Email failed to send');
            });
        }
      },
      addPlaceholder(placeholder) {
        this.message += ` ${placeholder}`;
        this.$refs.message.focus();
      },
      remove(id) {
        this.recipients = this.recipients.filter(u => u !== id);
      },
    },
    $trs: {
      draftWarningTitle: 'Draft in progress',
      draftWarningText:
        'Draft will be lost upon exiting this editor. Are you sure you want to continue?',
      discardDraftButton: 'Discard draft',
      keepOpenButton: 'Keep open',
      cancelButton: 'Cancel',
      sendButton: 'Send email',
    },
  };

</script>


<style lang="scss" scoped>

  ::v-deep .v-chip__close {
    padding-top: 4px;
  }

</style>
