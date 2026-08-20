import SwiftUI
import LexJoltApp

@main
struct LexJoltWatchApp: App {
    var body: some Scene {
        WindowGroup {
            AppleEcosystemRootView(role: .watch)
        }
    }
}
