Feature: Change language
	A user needs to be able to change the interface language.

	Scenario: Change language when you are not signed-in
		Given I am not signed-in to Studio
			And I am at Studio's sign-in page
		When I click on one of the available languages
		Then the language interface changes to the selected language
			And the selected language is no longer clickable

	Scenario: Change language when you are exploring without an account
		Given I am not signed-in to Studio
			And I have clicked the *Explore without an account link*
		When I click on the user profile icon
			And I click *Change language*
		Then I see a *Change language* modal window with the available languages
		When I click on a language which is not currently selected
			And I click the *Confirm* button
		Then the interface language changes to the selected language

	Scenario: Change the language as a signed-in user
		Given I am signed-in to Studio
			And I click the user profile icon
		When I click *Change language*
		Then I see a *Change language* modal window with the available languages
		When I click on a language which is not currently selected
			And I click the *Confirm* button
		Then the interface language changes to the selected language
