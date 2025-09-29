Feature: Reset your password
	Users should be able to reset their password if they have an existing account.

	Background:
		Given I am not signed in to Studio
			And I am on Studio's sign-in page

	Scenario: Request a link to reset my password
		When I click the *Forgot your password?* link
		Then I see the *Reset your password* page with option to enter my email address
		When I type an existing valid email address in the *Email* field
			And I press the *Submit* button
		Then I see a message that the instructions are sent
			And I can see that I have received a *Password reset on Kolibri Studio* email
			And I can follow the link in the email to reset my password

	Scenario: Reset my password
		Given I've requested and received an email with a link to reset my password
		When I click the link in the email
		Then I see a page with a *Reset your password* form
		When I fill in the *New password* field
			And I fill in the *Confirm password* field with the same password
			And I press the *Submit* button
		Then I see the following message: Password reset successfully

	Scenario: Sign in using the new password
		Given I've reset my password successfully
			And I'm on a page where I see the following message: Password reset successfully
		When I click the *Continue to sign-in page* link
		Then I am at the sign-in page
		When I enter my email address in the *Email* field
			And I enter my password in the *Password* field
			And I press the *Sign in* button
		Then I'm signed in successfully

	Scenario: Expired Reset password link
		Given I've requested and received an email with a link to reset my password
			And I've already reset my password with that link
		When I click the link in the email again
		Then I see a page with the following message: Reset link expired
			And I see a *Request a new password reset link* button
