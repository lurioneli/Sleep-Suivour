import SwiftUI

/// Heart Points display — score with colored ring
struct HeartPointsView: View {
    @EnvironmentObject var watchState: WatchState

    private var ringColor: Color {
        let hp = watchState.heartPoints
        if hp >= 80 { return Color(red: 0.13, green: 0.77, blue: 0.37) }  // Green
        if hp >= 60 { return .yellow }
        if hp >= 40 { return .orange }
        return .red
    }

    private var progress: Double {
        return Double(min(100, max(0, watchState.heartPoints))) / 100.0
    }

    var body: some View {
        VStack(spacing: 8) {
            Text("Heart Points")
                .font(.caption2)
                .foregroundColor(.gray)
                .textCase(.uppercase)

            ZStack {
                // Background ring
                Circle()
                    .stroke(Color.gray.opacity(0.2), lineWidth: 10)

                // Progress ring
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(ringColor, style: StrokeStyle(lineWidth: 10, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut(duration: 0.8), value: progress)

                // Center content
                VStack(spacing: 2) {
                    Image(systemName: "heart.fill")
                        .font(.system(size: 18))
                        .foregroundColor(ringColor)

                    Text("\(watchState.heartPoints)")
                        .font(.system(.largeTitle, design: .rounded))
                        .fontWeight(.bold)
                        .foregroundColor(.white)

                    Text("/ 100")
                        .font(.caption2)
                        .foregroundColor(.gray)
                }
            }
            .frame(width: 130, height: 130)

            // Status text
            Text(statusText)
                .font(.caption2)
                .foregroundColor(ringColor)
        }
    }

    private var statusText: String {
        let hp = watchState.heartPoints
        if hp >= 80 { return "Excellent!" }
        if hp >= 60 { return "Good" }
        if hp >= 40 { return "Getting there" }
        return "Keep going!"
    }
}
