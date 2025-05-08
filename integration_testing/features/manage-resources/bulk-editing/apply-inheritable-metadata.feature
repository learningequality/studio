Feature: Modal for applying inheritable metadata

	Background:
		Given I am signed in to Studio
			And I am at the channel editor page
			And there is a folder named *Folder 1* with language, categories, level, and requirements
			And there is a second folder named *Folder 2* with different metadata

	Scenario: Upload resources into a folder and see the modal
		When I upload a resource into *Folder 1*
		Then I see the *Apply details from the folder 'Folder 1'* modal
			And I see the *Select details to add*, *Update language* and *Don't ask me about this folder again* sections
			And I see all checkboxes checked except for *Don't ask me about this folder again*
		When I click *Continue*
		Then I see the *Edit files* modal
			And I see that all the selected metadata is applied

	Scenario: Upload multiple resources to a folder with metadata
		When I upload several resources into *Folder 1*
		Then I see the *Apply details from the folder 'Folder 1'* modal
			And I see the *Select details to add*, *Update language* and *Don't ask me about this folder again* sections
			And I see all checkboxes checked except for *Don't ask me about this folder again*
			And in the background I see that all of the resources are selected in the left sidebar
		When I click *Continue*
		Then I see the *Edit files* modal
			And I see that only the first file is selected in the left sidebar
			And I see that all the previously selected metadata is applied to all of the uploaded resources

	Scenario: Move resource and prompt for metadata
		Given *Folder 1* contains a resource
			And *Folder 2* exists with different metadata
		When I move the resource from *Folder 1* to *Folder 2*
		Then I see the *Apply details from the folder 'Folder 2'* modal
			And I see all checkboxes checked except for *Don't ask me about this folder again*
		When I click *Continue*
		Then I see the *Edit files* modal
			And I see that all the selected metadata is applied

	Scenario: Copy a resource to clipboard, and move it into a new folder
		Given *Folder 1* contains a resource
		When I copy it to the clipboard
      		And I move it from the clipboard to *Folder 2*
    	Then I see the *Apply details from the folder 'Folder 2'* modal
      		And I see all checkboxes checked except for *Don't ask me about this folder again*
    	When I click *Continue*
    	Then I see the *Moved to 'Folder 2'* snackbar message

  	Scenario: Move a resource into a folder with no metadata
    	Given I have created a folder named *Folder 3* with no metadata
    	When I move a resource into *Folder 3*
    	Then the modal for applying inheritable metadata is not displayed

  	Scenario: Import a resource into a folder with metadata
    	When I import a resource into *Folder 1*
    	Then the modal for applying inheritable metadata is displayed
   		When I click *Continue*
    	Then I see that the resource is imported into *Folder 1*
      		And I see that all the selected metadata is applied

  	Scenario: Import a resource into a folder with no metadata
    	Given I have created a folder named *Folder 3* with no metadata
    	When I import a resource into *Folder 3*
    	Then the modal for applying inheritable metadata is not displayed

  	Scenario: Move or import a resource in a folder that has only a language tagged
    	Given there is a folder that has only a language tagged
    	When I move or import a resource to that folder
    	Then I see the *Apply details from the folder* modal
      		And I see that only the *Update language* checkbox is checked

  	Scenario: Move or import a resource in a folder that has only categories tagged
    	Given there is a folder that has only categories tagged
    	When I move or import a resource to that folder
    	Then I see the *Apply details from the folder* modal
      		And I see that only the *Select details to add* section is visible

  	Scenario: Select the *Don't ask me about this folder again* checkbox
    	Given I am at the *Apply details from the folder* modal
    	When I select the *Don't ask me about this folder again* checkbox
      		And I click *Continue*
    	Then I see the *Edit files* modal
      		And I see that all the selected metadata is applied
    	When I close the *Edit files* modal
      		And I upload another resource to the same folder
    	Then I no longer see the *Apply details from the folder* modal
      		And I see that the previously selected details are applied by default to the resource
