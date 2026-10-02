
import { mount } from "@vue/test-utils";
import useKSnackbar from "kolibri-design-system/lib/composables/useKSnackbar";
import GlobalSnackbar from "../GlobalSnackbar.vue";

describe("GlobalSnackbar", () => {
  let actionCallback;
  let hideCallback;

  beforeEach(() => {
    actionCallback = jest.fn();
    hideCallback = jest.fn();
    const { clearSnackbar } = useKSnackbar();
    clearSnackbar(); // ensure clean state
  });

  function makeWrapper() {
    return mount(GlobalSnackbar, {
      stubs: {
        KSnackbar: true
      }
    });
  }

  it("renders the snackbar text", async () => {
    const { createSnackbar } = useKSnackbar();
    createSnackbar({ text: "Test Snackbar", announce: true });
    const wrapper = makeWrapper();
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.snackbarOptions.text).toBe("Test Snackbar");
  });

  it("renders the snackbar action correctly", async () => {
    const { createSnackbar } = useKSnackbar();
    createSnackbar({ text: "Test Snackbar", actionText: "Action", announce: true });
    const wrapper = makeWrapper();
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.snackbarOptions.actionText).toBe("Action");
  });

  it("clicking the action calls the action callback and closes the snackbar", async () => {
    const { createSnackbar, snackbarIsVisible } = useKSnackbar();
    createSnackbar({
      text: "Test Snackbar",
      actionText: "Action",
      actionCallback,
      hideCallback,
      announce: true,
    });
    const wrapper = makeWrapper();
    await wrapper.vm.$nextTick();

    // Simulate action click on the stub
    wrapper.findComponent({ name: "KSnackbar" }).vm.$emit("actionClick");

    expect(actionCallback).toHaveBeenCalledTimes(1);
    expect(hideCallback).toHaveBeenCalledTimes(1);
    expect(snackbarIsVisible.value).toBe(false);
  });

  it("closing the snackbar calls hideCallback exactly once when provided", async () => {
    const { createSnackbar, snackbarIsVisible } = useKSnackbar();
    createSnackbar({
      text: "Test Snackbar",
      hideCallback,
      announce: true,
    });

    const wrapper = makeWrapper();
    await wrapper.vm.$nextTick();

    wrapper.findComponent({ name: "KSnackbar" }).vm.$emit("close");

    expect(hideCallback).toHaveBeenCalledTimes(1);
    expect(snackbarIsVisible.value).toBe(false);
  });
});

