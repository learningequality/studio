Feature: Create an account on Studio

	Background:
		Given I am not signed in to Studio
			And I am at Studio's sign-in page
			And I haven't previously registered with my email

		Scenario: Create an account and sign in with the created account
			When I click the *Create an account* button
			Then I see the *Create an account* form
				And I see the *Basic information* section containing the following fields: First name, Last name, Email, Password and Confirm password
				And I see the *How do you plan on using Kolibri Studio (check all that apply)*, *Where do you plan to use Kolibri Studio? (check all that apply)*, *How did you hear about us?* and *I have read and agree to terms of service and the privacy policy* sections
				And I see the *View Privacy Policy* and *View Terms of Service* links
			When I input all the required fields
				And I click the *Finish* button
			Then I see the *Activation link sent* page
				And I see *Thank you for creating an account! To complete the process, please check your email for the activation link we sent you.*
			When I open the received email and click the activation link
			Then I see the *Account successfully created* page
			When I click the *Continue to sign-in page* button
			Then I am at the sign-in page
			When I fill in my email and password
				And I click the *Sign in* button
			Then I am able to sign in successfully

		Scenario: See an error notification if not all required information is provided
			When I fail to provide all the required information
			Then I see the *Please fix the errors below* alert under the main heading
				And I see the *Field is required* error notification for each missing information
			When I correct the error(s)
				And I click the *Finish* button
			Then I see the *Activation link sent* page
				And I see *Thank you for creating an account! To complete the process, please check your email for the activation link we sent you.*
