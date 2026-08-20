// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "LexJoltApp",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
        .watchOS(.v10),
        .tvOS(.v17),
        .visionOS(.v1)
    ],
    products: [
        .library(
            name: "LexJoltApp",
            targets: ["LexJoltApp"]
        )
    ],
    dependencies: [
        .package(path: "../WordGameCore")
    ],
    targets: [
        .target(
            name: "LexJoltApp",
            dependencies: ["WordGameCore"]
        ),
        .testTarget(
            name: "LexJoltAppTests",
            dependencies: ["LexJoltApp"]
        )
    ]
)
