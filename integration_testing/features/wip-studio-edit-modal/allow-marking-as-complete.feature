Feature: Allow marking as complete
	This feature allows learners to manually mark a resource as complete in the learning platform. This option is available on all file types.

	Background: 
		Given I am signed into Studio
			And I am in an editable channel with all resource types
			And I see the *Edit details* modal for the <resource>
			And the *Allow marking as complete* checkbox is empty

	Scenario: Toggle *Allow learners to mark as complete* setting
		When I click the *Allow marking as complete* checkbox
		Then I see the *Allow marking as complete* is selected
		When I click the selected *Allow marking as complete* checkbox
		Then I see the *Allow marking as complete* is empty
		When I click *FINISH*
		Then I see the <resource> in the topic tree
			And I do not see an error icon
