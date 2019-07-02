import _ from 'underscore';
import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import { modes } from '../constants';
import EditModal from './../views/EditModal.vue';
import EditList from './../views/EditList.vue';
import EditView from './../views/EditView.vue';
import { localStore, mockFunctions } from './data.js';
import State from 'edit_channel/state';

const targetNode = {
  title: 'test',
  metadata: {},
};

State.current_channel = {
  get: () => targetNode,
};
State.preferences = {};

Vue.use(Vuetify);

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

function _generateNode(props = {}) {
  return {
    id: Math.random()
      .toString(36)
      .substring(7),
    kind: 'topic',
    prerequisite: [],
    is_prerequisite_of: [],
    ...props,
  };
}
const testNodes = [_generateNode(), _generateNode()];

function makeWrapper(props = {}) {
  let wrapper = mount(EditModal, {
    store: localStore,
    attachToDocument: true,
    propsData: props,
  });
  // wrapper.setData({debouncedSave: jest.fn()});
  return wrapper;
}

describe('editModal', () => {
  let wrapper;
  beforeEach(() => {
    localStore.commit('edit_modal/SET_NODES', testNodes);
    wrapper = makeWrapper();
    wrapper.vm.dialog = true;
    mockFunctions.copyNodes.mockReset();
    mockFunctions.saveNodes.mockReset();
  });
  describe('on render', () => {
    it('should show correct header', () => {
      _.each(_.values(modes), mode => {
        localStore.commit('edit_modal/SET_MODE', mode);
        expect(wrapper.find('.v-toolbar__title').text()).toContain(wrapper.vm.$tr(mode));
        expect(wrapper.find({ ref: 'savebutton' }).exists()).toBe(mode !== modes.VIEW_ONLY);
        expect(wrapper.find({ ref: 'copybutton' }).exists()).toBe(mode === modes.VIEW_ONLY);
      });
    });
    it('should have EditList and EditView components', () => {
      expect(wrapper.find(EditView).exists()).toBe(true);
      expect(wrapper.find(EditList).exists()).toBe(true);
    });
  });
  describe('navigation drawer', () => {
    it("should be hidden if there's one item in edit or view only mode", () => {
      localStore.commit('edit_modal/SET_NODES', [testNodes[0]]);
      localStore.commit('edit_modal/SET_MODE', modes.VIEW_ONLY);
      expect(wrapper.find(EditList).exists()).toBe(false);
      localStore.commit('edit_modal/SET_MODE', modes.EDIT);
      expect(wrapper.find(EditList).exists()).toBe(false);
      localStore.commit('edit_modal/SET_MODE', modes.NEW_EXERCISE);
      expect(wrapper.find(EditList).exists()).toBe(true);
      localStore.commit('edit_modal/SET_MODE', modes.NEW_TOPIC);
      expect(wrapper.find(EditList).exists()).toBe(true);
    });
    it('should be shown in all modes if there are more than one nodes', () => {
      localStore.commit('edit_modal/SET_MODE', modes.VIEW_ONLY);
      expect(wrapper.find(EditList).exists()).toBe(true);
      localStore.commit('edit_modal/SET_MODE', modes.NEW_TOPIC);
      expect(wrapper.find(EditList).exists()).toBe(true);
      localStore.commit('edit_modal/SET_MODE', modes.EDIT);
      expect(wrapper.find(EditList).exists()).toBe(true);
      localStore.commit('edit_modal/SET_MODE', modes.NEW_EXERCISE);
      expect(wrapper.find(EditList).exists()).toBe(true);
    });
  });
  describe('on copy', () => {
    beforeEach(() => {
      localStore.commit('edit_modal/SET_MODE', modes.VIEW_ONLY);
    });
    it('should call copyNodes on click', () => {
      expect(mockFunctions.copyNodes).not.toHaveBeenCalled();
      wrapper.find({ ref: 'copybutton' }).trigger('click');
      expect(mockFunctions.copyNodes).toHaveBeenCalled();
    });
    it('should open an alert when there is related content', () => {
      wrapper.find({ ref: 'copybutton' }).trigger('click');
      expect(
        wrapper
          .find({ ref: 'relatedalert' })
          .find('.v-dialog')
          .isVisible()
      ).toBe(false);
      localStore.commit('edit_modal/SET_NODES', [_generateNode({ prerequisite: ['test'] })]);
      wrapper.find({ ref: 'copybutton' }).trigger('click');
      expect(
        wrapper
          .find({ ref: 'relatedalert' })
          .find('.v-dialog')
          .isVisible()
      ).toBe(true);
    });
  });
  describe('on open', () => {
    beforeEach(() => {
      localStore.commit('edit_modal/SET_MODE', modes.EDIT);
    });
    it('should not automatically create a new item on EDIT mode', () => {
      let originalLength = localStore.state.edit_modal.nodes.length;
      wrapper.vm.openModal();
      expect(originalLength).toEqual(localStore.state.edit_modal.nodes.length);
    });
    it('should automatically select a node', () => {
      localStore.commit('edit_modal/RESET_SELECTED');
      wrapper.vm.openModal();
      wrapper.vm.$nextTick(() => {
        expect(localStore.state.edit_modal.selectedIndices).toHaveLength(1);
      });
    });
    it('should automatically create a new item on NEW_TOPIC mode', () => {
      localStore.commit('edit_modal/SET_MODE', modes.NEW_TOPIC);
      let originalLength = localStore.state.edit_modal.nodes.length;
      wrapper.vm.openModal();
      expect(localStore.state.edit_modal.nodes.length).toEqual(originalLength + 1);
    });
    it('should automatically create a new item on NEW_EXERCISE mode', () => {
      localStore.commit('edit_modal/SET_MODE', modes.NEW_EXERCISE);
      let originalLength = localStore.state.edit_modal.nodes.length;
      wrapper.vm.openModal();
      expect(localStore.state.edit_modal.nodes.length).toEqual(originalLength + 1);
    });
  });
  describe('on close', () => {
    beforeEach(() => {
      localStore.commit('edit_modal/SET_MODE', modes.EDIT);
    });
    it('should trigger when closebutton is clicked', () => {
      expect(wrapper.find({ ref: 'editmodal' }).isVisible()).toBe(true);
      wrapper.find({ ref: 'closebutton' }).trigger('click');
      expect(wrapper.vm.dialog).toBe(false);
    });
    it('should catch unsaved changes', () => {});
  });
});
//       <VToolbar>
//         <VToolbarItems>
//           <VFlex v-if="!isViewOnly" alignCenter class="last-saved-time">
//             <div v-if="saveError">
//               {{ $tr('saveFailedText') }}
//             </div>
//             <div v-else-if="invalidNodes.length">
//               {{ $tr('autosaveDisabledMessage', {count: invalidNodes.length}) }}
//             </div>
//             <div v-else-if="saving">
//               <VProgressCircular indeterminate size="15" width="2" color="white" />
//               {{ $tr('savingIndicator') }}
//             </div>
//             <div v-else-if="lastSaved">
//               {{ savedMessage }}
//             </div>
//           </VFlex>
//           <VBtn v-if="!isViewOnly" dark flat @click="handleSave">
//             {{ $tr('saveButtonText') }}
//           </VBtn>
//         </VToolbarItems>
//       </VToolbar>

//   <!-- Dialog for catching unsaved changes -->
//   <Dialog ref="saveprompt" :header="$tr('unsavedChanges')" :text="$tr('unsavedChangesText')">
//     <template v-slot:buttons>
//       <VBtn flat color="primary" @click="closeModal">
//         {{ $tr('dontSaveButton') }}
//       </VBtn>
//       <VSpacer />
//       <VBtn flat color="primary" @click="dismissPrompt">
//         {{ $tr('cancelButton') }}
//       </VBtn>
//       <VBtn depressed color="primary" @click="handleSave">
//         {{ $tr('saveButton') }}
//       </VBtn>
//     </template>
//   </Dialog>

//   <!-- Alert for failed save -->
//   <Alert
//     ref="savefailedalert"
//     :header="$tr('saveFailedHeader')"
//     :text="$tr('saveFailedText')"
//   />

// const SAVE_TIMER = 5000;
// const SAVE_MESSAGE_TIMER = 10000;

// export default {
//   name: 'EditModal',
//   data() {
//     return {
//       dialog: false,
//       lastSaved: null,
//       saving: false,
//       savedMessage: null,
//       saveError: false,
//       interval: null,
//       updateInterval: null,
//       drawer: {
//         open: true,
//       },
//       debouncedSave: _.debounce(() => {
//         if (!this.invalidNodesOverridden.length) {
//           this.saveContent()
//             .then(() => {
//               this.updateSavedTime();
//               this.updateInterval = setInterval(this.updateSavedTime, SAVE_MESSAGE_TIMER);
//             })
//             .catch(() => (this.saveError = true));
//         }
//       }, SAVE_TIMER),
//     };
//   },
//   computed: {
//     ...mapState('edit_modal', ['nodes', 'changes', 'mode', 'targetNode']),
//     ...mapGetters('edit_modal', ['changed', 'invalidNodes', 'invalidNodesOverridden']),
//   },
//   watch: {
//     changes: {
//       deep: true,
//       handler() {
//         if (this.changed) this.debouncedSave();
//       },
//     },
//   },
//   methods: {
//     ...mapActions('edit_modal', ['saveNodes', 'copyNodes']),
//     ...mapMutations('edit_modal', {
//       select: 'SELECT_NODE',
//       deselectAll: 'RESET_SELECTED',
//       reset: 'RESET_STATE',
//       prepareForSave: 'PREP_NODES_FOR_SAVE',
//       setNode: 'SET_NODE',
//       addNodeToList: 'ADD_NODE',
//     }),
//     createNode() {
//       let titleArgs = { parent: this.targetNode.title };
//       if (this.mode === modes.NEW_TOPIC) {
//         this.addNodeToList({
//           title: this.$tr('topicDefaultTitle', titleArgs),
//           kind: 'topic',
//         });
//       } else if (this.mode === modes.NEW_EXERCISE) {
//         this.addNodeToList({
//           title: this.$tr('exerciseDefaultTitle', titleArgs),
//           kind: 'exercise',
//         });
//       }
//     },
//     updateSavedTime() {
//       this.savedMessage = this.$tr('savedMessage', {
//         relativeTime: this.$formatRelative(this.lastSaved),
//       });
//     },
//     saveContent() {
//       this.saveError = false;
//       return new Promise((resolve, reject) => {
//         clearInterval(this.updateInterval);
//         if (this.invalidNodesOverridden.length) {
//           resolve();
//         } else {
//           this.saving = true;
//           this.saveNodes()
//             .then(() => {
//               this.lastSaved = Date.now();
//               this.saving = false;
//               resolve();
//             })
//             .catch(reject);
//         }
//       });
//     },
//     handleSave() {
//       // Prepare for save sets all as not new and
//       // activates validation on all nodes
//       this.prepareForSave();
//       if (this.invalidNodes.length) {
//         this.setNode(this.invalidNodes[0]);
//       } else {
//         this.saveContent()
//           .then(this.closeModal)
//           .catch(() => {
//             this.$refs.savefailedalert.prompt();
//             this.dismissPrompt();
//           });
//       }
//     },
//     handleClose() {
//       this.debouncedSave.cancel();
//       if (this.changed) {
//         this.$refs.saveprompt.prompt();
//       } else {
//         this.closeModal();
//       }
//     },
//     dismissPrompt() {
//       this.$refs.saveprompt.close();
//       this.debouncedSave();
//     }
//   },
// };
