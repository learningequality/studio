Feature: Sign in to Studio

	Background:
		Given I am not signed in to Studio
			And I am at Studio's sign-in page
			And I have already registered with my email

		Scenario: Sign in to Studio
			When I fill in my email
      			And I fill in my password
      			And I click the *Sign in* button
    		Then I am signed in
    			And I am at *My channels* page

    	Scenario: See error notification for incorrect email or password
    		When I fill in an incorrect email or password
    			And I click the *Sign in* button
    		Then I see the following validation message above the form: *Email or password is incorrect*

    	Scenario: See validation messages for the required fields
    		When I leave one or both of the *Email* and *Password* fields empty
    			And I click the *Sign in* button
    		Then I see the fields colored in red
    			And I see a *Field is required* message under each empty field
