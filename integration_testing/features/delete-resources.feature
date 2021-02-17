Feature: Delete resources permanently

	Background: 
		Given I am signed in to Studio as a non-admin user
			And I am on the channel editor page
			And I have one removed resource from my channel editor tree

	Scenario: Delete a single resource permanently
		When I click the *Trash* button in the top appbar
		Then I see one resource removed from my channel
		When I select that resource
			And I click *Delete* in the bottom bar
		Then I see a warning message appear
		When I click the *Delete permanently* button
		Then the selection disappear from the list
			And a snackbar appears to confirm the deletion
			And I see an empty state message

	Scenario: Delete multiple resources permanently
		When I click the *Trash* button in the top appbar
		Then I see a list of resources removed from my channel
		When I select multiple resources from the list
			And I click *Delete* in the bottom bar
		Then I see a warning message appear
		When I click the *Delete permanently* button
		Then the selections disappear from the list
			And a snackbar appears to confirm the deletion of multiple resources