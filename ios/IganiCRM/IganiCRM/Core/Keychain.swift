import Foundation
import Security

/// The sign-in session lives in the Keychain (this device only), never in plain storage.
enum Keychain {
    private static let service = "co.igani.crm.session"

    /// Saves (or replaces) the item. Updates in place first, so a failed add never leaves the old session deleted.
    @discardableResult static func save(_ data: Data, account: String) -> Bool {
        let match: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account]
        let attrs: [String: Any] = [kSecValueData as String: data, kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        var status = SecItemUpdate(match as CFDictionary, attrs as CFDictionary)
        if status == errSecItemNotFound {
            status = SecItemAdd(match.merging(attrs) { $1 } as CFDictionary, nil)
        }
        #if DEBUG
        if status != errSecSuccess { print("[keychain] save failed:", status) }
        #endif
        return status == errSecSuccess
    }

    static func load(account: String) -> Data? {
        let q: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var out: AnyObject?
        return SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess ? out as? Data : nil
    }

    static func delete(account: String) {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account]
        SecItemDelete(q as CFDictionary)
    }
}
