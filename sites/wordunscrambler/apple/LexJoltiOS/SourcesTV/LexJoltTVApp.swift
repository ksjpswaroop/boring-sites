import SwiftUI
import LexJoltApp

@main
struct LexJoltTVApp: App {
    var body: some Scene {
        WindowGroup {
            AppleEcosystemRootView(role: .tv)
        }
    }
}
