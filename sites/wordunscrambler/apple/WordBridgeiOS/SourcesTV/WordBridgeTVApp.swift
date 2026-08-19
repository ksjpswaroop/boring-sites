import SwiftUI
import WordBridgeApp

@main
struct WordBridgeTVApp: App {
    var body: some Scene {
        WindowGroup {
            AppleEcosystemRootView(role: .tv)
        }
    }
}
