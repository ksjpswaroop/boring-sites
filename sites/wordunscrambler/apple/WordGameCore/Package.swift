// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "WordGameCore",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
        .watchOS(.v10),
        .tvOS(.v17),
        .visionOS(.v1)
    ],
    products: [
        .library(
            name: "WordGameCore",
            targets: ["WordGameCore"]
        )
    ],
    targets: [
        .target(
            name: "WordGameCore",
            resources: [
                .process("Resources/words.json"),
                .process("Resources/anagram-index.json"),
                .process("Resources/lexicon-manifest.json"),
                .copy("Resources/lexicon.sqlite")
            ],
            linkerSettings: [
                .linkedLibrary("sqlite3")
            ]
        ),
        .testTarget(
            name: "WordGameCoreTests",
            dependencies: ["WordGameCore"]
        )
    ]
)
