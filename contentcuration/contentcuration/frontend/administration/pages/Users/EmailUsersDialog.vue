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
            <VFlex>
              <ExpandableList
                v-if="query.ids"
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
                        :close="selected.length > 1"
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
                v-else
                small
              >
                {{ searchString }}
              </VChip>
            </VFlex>
          </VLayout>
          <VTextField
            v-model="subject"
            class="mt-4"
            box
            label="Subject line"
            required
            :rules="requiredRules"
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
          <VTextarea
            ref="message"
            v-model="message"
            box
            auto-grow
            label="Email body"
            required
            :rules="requiredRules"
          />
        </VCardText>
        <VCardActions data-test="buttons">
          <VSpacer />
          <VBtn
            data-test="cancel"
            flat
            @click="cancel"
          >
            Cancel
          </VBtn>
          <VBtn
            data-test="send"
            color="primary"
            type="submit"
          >
            Send email
          </VBtn>
        </VCardActions>
      </VForm>
      <ConfirmationDialog
        v-model="showWarning"
        title="Draft in progress"
        text="Draft will be lost upon exiting this editor. Are you sure you want to continue?"
        confirmButtonText="Discard draft"
        cancelButtonText="Keep open"
        data-test="confirm"
        @confirm="close"
      />
    </VCard>
  </VDialog>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import ConfirmationDialog from '../../components/ConfirmationDialog';
  import ExpandableList from 'shared/views/ExpandableList';

  export default {
    name: 'EmailUsersDialog',
    components: {
      ExpandableList,
      ConfirmationDialog,
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      query: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        subject: '',
        message: '',
        showWarning: false,
        selected: [],
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
        return this.getUsers(this.selected);
      },
      requiredRules() {
        return [v => Boolean(v.trim()) || 'Field is required'];
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
        const users = this.query.filter === 'all' ? '' : `${this.query.filter} `;
        const location = this.query.location ? ` from ${this.query.location}` : '';
        const keywords = this.query.keywords ? ` matching "${this.query.keywords}"` : '';
        return `All ${users}users${location}${keywords}`;
      },
    },
    watch: {
      value(value) {
        if (value && this.query.ids) {
          this.selected = this.query.ids;
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
        this.$refs.form.resetValidation();
      },
      emailHandler() {
        if (this.$refs.form.validate()) {
          const query = this.query.ids ? { ids: this.selected.join(',') } : this.query;

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
        this.selected = this.selected.filter(u => u !== id);
      },
    },
  };

</script>


<style lang="scss" scoped>

  ::v-deep .v-chip__close {
    padding-top: 4px;
  }

</style>
