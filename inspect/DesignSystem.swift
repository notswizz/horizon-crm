import SwiftUI
import UIKit

// MARK: - Color(hex:) Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Design System

enum DS {

    // MARK: Colors

    enum Colors {
        static let primary = Color(hex: "FF6B35")
        static let primaryDark = Color(hex: "E85A28")
        static let primaryLight = Color(hex: "FF9066")

        static let success = Color(hex: "10B981")
        static let warning = Color(hex: "F59E0B")
        static let error = Color(hex: "EF4444")
        static let info = Color(hex: "3B82F6")

        // Stage colors
        static let stageAuditPending = Color(hex: "6366F1")
        static let stageWorkInProgress = Color(hex: "F59E0B")
        static let stageInspectionPending = Color(hex: "8B5CF6")
        static let stageCompleted = Color(hex: "10B981")
        static let stageCancelled = Color(hex: "6B7280")

        // Neutrals (asset catalog — light/dark adaptive)
        static let background = Color("DSBackground")
        static let surface = Color("DSSurface")
        static let border = Color("DSBorder")
    }

    // MARK: Typography

    enum Typography {
        static let display = Font.system(size: 28, weight: .bold)
        static let title = Font.system(size: 20, weight: .semibold)
        static let headline = Font.system(size: 17, weight: .semibold)
        static let body = Font.system(size: 15, weight: .regular)
        static let subheadline = Font.system(size: 13, weight: .medium)
        static let caption = Font.system(size: 11, weight: .regular)
    }

    // MARK: Spacing

    enum Spacing {
        static let micro: CGFloat = 4
        static let xs: CGFloat = 8
        static let s: CGFloat = 12
        static let m: CGFloat = 16
        static let l: CGFloat = 20
        static let xl: CGFloat = 24
        static let xxl: CGFloat = 32
    }

    // MARK: Radius

    enum Radius {
        static let card: CGFloat = 16
        static let button: CGFloat = 12
        static let chip: CGFloat = 8
        static let inner: CGFloat = 10
        static let pill: CGFloat = 16
    }

    // MARK: Shadow

    enum Shadow {
        static let color = Color.black.opacity(0.06)
        static let radius: CGFloat = 12
        static let y: CGFloat = 4
    }

    // MARK: Components

    enum Components {
        static let cardPadding: CGFloat = 20
        static let buttonHeight: CGFloat = 48
        static let chipHeight: CGFloat = 28
        static let stageCircle: CGFloat = 48
        static let stagePill: CGFloat = 32
        static let leftAccentWidth: CGFloat = 4
    }

    // MARK: Animation

    enum Animation {
        static let defaultSpring = SwiftUI.Animation.spring(response: 0.3, dampingFraction: 0.75)
        static let buttonPressScale: CGFloat = 0.96
        static let cardPressScale: CGFloat = 0.98
        static let cardEntryScale: CGFloat = 0.95
    }

    // MARK: Gradients

    enum Gradients {
        static let primaryButton = LinearGradient(
            colors: [DS.Colors.primary, DS.Colors.primaryDark],
            startPoint: .leading,
            endPoint: .trailing
        )
        static let successButton = LinearGradient(
            colors: [DS.Colors.success, DS.Colors.success.opacity(0.85)],
            startPoint: .leading,
            endPoint: .trailing
        )
    }
}

// MARK: - DSCardStyle

struct DSCardStyle: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        content
            .padding(DS.Components.cardPadding)
            .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.card)
                    .strokeBorder(colorScheme == .dark ? DS.Colors.border : .clear, lineWidth: 1)
            )
            .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }
}

extension View {
    func dsCard() -> some View {
        modifier(DSCardStyle())
    }
}

// MARK: - DSPrimaryButtonStyle

struct DSPrimaryButtonStyle: ButtonStyle {
    var enabled: Bool = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(.white)
            .frame(height: DS.Components.buttonHeight)
            .frame(maxWidth: .infinity)
            .background(
                enabled
                    ? DS.Gradients.primaryButton
                    : LinearGradient(colors: [.gray, .gray.opacity(0.85)], startPoint: .leading, endPoint: .trailing),
                in: .capsule
            )
            .shadow(
                color: enabled ? DS.Colors.primary.opacity(0.3) : .clear,
                radius: DS.Shadow.radius,
                y: DS.Shadow.y
            )
            .scaleEffect(configuration.isPressed ? DS.Animation.buttonPressScale : 1)
            .animation(DS.Animation.defaultSpring, value: configuration.isPressed)
    }
}

// MARK: - DSCardPressStyle

struct DSCardPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? DS.Animation.cardPressScale : 1)
            .animation(DS.Animation.defaultSpring, value: configuration.isPressed)
    }
}

// MARK: - DSSectionHeader

struct DSSectionHeader: View {
    let title: String

    var body: some View {
        Text(title.uppercased())
            .font(.caption.weight(.semibold))
            .tracking(0.5)
            .foregroundStyle(.secondary)
    }
}

// MARK: - StyledTextField

struct StyledTextField: View {
    let icon: String
    let label: String
    let placeholder: String
    @Binding var text: String
    var axis: Axis = .horizontal
    var lineLimit: ClosedRange<Int>?
    var contentType: UITextContentType?
    var keyboardType: UIKeyboardType = .default

    var body: some View {
        HStack(alignment: .top, spacing: DS.Spacing.s) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(DS.Colors.primary)
                .frame(width: 24, alignment: .center)
                .padding(.top, DS.Spacing.xs)

            VStack(alignment: .leading, spacing: DS.Spacing.micro) {
                Text(label)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)

                if axis == .vertical, let lineLimit {
                    TextField(placeholder, text: $text, axis: .vertical)
                        .lineLimit(lineLimit)
                        .textContentType(contentType)
                        .keyboardType(keyboardType)
                } else {
                    TextField(placeholder, text: $text)
                        .textContentType(contentType)
                        .keyboardType(keyboardType)
                }
            }
        }
    }
}

// MARK: - StageBadge

struct StageBadge: View {
    let stage: JobStage

    var body: some View {
        Text(stage.rawValue)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, DS.Spacing.xs)
            .padding(.vertical, 3)
            .background(stage.color.opacity(0.12), in: .capsule)
            .foregroundStyle(stage.color)
    }
}

// MARK: - MetaChip

struct MetaChip: View {
    let icon: String
    let value: String
    var color: Color = .secondary

    var body: some View {
        HStack(spacing: DS.Spacing.micro) {
            Image(systemName: icon)
                .font(.system(size: 10))
            Text(value)
                .font(.caption2.weight(.semibold))
        }
        .foregroundStyle(color)
    }
}

// MARK: - FormTypeBadge

struct FormTypeBadge: View {
    let formType: FormType

    private var color: Color {
        formType == .audit ? DS.Colors.info : DS.Colors.primary
    }

    private var icon: String {
        formType == .audit ? "clipboard.fill" : "checkmark.shield.fill"
    }

    var body: some View {
        Label(formType.rawValue, systemImage: icon)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, DS.Spacing.xs)
            .padding(.vertical, DS.Spacing.micro)
            .background(color.opacity(0.15), in: .capsule)
            .foregroundStyle(color)
    }
}

// MARK: - Flow Layout

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (positions: [CGPoint], size: CGSize) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxX: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            maxX = max(maxX, x - spacing)
        }

        return (positions, CGSize(width: maxX, height: y + rowHeight))
    }
}
