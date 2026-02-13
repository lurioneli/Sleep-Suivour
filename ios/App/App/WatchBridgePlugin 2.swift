import Foundation
import Capacitor
import WatchConnectivity

/// Capacitor plugin bridging JavaScript <-> Apple Watch via WCSession.
/// JS calls sendToWatch() to push state; Watch actions come back as JS events.
@objc(WatchBridgePlugin)
public class WatchBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WatchBridgePlugin"
    public let jsName = "WatchBridgePlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sendToWatch", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isWatchPaired", returnType: CAPPluginReturnPromise)
    ]

    override public func load() {
        // Initialize WatchConnectivity
        WatchConnectivityManager.shared.activate()

        // Listen for Watch actions and forward to JS
        WatchConnectivityManager.shared.onWatchAction = { [weak self] action in
            self?.notifyListeners("watchAction", data: action as? [String: Any] ?? [:])
        }
    }

    /// Send state data to Apple Watch via applicationContext
    @objc func sendToWatch(_ call: CAPPluginCall) {
        guard let data = call.options as? [String: Any] else {
            call.resolve()
            return
        }

        // Filter to only serializable values (strings, numbers, booleans)
        var cleanData: [String: Any] = [:]
        for (key, value) in data {
            if value is String || value is NSNumber || value is Bool || value is Int || value is Double {
                cleanData[key] = value
            }
        }

        WatchConnectivityManager.shared.sendState(cleanData)
        call.resolve()
    }

    /// Check if an Apple Watch is paired and has the app installed
    @objc func isWatchPaired(_ call: CAPPluginCall) {
        guard WCSession.isSupported() else {
            call.resolve(["paired": false, "installed": false])
            return
        }

        let session = WCSession.default
        call.resolve([
            "paired": session.isPaired,
            "installed": session.isWatchAppInstalled
        ])
    }
}
