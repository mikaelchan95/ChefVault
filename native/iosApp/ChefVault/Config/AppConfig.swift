import Foundation
import ChefVaultShared

/// Builds the shared SDK from values injected via `Secrets.xcconfig` → Info.plist.
/// The host is stored without a scheme (xcconfig treats `//` as a comment), so we
/// prepend `https://` here.
enum AppConfig {
    static func makeSDK() -> ChefVaultSDK {
        let info = Bundle.main.infoDictionary
        let host = (info?["SUPABASE_HOST"] as? String)?.trimmingCharacters(in: .whitespaces) ?? ""
        let key = (info?["SUPABASE_ANON_KEY"] as? String)?.trimmingCharacters(in: .whitespaces) ?? ""
        let url = host.isEmpty ? "" : "https://\(host)"
        return ChefVaultSDK(config: SupabaseConfig(url: url, anonKey: key))
    }
}
