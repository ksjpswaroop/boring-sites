import SwiftUI
import WordBridgeApp

@main
struct WordBridgeWatchApp: App {
    var body: some Scene {
        WindowGroup {
            AppleEcosystemRootView(role: .watch)
        }
    }
}
