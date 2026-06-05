import XCTest

final class ChefVaultUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testLaunchShowsAuthenticationOrMainShell() throws {
        let app = XCUIApplication()
        app.launchArguments.append("UI_TESTING")
        app.launch()

        let loginTitle = app.staticTexts["ChefVault"]
        let recipesTab = app.buttons["Recipes"]
        XCTAssertTrue(
            loginTitle.waitForExistence(timeout: 4) || recipesTab.waitForExistence(timeout: 4),
            "Expected either the auth screen or the main tab shell to appear."
        )
    }

    func testScreenshotsCanBeCaptured() throws {
        let app = XCUIApplication()
        app.launchArguments.append("UI_TESTING")
        app.launch()

        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = "Launch"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
