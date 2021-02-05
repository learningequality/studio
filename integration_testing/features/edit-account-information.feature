Feature: Edit account information

	Background: 
		Given I am on Studio *Settings* page
			And I navigate to the *Account* tab

	Scenario: Changing password
		When I click on the *Change password* hyperlink
			And I make changes to my password
			And I press *Save changes* button in the modal
		Then I see a snackbar appear stating my password was updated
			And the modal is dismissed
	
	Scenario: Editing full name
		When I click the *Edit* hyperlink near my username
			And I make changes to my full name
			And I click *Save changes* button in the modal
		Then I see a snackbar appear stating changes were saved
			And the modal is dismissed

	Scenario: Copying API token
		When I click the copy icon in the token text field
		Then a snackbar appears stating the code was copied