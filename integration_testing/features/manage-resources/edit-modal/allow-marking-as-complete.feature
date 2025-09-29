Feature: Allow marking as complete
	This feature allows learners to manually mark a resource as complete in the learning platform. This option is available on all file types.

	Background:
		Given I am signed into Studio
			And I am in an editable channel with all resource types
			And I see the *Edit details* modal for a resource
			And the *Allow marking as complete* checkbox is not checked

	Scenario: Toggle *Allow learners to mark as complete* setting
		When I select the *Allow marking as complete* checkbox
		 And I click the *Finish* button
		Then I see the resource in the topic tree
			And I do not see an error icon

	Scenario: Uncheck the *Allow learners to mark as complete* setting
		Given the *Allow marking as complete* checkbox is checked
		When I uncheck the selected *Allow marking as complete* checkbox
			And I click the *Finish* button
		Then I see the resource in the topic tree
			And I do not see an error icon
