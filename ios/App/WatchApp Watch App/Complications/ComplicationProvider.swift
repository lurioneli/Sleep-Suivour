import WidgetKit
import SwiftUI

/// Watch face complication — shows fasting duration or heart points
struct SuiComplication: Widget {
    let kind = "SuiComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SuiTimelineProvider()) { entry in
            SuiComplicationView(entry: entry)
        }
        .configurationDisplayName("Sleep Suivour")
        .description("Shows your current fasting status")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryCorner,
            .accessoryInline,
            .accessoryRectangular
        ])
    }
}

struct SuiTimelineEntry: TimelineEntry {
    let date: Date
    let isFasting: Bool
    let elapsed: String
    let heartPoints: Int
}

struct SuiTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> SuiTimelineEntry {
        SuiTimelineEntry(date: Date(), isFasting: true, elapsed: "12h 30m", heartPoints: 75)
    }

    func getSnapshot(in context: Context, completion: @escaping (SuiTimelineEntry) -> Void) {
        let state = WatchState.shared
        let entry = SuiTimelineEntry(
            date: Date(),
            isFasting: state.isFasting,
            elapsed: WatchState.formatElapsed(state.fastElapsedSeconds),
            heartPoints: state.heartPoints
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SuiTimelineEntry>) -> Void) {
        let state = WatchState.shared
        let now = Date()

        // Create entries for next 30 minutes (updates every 5 min)
        var entries: [SuiTimelineEntry] = []
        for minuteOffset in stride(from: 0, through: 30, by: 5) {
            let entryDate = Calendar.current.date(byAdding: .minute, value: minuteOffset, to: now) ?? now
            let futureElapsed = state.fastElapsedSeconds + Double(minuteOffset * 60)
            entries.append(SuiTimelineEntry(
                date: entryDate,
                isFasting: state.isFasting,
                elapsed: state.isFasting ? WatchState.formatElapsed(futureElapsed) : "--",
                heartPoints: state.heartPoints
            ))
        }

        let timeline = Timeline(entries: entries, policy: .after(
            Calendar.current.date(byAdding: .minute, value: 30, to: now) ?? now
        ))
        completion(timeline)
    }
}

struct SuiComplicationView: View {
    @Environment(\.widgetFamily) var family
    let entry: SuiTimelineEntry

    private let suiGreen = Color(red: 0.13, green: 0.77, blue: 0.37)

    var body: some View {
        if #available(watchOS 10.0, *) {
            familyContent
                .containerBackground(for: .widget) {
                    Color.black
                }
        } else {
            familyContent
        }
    }

    @ViewBuilder
    var familyContent: some View {
        switch family {
        case .accessoryInline:
            inlineContent
        case .accessoryCorner:
            cornerContent
        case .accessoryRectangular:
            rectangularContent
        default:
            circularContent
        }
    }

    // MARK: - Inline (single horizontal line on watch face)
    @ViewBuilder
    var inlineContent: some View {
        if entry.isFasting {
            Label(entry.elapsed, systemImage: "flame.fill")
        } else {
            Label("\(entry.heartPoints) HP", systemImage: "heart.fill")
        }
    }

    // MARK: - Corner (small arc widget)
    @ViewBuilder
    var cornerContent: some View {
        if entry.isFasting {
            Text(entry.elapsed)
                .font(.system(size: 12, weight: .bold, design: .monospaced))
                .foregroundColor(suiGreen)
                .minimumScaleFactor(0.5)
                .widgetLabel {
                    Text("Fasting")
                }
        } else {
            Text("\(entry.heartPoints)")
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundColor(.red)
                .widgetLabel {
                    Text("Heart Points")
                }
        }
    }

    // MARK: - Circular (small round widget)
    @ViewBuilder
    var circularContent: some View {
        VStack(spacing: 1) {
            if entry.isFasting {
                Image(systemName: "flame.fill")
                    .font(.system(size: 12))
                    .foregroundColor(suiGreen)
                Text(entry.elapsed)
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
                    .minimumScaleFactor(0.6)
            } else {
                Image(systemName: "heart.fill")
                    .font(.system(size: 14))
                    .foregroundColor(.red)
                Text("\(entry.heartPoints)")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
            }
        }
    }

    // MARK: - Rectangular (wide widget)
    @ViewBuilder
    var rectangularContent: some View {
        HStack(spacing: 6) {
            if entry.isFasting {
                Image(systemName: "flame.fill")
                    .font(.system(size: 16))
                    .foregroundColor(suiGreen)
                VStack(alignment: .leading, spacing: 1) {
                    Text("Fasting")
                        .font(.system(size: 10))
                        .foregroundColor(.gray)
                    Text(entry.elapsed)
                        .font(.system(size: 16, weight: .bold, design: .monospaced))
                        .foregroundColor(.white)
                }
            } else {
                Image(systemName: "heart.fill")
                    .font(.system(size: 16))
                    .foregroundColor(.red)
                VStack(alignment: .leading, spacing: 1) {
                    Text("Heart Points")
                        .font(.system(size: 10))
                        .foregroundColor(.gray)
                    Text("\(entry.heartPoints) / 100")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                }
            }
            Spacer()
        }
    }
}
