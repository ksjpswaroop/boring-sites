import SwiftUI
import LexJoltApp

@main
struct LexJoltMacApp: App {
    var body: some Scene {
        WindowGroup {
            AppleEcosystemRootView(role: .mac)
        }
        .commands {
            CommandMenu("LexJolt") {
                Button("New round") {}
                    .keyboardShortcut("n", modifiers: [.command])
                Button("Submit word") {}
                    .keyboardShortcut(.return, modifiers: [])
            }
        }
    }
}
