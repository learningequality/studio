Feature: Forgot your password
	Users should be able to reset their password if they have an existing account.

	Background:
		Given I am not signed in to Studio
			And I am on Studio's sign-in page

	Scenario: Request a link to reset my password
		When I click the *Forgot your password?* link
		Then I am redirected to the *Forgot password* page
		When I type an existing valid email address in the *Email* field
			And I press the *Submit* button
		Then I see a message that the instructions are sent
			And I can see that I have received a *Password reset on Kolibri Studio* email
			And I can follow the link in the email to reset my password

	Scenario: Reset my password
		Given I've requested and received an email with a link to reset my password
		When I click the link in the email
		Then I am on a *Reset your password* page
			And I fill in the *New password* field
			And I fill in the *Confirm password* field with the same password
			And I press the *Submit* button
		Then I see the following message: Password reset successfully

	Scenario: Login using the new password
		Given I've reset my password successfully
			And I'm at the *Password reset successfully page*
		When I click the *Continue to sign-in page* link
		Then I am at the *Login* page
		When I enter my email address in the *Email* field
			And I enter my password in the *Password* field
			And I press the *Sign in* button
		Then I'm signed in successfully

