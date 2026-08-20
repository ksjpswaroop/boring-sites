import SwiftUI
import LexJoltApp

@main
struct LexJoltVisionApp: App {
    var body: some Scene {
        WindowGroup {
            AppleEcosystemRootView(role: .vision)
        }
    }
}
