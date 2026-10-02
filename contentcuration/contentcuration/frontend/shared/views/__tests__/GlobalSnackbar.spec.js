
import { mount } from "@vue/test-utils";
import GlobalSnackbar from "../GlobalSnackbar.vue";
import KSnackbar from "kolibri-design-system/lib/KSnackbar/KSnackbar.vue";
import useKSnackbar from "kolibri-design-system/lib/composables/useKSnackbar";

jest.mock("kolibri-design-system/lib/composables/useKSnackbar");

describe("GlobalSnackbar", () => {
  let mockClearSnackbar;
  let mockSnackbarOptions;
  let mockSnackbarIsVisible;

  beforeEach(() => {
    mockClearSnackbar = jest.fn();
    mockSnackbarOptions = {
      text: "Test Snackbar",
      actionText: "Action",
      actionCallback: jest.fn(),
      hideCallback: jest.fn(),
    };
    mockSnackbarIsVisible = true;

    useKSnackbar.mockReturnValue({
      snackbarIsVisible: mockSnackbarIsVisible,
      snackbarOptions: mockSnackbarOptions,
      clearSnackbar: mockClearSnackbar,
    });
  });

  function makeWrapper() {
    return mount(GlobalSnackbar, {});
  }

  it("renders the snackbar text", () => {
    const wrapper = makeWrapper();
    expect(wrapper.text()).toContain("Test Snackbar");
  });

  it("renders the snackbar action correctly", () => {
    const wrapper = makeWrapper();
    expect(wrapper.text()).toContain("Action");
  });

  it("clicking the action calls the action callback and closes the snackbar", async () => {
    const wrapper = makeWrapper();
    wrapper.findComponent(KSnackbar).vm.$emit("actionClick");
    
    expect(mockSnackbarOptions.actionCallback).toHaveBeenCalled();
    expect(mockClearSnackbar).toHaveBeenCalled();
  });

  it("closing the snackbar calls hideCallback when provided", async () => {
    const wrapper = makeWrapper();
    wrapper.findComponent(KSnackbar).vm.$emit("close");
    
    expect(mockSnackbarOptions.hideCallback).toHaveBeenCalled();
    expect(mockClearSnackbar).toHaveBeenCalled();
  });
});

