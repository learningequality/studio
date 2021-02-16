Feature: Edit account information

	Background: 
		Given I am signed in to Studio as a non-admin user
			And I am on Studio *Settings > Account* page

	Scenario: Changing password
		When I click on the *Change password* hyperlink
			And I make changes to my password
			And I press *Save changes* button in the modal
		Then I see a snackbar appears to confirm my password was updated
			And the modal is dismissed
	
	Scenario: Editing full name
		When I click the *Edit* hyperlink near my username
			And I make changes to my full name
			And I click *Save changes* button in the modal
		Then I see a snackbar appears to confirm changes are saved
			And the modal is dismissed

	Scenario: Copying API token
		When I click the copy button in the token text field
		Then a snackbar appears to confirm the code is copied