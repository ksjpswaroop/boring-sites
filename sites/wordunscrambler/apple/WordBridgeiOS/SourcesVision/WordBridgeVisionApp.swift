import SwiftUI
import WordBridgeApp

@main
struct WordBridgeVisionApp: App {
    var body: some Scene {
        WindowGroup {
            AppleEcosystemRootView(role: .vision)
        }
    }
}
