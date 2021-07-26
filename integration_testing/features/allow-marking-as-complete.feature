Feature: Allow marking as complete
	This feature allows learners to manually mark a resource as complete in the learning platform. This option is available on all file types.

# Comment here

	Background: 
		Given I am signed into Studio
			And I am in an editable channel
		When I right click <resource>
		When I click *Edit details*
		Then I see the edit modal for <resource>
			And I see the *Allow marking as complete* checkbox in the *Completion* section

	Scenario: Toggle *Allow learners to mark as complete* setting
		Given the *Allow marking as complete* checkbox is empty
		When I click the *Allow marking as complete* checkbox
		Then I see the *Allow marking as complete* is selected
		When I click the selected *Allow marking as complete* checkbox
		Then I see the *Allow marking as complete* is empty

	Scenario: See that *Allow learners to mark as complete* is optional
		Given the *Allow marking as complete* checkbox of <resource> is empty
		When I click *FINISH*
		Then I see <resource> in the topic tree
			And I do not see an error icon

Examples:
| ???      | ??? | 
| ?????!?! |
