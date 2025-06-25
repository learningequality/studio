Feature: Copy resources

	Background:
		Given I am signed in to Studio
			And I am at the channel editor
			And there are folders and resources

	Scenario: Copy a resource via right click
		When I right click a folder or a resource
			And I select the *Make a copy* option from the menu
		Then I see a *Copying...* snackbar message
		When the copying operation has finished
		Then I see a *Copy operation complete UNDO* snackbar message
			And I see the newly copied folder or resource

	Scenario: Copy a resource via the selection bar
		When I select a folder or a resource's checkbox
		Then I see that the top bar changes to an actions bar
		When I click the *Make a copy* icon
		Then I see a *Copying...* snackbar message
		When the copying operation has finished
		Then I see a *Copy operation complete UNDO* snackbar message
			And I see the newly copied folder or resource

	Scenario: Copy multiple resources
		When I select multiple folders or resources
		Then I see that the top bar changes to an actions bar
		When I click the *Make a copy* icon
		Then I see a *Copying...* snackbar message
		When the copying operation has finished
		Then I see a *Copy operation complete UNDO* snackbar message
			And I see the newly copied folder or resource
