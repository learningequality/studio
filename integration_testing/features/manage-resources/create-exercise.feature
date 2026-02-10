Feature: Create an exercise

	Background:
		Given I am signed in to Studio
			And I am at the channel editor page

	Scenario: Create a new exercise (Completion: When goal is met - Goal: 100% correct)
		When I click the *Add* button
			And I select the *New exercise* option
		Then I see the *Details* tab of the *New exercise* modal
		When I fill in all of the required fields
			And I set the completion criteria to *When goal is met - Goal: 100% correct)* #repeat with the rest of the available goal types
			And I click the *Questions* tab
		Then I see the text: *Exercise has no questions*
			And I see a *New question* button
		When I click the *New question* button
		Then I see the question editor
		When I add one or several questions of the desired type
			And I add answers and hints as necessary
			And I click the *Finish* button
		Then I am back at the channel editor page
			And I can see the newly added exercise
			And I see a small green dot indicating that the exercise is unpublished

	Scenario: Create a new exercise - practice quiz
		When I click the *Add* button
			And I select the *New exercise* option
		Then I see the *Details* tab of the *New exercise* modal
		When I fill in all of the required fields
			And I set the completion criteria to *Practice quiz*
			And I click the *Questions* tab
		Then I see the text: *Exercise has no questions*
			And I see a *New question* button
		When I click the *New question* button
		Then I see the question editor
		When I add one or several questions of the desired type
			And I add answers and hints as necessary
			And I click the *Finish* button
		Then I am back at the channel editor page
			And I can see the newly added exercise
			And I see a small green dot indicating that the exercise is unpublished

	Scenario: Create a new exercise - survey
		When I click the *Add* button
			And I select the *New exercise* option
		Then I see the *Details* tab of the *New exercise* modal
		When I fill in all of the required fields
			And I set the completion criteria to *Survey*
			And I click the *Questions* tab
		Then I see the text: *Exercise has no questions*
			And I see a *New question* button
		When I click the *New question* button
		Then I see the question editor
		When I add one or several questions of the desired type
			And I add answers and hints as necessary
			And I click the *Finish* button
		Then I am back at the channel editor page
			And I can see the newly added exercise
			And I see a small green dot indicating that the exercise is unpublished

	Scenario: Existing and newly created exercises behave consistently
  		When I open a published channel containing previously created exercises with various completion types and questions
  		Then I can see all exercises displayed in the channel editor page
		    And exercises which were previously marked as *Incomplete* are still marked as *Incomplete*
		    And exercises without an *Incomplete* indicator are still displayed without it
		    And existing and newly created exercises look and function the same

	Scenario: Create an exercise with questions of type *Single choice*
		Given I am at the *Questions* tab
		When I click the *New question* button
		Then I see the question editor
			And I see that *Single choice* is the default *Response type*
		When I fill in the question text in the question editor field using all of the available editor options such as adding and resizing an image, editing the text or inserting formulas
			And I provide answers
			And I select one answer as the correct answer
			And I provide a hint
			And I click the *Finish* button
		Then I am back at the channel editor page
			And I can see the newly added exercise
			And I see a small green dot indicating that the exercise is unpublished

	Scenario: Create an exercise with questions of type *Multiple choice*
		Given I am at the question editor
		When I select the *Multiple choice* option from the *Response type* drop-down
			And I fill in the question text in the question editor field using all of the available editor options such as adding and resizing an image, editing the text or inserting formulas
			And I provide answers
			And I select one answer as the correct answer
			And I provide a hint
			And I click the *Finish* button
		Then I am back at the channel editor page
			And I can see the newly added exercise
			And I see a small green dot indicating that the exercise is unpublished

	Scenario: Create an exercise with questions of type *Numeric input*
		Given I am at the question editor
		When I select the *Numeric input* option from the *Response type* drop-down
			And I fill in the question text in the question editor field using all of the available editor options such as adding and resizing an image, editing the text or inserting formulas
			And I provide answers
			And I select one answer as the correct answer
			And I provide a hint
			And I click the *Finish* button
		Then I am back at the channel editor page
			And I can see the newly added exercise
			And I see a small green dot indicating that the exercise is unpublished

	Scenario: Create an exercise with questions of type *True/False*
		Given I am at the question editor
		When I select the *True/False* option from the *Response type* drop-down
			And I fill in the question text in the question editor field using all of the available editor options such as adding and resizing an image, editing the text or inserting formulas
			And I select one answer as the correct answer
			And I provide a hint
			And I click the *Finish* button
		Then I am back at the channel editor page
			And I can see the newly added exercise
			And I see a small green dot indicating that the exercise is unpublished

	Scenario: Create an exercise with questions of type *Free response*
		Given I am at the question editor for an exercise of type Survey
		When I select the *Free response* option from the *Response type* drop-down
			And I fill in the question text in the question editor field using all of the available editor options such as adding and resizing an image, editing the text or inserting formulas
			And I click the *Finish* button
		Then I am back at the channel editor page
			And I can see the newly added exercise
			And I see a small green dot indicating that the exercise is unpublished
