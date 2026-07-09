Feature: Browser compatibility testing of all pages and resource types

  Background:
    Given I am signed in to Kolibri Studio
    	And I have created a channel with all supported resource types

  Scenario: Browse through the available pages in all supported browsers
    When I visit each page in the following browsers and operating systems
      - Firefox/Chrome/Edge on Windows
      - Firefox/Chrome on Linux
      - Firefox/Chrome/Safari on Mac OS
    Then I can see that each page is displayed correctly
      And I can interact with all of the available options and features of each page

  Scenario: View .mp3, .bloompub, .bloomd, .pdf, .epub, .h5p, html, .mp4, .webm, .kpub resources in all supported browsers
    When I open one of the supported resource types in the following browsers and operating systems
    	- Firefox/Chrome/Edge on Windows
    	- Firefox/Chrome on Linux
    	- Firefox/Chrome/Safari on Mac OS
    Then I can see that the resource is displayed correctly
      And I can interact with all of the available options and features of each resource
