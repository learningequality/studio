Feature: Change language

	Background:
		Given I am not signed in to Studio
			And I am on the *Login* page

	Scenario: Change language
		When I click on one of the available languages
		Then the language interface changes to the selected language
			And the selected language is no longer clickable