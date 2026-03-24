import SwiftUI

/// Full powerup logging — sectioned by Fasting, Eating, and Sleep
struct PowerupsView: View {
    @EnvironmentObject var watchState: WatchState
    @Environment(\.isLuminanceReduced) var isLuminanceReduced
    @State private var lastTapped: String?

    private let suiGreen = Color(red: 0.13, green: 0.77, blue: 0.37)
    private let sleepIndigo = Color(red: 0.39, green: 0.4, blue: 0.95)
    private let eatingAmber = Color(red: 0.96, green: 0.62, blue: 0.04)

    var body: some View {
        if isLuminanceReduced {
            VStack(spacing: 8) {
                Image(systemName: "bolt.fill")
                    .font(.title3)
                    .foregroundColor(suiGreen.opacity(0.6))
                Text("Powerups")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            .accessibilityLabel("Powerups, raise wrist to interact")
        } else {
        ScrollView {
            VStack(spacing: 16) {
                // FASTING POWERUPS
                PowerupSection(
                    title: "Fasting",
                    color: suiGreen,
                    enabled: watchState.isFasting,
                    disabledText: "Start a fast to log",
                    powerups: [
                        ("drop.fill", "Water", "water", Color.cyan),
                        ("flame.fill", "Hot Water", "hotwater", Color.orange),
                        ("cup.and.saucer.fill", "Coffee", "coffee", Color.brown),
                        ("leaf.fill", "Tea", "tea", Color.green),
                        ("figure.run", "Exercise", "exercise", suiGreen),
                        ("figure.walk", "Walk", "walk", suiGreen),
                        ("figure.climbing", "Hanging", "hanging", Color.yellow),
                        ("hand.raised.fill", "Grip", "grip", Color.yellow),
                        ("checkmark.seal.fill", "Flat Stomach", "flatstomach", suiGreen),
                    ]
                )

                // EATING POWERUPS
                PowerupSection(
                    title: "Eating",
                    color: eatingAmber,
                    enabled: watchState.isEating,
                    disabledText: "Stop fasting to log meals",
                    powerups: [
                        ("cup.and.saucer.fill", "Broth", "broth", eatingAmber),
                        ("fish.fill", "Protein", "protein", Color.red),
                        ("carrot.fill", "Fiber", "fiber", Color.green),
                        ("house.fill", "Homecooked", "homecooked", eatingAmber),
                        ("tortoise.fill", "Slow Eating", "sloweating", suiGreen),
                        ("birthday.cake.fill", "Chocolate", "chocolate", Color.brown),
                        ("figure.walk", "Meal Walk", "mealwalk", suiGreen),
                        ("xmark.circle.fill", "No Sugar", "nosugar", suiGreen),
                        ("takeoutbag.and.cup.and.straw.fill", "Eaten Out", "eatenout", Color.red),
                        ("hare.fill", "Too Fast", "toofast", Color.red),
                        ("exclamationmark.triangle.fill", "Junk Food", "junkfood", Color.red),
                        ("cloud.fill", "Bloated", "bloated", Color.gray),
                    ]
                )

                // SLEEP POWERUPS
                PowerupSection(
                    title: "Sleep",
                    color: sleepIndigo,
                    enabled: watchState.isSleeping,
                    disabledText: "Start sleep to log",
                    powerups: [
                        ("moon.stars.fill", "Darkness", "darkness", sleepIndigo),
                        ("book.fill", "Reading", "reading", Color.orange),
                        ("heart.fill", "Cuddling", "cuddling", Color.pink),
                        ("iphone", "Screen", "screen", Color.red),
                        ("smoke.fill", "Smoking", "smoking", Color.red),
                    ]
                )
            }
            .padding(.horizontal, 4)
            .padding(.bottom, 20)
        }
        } // end else (not AOD)
    }

    @ViewBuilder
    func PowerupSection(title: String, color: Color, enabled: Bool, disabledText: String, powerups: [(String, String, String, Color)]) -> some View {
        VStack(spacing: 8) {
            // Section header
            HStack {
                Circle()
                    .fill(color)
                    .frame(width: 6, height: 6)
                    .accessibilityHidden(true)
                Text(title)
                    .font(.caption2)
                    .foregroundColor(color)
                    .textCase(.uppercase)
                Spacer()
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("\(title) powerups")

            // 2-column grid
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 6) {
                ForEach(powerups, id: \.2) { icon, label, type, btnColor in
                    PowerupButton(icon: icon, label: label, type: type, color: btnColor, category: title.lowercased(), enabled: enabled)
                }
            }

            if !enabled {
                Text(disabledText)
                    .font(.caption2)
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
            }
        }
    }

    @ViewBuilder
    func PowerupButton(icon: String, label: String, type: String, color: Color, category: String, enabled: Bool) -> some View {
        Button(action: { logPowerup(type, category: category, label: label) }) {
            VStack(spacing: 3) {
                Image(systemName: icon)
                    .font(.body)
                    .foregroundColor(lastTapped == "\(category)-\(type)" ? .white : color)
                    .accessibilityHidden(true)
                Text(label)
                    .font(.caption2)
                    .foregroundColor(.gray)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(lastTapped == "\(category)-\(type)" ? color.opacity(0.3) : Color.gray.opacity(0.15))
            .cornerRadius(10)
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
        .opacity(enabled ? 1.0 : 0.4)
        .accessibilityLabel("Log \(label)")
        .accessibilityHint(enabled ? "Double tap to log \(label) powerup" : "\(category) session required")
    }

    private func logPowerup(_ type: String, category: String, label: String) {
        let action: String
        switch category {
        case "eating":
            action = "logEatingPowerup"
        case "sleep":
            action = "logSleepPowerup"
        default:
            action = "logPowerup"
        }

        WatchConnectivityManager.shared.sendMessage([
            "action": action,
            "type": type,
            "timestamp": Date().timeIntervalSince1970 * 1000
        ])

        let tapKey = "\(category)-\(type)"
        lastTapped = tapKey
        WKInterfaceDevice.current().play(.success)

        // Reset visual feedback after 1s
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            if lastTapped == tapKey { lastTapped = nil }
        }
    }
}
