import SwiftUI

/// Brand design tokens, ported from `src/constants/theme.ts`. Orange accent is constant
/// across light/dark; neutrals come from the system semantic colors (warm-light / dark).
enum CV {
    static let primary = Color(red: 1.0, green: 122.0 / 255.0, blue: 0.0) // #FF7A00
    static let primaryTint = Color(red: 1.0, green: 122.0 / 255.0, blue: 0.0).opacity(0.15)

    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 20
        static let xxl: CGFloat = 24
        static let xxxl: CGFloat = 32
    }

    enum Radius {
        static let sm: CGFloat = 4
        static let md: CGFloat = 8
        static let lg: CGFloat = 12
        static let xl: CGFloat = 16
    }
}
