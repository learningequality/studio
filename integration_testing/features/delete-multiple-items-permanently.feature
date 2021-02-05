Feature: Delete multiple items permanently

	Background: 
		Given That I have removed items from my channel editor tree

	Scenario: Delete multiple items permanently
		When I click the *Trash* button in the top appbar
		Then I see a list of items removed from my channel
		When I select multiple items from the list
			And I click *Delete* in the bottom bar
		Then I see a 'WARNING' message appear
		When I click the *Delete permanently* button
		Then the selections disappear from the list
			And a snackbar appears confirming the deletion of multiple items