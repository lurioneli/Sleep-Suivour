import Foundation
import Combine
import WatchConnectivity

/// Manages WCSession communication between iPhone and Apple Watch.
/// Shared between both iOS app and Watch Extension targets.
/// iPhone sends state updates; Watch sends user actions (start fast, log powerup).
class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()

    /// Last known state from the companion device
    @Published var receivedState: [String: Any] = [:]

    /// Whether the companion device is currently reachable
    @Published var isReachable: Bool = false

    /// Callback for when Watch sends an action to iPhone
    var onWatchAction: (([String: Any]) -> Void)?

    private override init() {
        super.init()
    }

    /// Activate WCSession — call from AppDelegate (iOS) or ExtensionDelegate (Watch)
    func activate() {
        guard WCSession.isSupported() else {
            print("WCSession not supported on this device")
            return
        }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    /// Send state update to the companion device.
    /// Uses updateApplicationContext for guaranteed latest-state delivery.
    func sendState(_ data: [String: Any]) {
        guard WCSession.default.activationState == .activated else { return }

        #if os(iOS)
        guard WCSession.default.isPaired, WCSession.default.isWatchAppInstalled else { return }
        #endif

        do {
            try WCSession.default.updateApplicationContext(data)
        } catch {
            print("WCSession sendState error: \(error)")
        }
    }

    /// Send an immediate message (for time-sensitive actions like start/stop fast)
    func sendMessage(_ data: [String: Any]) {
        guard WCSession.default.activationState == .activated,
              WCSession.default.isReachable else {
            // Fall back to transferUserInfo for reliable delivery when not reachable
            WCSession.default.transferUserInfo(data)
            return
        }

        WCSession.default.sendMessage(data, replyHandler: nil) { error in
            print("WCSession sendMessage error: \(error)")
            // Fall back to transferUserInfo
            WCSession.default.transferUserInfo(data)
        }
    }
}

// MARK: - WCSessionDelegate

extension WatchConnectivityManager: WCSessionDelegate {

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            print("WCSession activation error: \(error)")
        }
        DispatchQueue.main.async { [weak self] in
            self?.isReachable = session.isReachable
        }
    }

    // Track reachability changes
    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async { [weak self] in
            self?.isReachable = session.isReachable
        }
    }

    // Receive application context (latest state from companion)
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async { [weak self] in
            self?.receivedState = applicationContext
        }
    }

    // Receive immediate message
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async { [weak self] in
            if message["action"] != nil {
                // This is a Watch action (start fast, log powerup, etc.)
                self?.onWatchAction?(message)
            } else {
                // This is a state update
                self?.receivedState = message
            }
        }
    }

    // Receive queued user info transfers
    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
        DispatchQueue.main.async { [weak self] in
            if userInfo["action"] != nil {
                self?.onWatchAction?(userInfo)
            } else {
                self?.receivedState = userInfo
            }
        }
    }

    // Handle completed/failed user info transfers
    func session(_ session: WCSession, didFinish userInfoTransfer: WCSessionUserInfoTransfer, error: Error?) {
        if let error = error {
            print("WCSession userInfo transfer failed: \(error.localizedDescription)")
        }
    }

    // iOS-only: required delegate methods
    #if os(iOS)
    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) {
        // Re-activate for next Watch connection
        WCSession.default.activate()
    }
    #endif
}
