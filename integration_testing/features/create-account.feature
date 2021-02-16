Feature: Create account on Studio

	Background: 
		Given I am signed in to Studio as a non-admin user
			And I am on Studio home page
			And I do not have an account registered with my <email>

		Scenario: Create account
			When I input all the required fields
				And I click the *Finish* button
			Then I see the *Activation link sent* page
				And I see the email in my Inbox
			When I click the activation link
				And I go to Studio home page
			Then I am able to sign in

		Scenario: See error notification
			When I fail to provide all the required information
			Then I see the *Please fix the errors below* alert under the main heading
				And I see the *Field is required* error notification for each missing information
			When I correct the error(s)
				And I click the *Finish* button
			Then I see the *Activation link sent* page
				And I see the email in my Inbox
			When I click the activation link
				And I go to Studio home page
			Then I am able to sign in

		Examples:
		| email |