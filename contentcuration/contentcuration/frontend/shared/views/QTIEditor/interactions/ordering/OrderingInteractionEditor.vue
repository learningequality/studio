<template>

  <div class="ordering-layout">
    <!-- Prompt -->
    <div class="editor-section">
      <ValidationMessage v-if="promptHasError">
        {{ errorPromptRequired$() }}
      </ValidationMessage>
      <div
        class="field-label"
        :style="{ color: $themePalette.grey.v_700 }"
      >
        {{ questionLabel$() }}
      </div>
      <ClickableRegion
        :class="promptWrapperClass"
        :style="promptWrapperStyle"
        :suppressed="mode !== 'edit' || isPromptOpen"
        :aria-label="editQuestionLabel$()"
        @click="handlePromptClick"
      >
        <div
          class="item-card-text"
          :class="{ 'is-closed': !isPromptOpen }"
        >
          <TipTapEditor
            :value="state.prompt"
            :mode="isPromptOpen ? mode : 'view'"
            format="html"
            :minHeight="'80px'"
            :autofocus="isPromptOpen"
            :imageProcessor="EditorImageProcessor"
            :tabindex="-1"
            class="editor"
            @update="setPrompt"
            @minimize="closePrompt"
          />
        </div>
      </ClickableRegion>
    </div>

    <!-- Items list — edit mode or view mode -->
    <div
      v-if="mode === 'edit' || showAnswers"
      class="editor-section"
    >
      <ValidationMessage v-if="tooFewItemsError">
        {{ errorTooFewChoices$() }}
      </ValidationMessage>

      <!-- Section header -->
      <div class="ordering-headers">
        <div
          class="ordering-header-label"
          :style="{ color: $themePalette.grey.v_700 }"
        >
          {{ correctOrderLabel$() }}
        </div>
        <div
          v-if="mode === 'edit'"
          class="ordering-sublabel"
          :style="{ color: $themeTokens.annotation }"
        >
          {{ correctOrderDescription$() }}
        </div>
      </div>

      <!-- Item rows -->
      <DraggableRegion
        :items="state.items"
        :sortable="mode === 'edit'"
        @update:items="onReorderItems"
      >
        <!-- role is explicit: `list-style: none` drops the implicit one in Safari -->
        <ol
          class="items-list"
          role="list"
          :aria-label="correctOrderLabel$()"
        >
          <DraggableItem
            v-for="(item, index) in state.items"
            :key="item.id"
          >
            <li class="item-group">
              <!-- Bordered item card -->
              <ClickableRegion
                class="item-border"
                :class="getItemClasses(item)"
                :style="getItemStyle(item)"
                :suppressed="mode !== 'edit' || isItemOpen(item.id)"
                :aria-label="editAnswerOptionLabel$({ number: index + 1 })"
                @click="handleItemClick(item.id)"
              >
                <div
                  class="item-card-text"
                  :class="{ 'is-closed': isItemClosed(item.id) }"
                >
                  <div
                    class="item-layout"
                    :class="{
                      'is-open': isItemOpen(item.id),
                    }"
                  >
                    <!-- `@click.stop` so using the handle does not open the item for editing -->
                    <DraggableHandle v-if="mode === 'edit'">
                      <div
                        class="item-drag"
                        @click.stop
                      >
                        <DragSortWidget
                          :color="$themePalette.grey.v_700"
                          :isFirst="index === 0"
                          :isLast="index === state.items.length - 1"
                          :itemLabel="orderingItemLabel$({ number: index + 1 })"
                          :position="index + 1"
                          :total="state.items.length"
                          @moveUp="moveItemUp(item.id)"
                          @moveDown="moveItemDown(item.id)"
                        />
                      </div>
                    </DraggableHandle>

                    <!-- Position badge -->
                    <div
                      class="position-badge"
                      :style="{
                        backgroundColor: itemHasError(item.id)
                          ? $themePalette.red.v_100
                          : $themePalette.green.v_100,
                      }"
                      aria-hidden="true"
                    >
                      {{ index + 1 }}
                    </div>
                    <div class="item-content">
                      <TipTapEditor
                        :value="item.content"
                        :mode="isItemOpen(item.id) ? 'edit' : 'view'"
                        format="html"
                        :minHeight="'48px'"
                        :autofocus="isItemOpen(item.id)"
                        :imageProcessor="EditorImageProcessor"
                        :tabindex="-1"
                        class="editor"
                        @update="html => setItemContent(item.id, html)"
                        @minimize="closeItem"
                      />
                    </div>

                    <div
                      v-if="mode === 'edit'"
                      class="item-actions"
                      @click.stop
                    >
                      <KIconButton
                        icon="close"
                        :ariaLabel="deleteItemBtn$({ number: index + 1 })"
                        :tooltip="deleteItemBtn$({ number: index + 1 })"
                        :disabled="isOnlyItem"
                        :color="isOnlyItem ? $themeTokens.textDisabled : $themePalette.grey.v_700"
                        @click="removeItem(item.id)"
                      />
                    </div>
                  </div>
                </div>

                <!-- Per-item validation messages inside the bordered card -->
                <ValidationMessage
                  v-if="emptyItemIds.has(item.id)"
                  class="item-validation-message"
                >
                  {{ errorEmptyItemContent$() }}
                </ValidationMessage>
                <ValidationMessage
                  v-if="duplicateItemIds.has(item.id)"
                  class="item-validation-message"
                >
                  {{ errorDuplicateItemContent$() }}
                </ValidationMessage>
              </ClickableRegion>
            </li>
          </DraggableItem>
        </ol>
      </DraggableRegion>

      <!-- Add option button (edit only) -->
      <AddListItemButton
        v-if="mode === 'edit'"
        :label="addItemBtn$()"
        @click="onAddItem"
      />
    </div>
  </div>

</template>


<script>

  import { computed, ref, watch } from 'vue';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import { qtiEditorStrings } from '../../qtiEditorStrings';
  import { ValidationError } from '../../constants';
  import { useOrderingInteraction } from '../../composables/useOrderingInteraction';
  import ValidationMessage from '../../components/ValidationMessage/index.vue';
  import AddListItemButton from '../../components/AddListItemButton/index.vue';
  import ClickableRegion from '../../components/ClickableRegion/index.vue';
  import DraggableRegion from 'shared/views/dragSort/DraggableRegion.vue';
  import DraggableItem from 'shared/views/dragSort/DraggableItem.vue';
  import DraggableHandle from 'shared/views/dragSort/DraggableHandle.vue';
  import DragSortWidget from 'shared/views/dragSort/DragSortWidget/index.vue';
  import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor';
  import EditorImageProcessor from 'shared/views/TipTapEditor/TipTapEditor/services/imageService';

  export default {
    name: 'OrderingInteractionEditor',

    components: {
      TipTapEditor,
      ValidationMessage,
      AddListItemButton,
      ClickableRegion,
      DraggableRegion,
      DraggableItem,
      DraggableHandle,
      DragSortWidget,
    },

    setup(props, { emit }) {
      const tokens = themeTokens();

      const {
        questionLabel$,
        errorPromptRequired$,
        correctOrderLabel$,
        correctOrderDescription$,
        addItemBtn$,
        deleteItemBtn$,
        orderingItemLabel$,
        errorTooFewChoices$,
        errorEmptyItemContent$,
        errorDuplicateItemContent$,
        editQuestionLabel$,
        editAnswerOptionLabel$,
      } = qtiEditorStrings;

      const questionTypeRef = computed(() => props.questionType);

      const {
        state,
        bodyXml,
        responseDeclarations,
        errors,
        addItem,
        removeItem,
        moveItemUp,
        moveItemDown,
        setItemOrder,
        setItemContent,
        setPrompt,
      } = useOrderingInteraction(props.interaction, questionTypeRef);

      const isPromptOpen = ref(false);
      const openItemId = ref(null);

      function openPrompt() {
        isPromptOpen.value = true;
        openItemId.value = null;
      }

      function closePrompt() {
        isPromptOpen.value = false;
      }

      function openItem(id) {
        openItemId.value = id;
        isPromptOpen.value = false;
      }

      function closeItem() {
        openItemId.value = null;
      }

      function handlePromptClick() {
        if (props.mode !== 'edit') return;
        if (!isPromptOpen.value) {
          openPrompt();
        }
      }

      function handleItemClick(itemId) {
        if (props.mode !== 'edit') return;
        if (openItemId.value === itemId) return;
        openItem(itemId);
      }

      const workingInteraction = computed(() => ({
        bodyXml: bodyXml.value,
        responseDeclarations: responseDeclarations.value,
      }));

      watch(
        () => props.mode,
        newMode => {
          if (newMode === 'edit') {
            if (!state.value.prompt || !state.value.prompt.trim()) {
              openPrompt();
            } else if (state.value.items.length > 0) {
              openItem(state.value.items[0].id);
            }
            emit('update:interaction', workingInteraction.value);
          } else {
            isPromptOpen.value = false;
            openItemId.value = null;
          }
        },
        { immediate: true },
      );

      watch(workingInteraction, newVal => {
        if (props.mode !== 'edit') return;
        emit('update:interaction', newVal);
      });

      const isOnlyItem = computed(() => state.value.items.length <= 1);

      const errorCodes = computed(() => errors.value.map(e => e.code));

      const promptHasError = computed(() =>
        errorCodes.value.includes(ValidationError.PROMPT_REQUIRED),
      );

      const tooFewItemsError = computed(
        () => errors.value.length > 0 && errorCodes.value.includes(ValidationError.TOO_FEW_CHOICES),
      );

      const emptyItemIds = computed(
        () =>
          new Set(
            errors.value
              .filter(e => e.code === ValidationError.EMPTY_CHOICE_CONTENT)
              .map(e => e.id),
          ),
      );

      const duplicateItemIds = computed(
        () =>
          new Set(
            errors.value
              .filter(e => e.code === ValidationError.DUPLICATE_CHOICE_CONTENT)
              .map(e => e.id),
          ),
      );

      const isPromptEditing = computed(() => props.mode === 'edit' && isPromptOpen.value);

      const promptWrapperClass = computed(() => {
        if (isPromptEditing.value) {
          return 'prompt-wrapper';
        }
        return ['item-border', { 'is-clickable': props.mode === 'edit' }];
      });

      const promptWrapperStyle = computed(() => {
        if (isPromptEditing.value) return {};
        return {
          borderColor: promptHasError.value ? tokens.error : tokens.fineLine,
        };
      });

      function isItemClosed(id) {
        return props.mode !== 'edit' || openItemId.value !== id;
      }

      function isItemOpen(id) {
        return props.mode === 'edit' && openItemId.value === id;
      }

      function getItemClasses(item) {
        return {
          'is-clickable': props.mode === 'edit' && isItemClosed(item.id),
        };
      }

      function itemHasError(id) {
        return emptyItemIds.value.has(id) || duplicateItemIds.value.has(id);
      }

      function getItemStyle(item) {
        return { borderColor: itemHasError(item.id) ? tokens.error : tokens.fineLine };
      }

      function onAddItem() {
        addItem();
        const newIndex = state.value.items.length - 1;
        const newId = state.value.items[newIndex]?.id;
        if (newId) openItem(newId);
      }

      function onReorderItems(nextItems) {
        setItemOrder(nextItems.map(item => item.id));
      }

      return {
        EditorImageProcessor,
        state,
        isOnlyItem,
        promptHasError,
        tooFewItemsError,
        emptyItemIds,
        duplicateItemIds,
        isPromptOpen,
        promptWrapperClass,
        promptWrapperStyle,
        handlePromptClick,
        closePrompt,
        closeItem,
        isItemClosed,
        isItemOpen,
        getItemClasses,
        getItemStyle,
        itemHasError,
        handleItemClick,
        onAddItem,
        setItemContent,
        setPrompt,
        moveItemUp,
        moveItemDown,
        removeItem,
        onReorderItems,
        questionLabel$,
        errorPromptRequired$,
        correctOrderLabel$,
        correctOrderDescription$,
        addItemBtn$,
        deleteItemBtn$,
        orderingItemLabel$,
        errorTooFewChoices$,
        errorEmptyItemContent$,
        errorDuplicateItemContent$,
        editQuestionLabel$,
        editAnswerOptionLabel$,
      };
    },

    props: {
      interaction: {
        type: Object,
        required: true,
        validator: val => typeof val.bodyXml === 'string',
      },
      questionType: {
        type: String,
        default: null,
      },
      mode: {
        type: String,
        default: 'view',
        validator: val => ['view', 'edit'].includes(val),
      },
      showAnswers: {
        type: Boolean,
        default: false,
      },
    },

    emits: ['update:interaction'],
  };

</script>


<style lang="scss" scoped>

  .ordering-layout {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .editor-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field-label {
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 600;
  }

  .ordering-headers {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-bottom: 4px; /* Some spacing before the items list */
  }

  .ordering-header-label {
    font-size: 12px;
    font-weight: 600;
  }

  .ordering-sublabel {
    font-size: 12px;
    font-weight: 400;
  }

  /* Opaque, so a row dragged over the rows beneath it stays readable */
  .item-border {
    background-color: v-bind('$themeTokens.surface');
    border: 1px solid;
    border-radius: 4px;
    transition: background-color 0.3s;

    &.is-clickable {
      cursor: pointer;

      &:hover {
        background-color: v-bind('$themeTokens.fineLine');
      }
    }
  }

  .item-card-text {
    padding: 8px 16px;

    &.is-closed {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 52px;
      padding-top: 0;
      padding-bottom: 0;
    }
  }

  .prompt-wrapper {
    position: relative;
    padding: 4px 0;

    .item-card-text.is-closed {
      min-height: auto;
      padding: 0;
    }
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .item-group {
    display: flex;
    flex-direction: column;
  }

  .item-layout {
    display: flex;
    align-items: center;
    justify-content: space-between;

    &.is-open {
      align-items: flex-start;
    }
  }

  .item-drag {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    margin-right: 8px;
  }

  .position-badge {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    margin-right: 16px;
    font-size: 14px;
    font-weight: 700;
    border-radius: 4px;
  }

  .item-content {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .item-actions {
    display: flex;
    flex-shrink: 0;
    gap: 2px;
    align-items: center;
    margin-left: 8px;
  }

  .item-validation-message {
    padding: 7.5px;
  }

  .editor {
    width: 100%;
  }

</style>
