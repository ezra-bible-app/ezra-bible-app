# features/001_application_startup.feature

Feature: Application startup
  In order to do anything in Ezra Project
  I first start up the application

  Scenario: First startup
    Given the application is started
    Then the window title is Ezra Project + the version number
    And the application has disabled buttons, because no translations are installed at this point