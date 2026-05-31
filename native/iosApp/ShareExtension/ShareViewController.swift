import UIKit
import UniformTypeIdentifiers

/// Share Extension: when the user shares a TikTok / Instagram / YouTube / web link to ChefVault,
/// grab the URL, hand it to the host app, and dismiss. The host app runs the actual import
/// (it holds the Supabase session). Two channels, for reliability:
///   1. App Group UserDefaults — the durable hand-off the app reads on next activation.
///   2. `chefvault://import?url=…` open — brings the app forward immediately.
@objc(ShareViewController)
final class ShareViewController: UIViewController {
    private let appGroup = "group.com.chefvault.app"
    private let pendingKey = "pendingImportURL"

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        extractURL { [weak self] urlString in
            guard let self else { return }
            if let urlString { self.handOff(urlString) }
            self.extensionContext?.completeRequest(returningItems: nil)
        }
    }

    // MARK: hand-off

    private func handOff(_ urlString: String) {
        // 1) Durable: write to the shared App Group container.
        UserDefaults(suiteName: appGroup)?.set(urlString, forKey: pendingKey)
        // 2) Immediate: open the host app with the link as a query param too.
        guard let encoded = urlString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let deepLink = URL(string: "chefvault://import?url=\(encoded)") else { return }
        openHostApp(deepLink)
    }

    /// Reach the host app's `open(_:)` by walking the responder chain (the supported route for a
    /// share extension to launch its container app via a custom scheme).
    private func openHostApp(_ url: URL) {
        var responder: UIResponder? = self
        while let r = responder {
            if let app = r as? UIApplication {
                app.open(url, options: [:], completionHandler: nil)
                return
            }
            responder = r.next
        }
    }

    // MARK: extraction

    private func extractURL(_ completion: @escaping (String?) -> Void) {
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let providers = item.attachments, !providers.isEmpty else {
            completion(nil)
            return
        }
        let urlType = UTType.url.identifier
        // Prefer a real URL attachment (browsers, most share buttons).
        if let p = providers.first(where: { $0.hasItemConformingToTypeIdentifier(urlType) }) {
            p.loadItem(forTypeIdentifier: urlType, options: nil) { data, _ in
                let s = (data as? URL)?.absoluteString ?? (data as? String)
                DispatchQueue.main.async { completion(s) }
            }
            return
        }
        // Fall back to plain text that contains a URL (some apps share "caption + link").
        let textType = UTType.plainText.identifier
        if let p = providers.first(where: { $0.hasItemConformingToTypeIdentifier(textType) }) {
            p.loadItem(forTypeIdentifier: textType, options: nil) { data, _ in
                let found = (data as? String).flatMap { Self.firstURL(in: $0) }
                DispatchQueue.main.async { completion(found) }
            }
            return
        }
        completion(nil)
    }

    private static func firstURL(in text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let range = NSRange(text.startIndex..., in: text)
        return detector?.firstMatch(in: text, range: range)?.url?.absoluteString
    }
}
