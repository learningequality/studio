Feature: Delete a single item permanently

	Background: 
		Given That I have one removed item from my channel editor tree

	Scenario: Delete a single item permanently
		When I click the *Trash* button in the top appbar
		Then I see one item removed from my channel
		When I select that item
			And I click *Delete* in the bottom bar
		Then I see a *WARNING* message appear
		When I click the *Delete permanently* button
		Then the selection disappear from the list
			And a snackbar appears to confirm the deletion
			And I see an empty state message