import SwiftUI
import WordBridgeApp

@main
struct WordBridgeMacApp: App {
    var body: some Scene {
        WindowGroup {
            AppleEcosystemRootView(role: .mac)
        }
        .commands {
            CommandMenu("WordBridge") {
                Button("New round") {}
                    .keyboardShortcut("n", modifiers: [.command])
                Button("Submit word") {}
                    .keyboardShortcut(.return, modifiers: [])
            }
        }
    }
}
