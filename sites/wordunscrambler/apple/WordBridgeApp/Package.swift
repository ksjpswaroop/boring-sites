// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "WordBridgeApp",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
        .watchOS(.v10),
        .tvOS(.v17),
        .visionOS(.v1)
    ],
    products: [
        .library(
            name: "WordBridgeApp",
            targets: ["WordBridgeApp"]
        )
    ],
    dependencies: [
        .package(path: "../WordGameCore")
    ],
    targets: [
        .target(
            name: "WordBridgeApp",
            dependencies: ["WordGameCore"]
        ),
        .testTarget(
            name: "WordBridgeAppTests",
            dependencies: ["WordBridgeApp"]
        )
    ]
)
