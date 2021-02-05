Feature: Delete account

	Background: 
		Given I am on the *Settings* page
			And I am on the *Account* tab

	Scenario: Delete account without active channels
		When I click the red *Delete account* button
		Then I see a modal appear prompting my email to continue
		When I enter my email into the text field
			And click the *Delete account* button
		Then a snackbar appears confirming my account is deleted
			And I am signed out of Kolibri Studio
			And I receive an email confirming my deleted account

	Scenario: Delete account with active channels
		Given that my account still has active channels for which I am an admin
		When I look under the *Delete account* heading
		Then I don't see the *Delete account* button
			And I need to delete my active channels or invite other admins in order to see the *Delete account* button