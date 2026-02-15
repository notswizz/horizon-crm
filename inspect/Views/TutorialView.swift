import SwiftUI

struct TutorialView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var currentStep = 0

    private let totalSteps = 5

    private var stepIcon: String {
        switch currentStep {
        case 0: "🏠"
        case 1: "📋"
        case 2: "🔍"
        case 3: "🔧"
        default: "⚡"
        }
    }

    private var stepTitle: String {
        switch currentStep {
        case 0: "Welcome to Horizon Inspect"
        case 1: "Step 1: Create a Job & Spots"
        case 2: "Step 2: Audit — Find Issues"
        case 3: "Step 3: Inspection — Fix Issues"
        default: "Quick Tip: Camera Tab"
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Close button
            HStack {
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.secondary)
                        .frame(width: 32, height: 32)
                        .background(Color(.tertiarySystemFill), in: .circle)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)

            // Content
            TabView(selection: $currentStep) {
                ForEach(0..<totalSteps, id: \.self) { index in
                    stepPage(index)
                        .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .animation(.easeInOut(duration: 0.3), value: currentStep)

            // Bottom: dots + button
            VStack(spacing: 20) {
                // Page dots
                HStack(spacing: 8) {
                    ForEach(0..<totalSteps, id: \.self) { index in
                        Circle()
                            .fill(index == currentStep ? DS.Colors.primary : Color(.systemGray4))
                            .frame(width: index == currentStep ? 10 : 7, height: index == currentStep ? 10 : 7)
                            .animation(.spring(response: 0.3), value: currentStep)
                    }
                }

                // Action button
                Button {
                    if currentStep < totalSteps - 1 {
                        currentStep += 1
                    } else {
                        dismiss()
                    }
                } label: {
                    Text(currentStep < totalSteps - 1
                         ? (currentStep == 0 ? "Continue" : "Next")
                         : "Get Started")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(DS.Colors.primary.gradient, in: .rect(cornerRadius: 14))
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
        }
        .background(DS.Colors.background)
    }

    // MARK: - Step Page

    @ViewBuilder
    private func stepPage(_ index: Int) -> some View {
        ScrollView {
            VStack(spacing: 24) {
                Text(stepIconFor(index))
                    .font(.system(size: 56))

                Text(stepTitleFor(index))
                    .font(.system(size: 22, weight: .bold))
                    .multilineTextAlignment(.center)

                stepContent(index)
            }
            .padding(.horizontal, 24)
            .padding(.top, 8)
            .padding(.bottom, 100)
        }
    }

    private func stepIconFor(_ index: Int) -> String {
        ["🏠", "📋", "🔍", "🔧", "⚡"][index]
    }

    private func stepTitleFor(_ index: Int) -> String {
        [
            "Welcome to Horizon Inspect",
            "Step 1: Create a Job & Spots",
            "Step 2: Audit — Find Issues",
            "Step 3: Inspection — Fix Issues",
            "Quick Tip: Camera Tab"
        ][index]
    }

    @ViewBuilder
    private func stepContent(_ index: Int) -> some View {
        switch index {
        case 0: welcomeContent
        case 1: createJobContent
        case 2: documentIssuesContent
        case 3: submitFixesContent
        default: quickCaptureContent
        }
    }

    // MARK: - Welcome

    private var welcomeContent: some View {
        VStack(spacing: 20) {
            Text("Document energy retrofit jobs from start to finish — audit issues, then inspect the fixes.")
                .font(.system(size: 16))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            // Workflow summary
            VStack(spacing: 0) {
                workflowRow(icon: "plus.circle.fill", color: DS.Colors.primary,
                            title: "Create a Job", detail: "Address + customer info")
                workflowDivider()
                workflowRow(icon: "mappin.circle.fill", color: DS.Colors.info,
                            title: "Add Spots", detail: "Locations in the home to inspect")
                workflowDivider()
                workflowRow(icon: "exclamationmark.triangle.fill", color: DS.Colors.error,
                            title: "Audit", detail: "Photo + tag each issue per spot")
                workflowDivider()
                workflowRow(icon: "checkmark.circle.fill", color: DS.Colors.success,
                            title: "Inspection", detail: "Photo + document each fix")
            }
            .padding(14)
            .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 14))

            Text("This takes 2 minutes.")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.tertiary)
        }
    }

    // MARK: - Step 1: Create a Job

    private var createJobContent: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("A **Job** is a property you're working on. Tap \"+\" to create one.")
                .font(.system(size: 16))
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .center)
                .multilineTextAlignment(.center)

            // Mini form mockup
            VStack(spacing: 10) {
                mockField(icon: "mappin.circle.fill", label: "ADDRESS", value: "123 Oak Street")
                mockField(icon: "person.fill", label: "CUSTOMER", value: "Jane Smith")
                mockField(icon: "phone.fill", label: "PHONE", value: "(404) 555-1234")
            }
            .padding(16)
            .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 14))

            Text("Then add **Spots** — each spot is a specific location in the home, like \"Attic\" or \"Kitchen Window\".")
                .font(.system(size: 16))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Text("Every spot has a **Job Type** that describes what kind of work it needs.")
                .font(.system(size: 16))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            // Mini spot cards
            HStack(spacing: 10) {
                miniSpotCard(title: "Attic", type: "Insulation", icon: "triangle.fill")
                miniSpotCard(title: "Kitchen Window", type: "Air Sealing", icon: "wind")
            }

            tipCallout(
                icon: "lightbulb.fill",
                color: DS.Colors.warning,
                text: "The spot's job type determines which issue categories show up later."
            )
        }
    }

    // MARK: - Step 2: Audit

    private var documentIssuesContent: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("An **Audit** is your first visit — you walk through each spot and document every issue you find.")
                .font(.system(size: 16))
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .center)
                .multilineTextAlignment(.center)

            Text("Each spot can have **one or more issues**. The issue categories change based on the spot's job type:")
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            // Job type → categories example
            VStack(spacing: 8) {
                categoryExample(type: "Insulation", categories: ["Gaps", "Compression", "Low R-Value"])
                categoryExample(type: "Air Sealing", categories: ["No Caulk", "Gap at Penetration", "No Weatherstrip"])
            }
            .padding(14)
            .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 14))

            // Numbered steps
            VStack(alignment: .leading, spacing: 12) {
                numberedStep(n: "1", text: "Open a spot")
                numberedStep(n: "2", text: "Take a photo of the problem")
                numberedStep(n: "3", text: "Pick the issue category")

                // Step 4 with severity badges inline
                HStack(spacing: 8) {
                    stepCircle("4")
                    Text("Rate severity:")
                        .font(.system(size: 14))
                        .foregroundStyle(.secondary)
                    severityBadge("Critical", color: .red)
                    severityBadge("Major", color: .orange)
                    severityBadge("Minor", color: .yellow)
                }

                numberedStep(n: "5", text: "Add notes (optional)")
                numberedStep(n: "6", text: "Repeat for each issue in the spot")
            }

            tipCallout(
                icon: "doc.text.fill",
                color: DS.Colors.info,
                text: "One spot can have multiple issues. e.g. an attic might have gaps AND moisture damage."
            )
        }
    }

    // MARK: - Step 3: Inspection

    private var submitFixesContent: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("An **Inspection** is your follow-up visit after the work is done. Each issue from the audit gets a **Fix**.")
                .font(.system(size: 16))
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .center)
                .multilineTextAlignment(.center)

            VStack(alignment: .leading, spacing: 12) {
                numberedStep(n: "1", text: "Open the spot you worked on")
                numberedStep(n: "2", text: "Tap the issue you fixed")
                numberedStep(n: "3", text: "Take an \"after\" photo")
                numberedStep(n: "4", text: "Describe what you did to fix it")
                numberedStep(n: "5", text: "Add materials used (optional)")
            }

            // Before / After visual
            HStack(spacing: 12) {
                VStack(spacing: 6) {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(DS.Colors.error.opacity(0.15))
                        .frame(height: 80)
                        .overlay(
                            VStack(spacing: 4) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .font(.system(size: 20))
                                    .foregroundStyle(DS.Colors.error.opacity(0.5))
                                Text("Audit")
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundStyle(DS.Colors.error)
                            }
                        )
                    Text("Issue Photo")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.secondary)
                }

                Image(systemName: "arrow.right")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.quaternary)
                    .padding(.bottom, 18)

                VStack(spacing: 6) {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(DS.Colors.success.opacity(0.15))
                        .frame(height: 80)
                        .overlay(
                            VStack(spacing: 4) {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 20))
                                    .foregroundStyle(DS.Colors.success.opacity(0.5))
                                Text("Inspection")
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundStyle(DS.Colors.success)
                            }
                        )
                    Text("Fix Photo")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.secondary)
                }
            }
            .padding(16)
            .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 14))

            tipCallout(
                icon: "link",
                color: DS.Colors.success,
                text: "Each fix links back to its issue automatically — before & after."
            )

            Text("When every issue has a fix, the job is marked **Completed**.")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.tertiary)
                .frame(maxWidth: .infinity, alignment: .center)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Quick Capture

    private var quickCaptureContent: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("In a hurry? Use the **CAPTURE** tab.")
                .font(.system(size: 16))
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .center)
                .multilineTextAlignment(.center)

            // Mini tab bar visual
            HStack(spacing: 0) {
                miniTabItem(icon: "list.bullet", label: "Jobs", active: false)
                miniTabItem(icon: "camera.fill", label: "Capture", active: true)
                miniTabItem(icon: "gearshape.fill", label: "Settings", active: false)
            }
            .padding(.vertical, 10)
            .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 14))

            VStack(alignment: .leading, spacing: 12) {
                numberedStep(n: "1", text: "Pick a job")
                numberedStep(n: "2", text: "Take a photo")
                numberedStep(n: "3", text: "Tag it (issue or fix)")
            }

            // "10 seconds" callout
            HStack(spacing: 10) {
                Image(systemName: "bolt.fill")
                    .font(.system(size: 16))
                    .foregroundStyle(DS.Colors.primary)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Done in 10 seconds")
                        .font(.system(size: 15, weight: .bold))
                    Text("Perfect for when you're on a ladder.")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DS.Colors.primary.opacity(0.08), in: .rect(cornerRadius: 14))
        }
    }

    // MARK: - Reusable Pieces

    private func workflowRow(icon: String, color: Color, title: String, detail: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundStyle(color)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.primary)
                Text(detail)
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
    }

    private func workflowDivider() -> some View {
        Rectangle()
            .fill(Color(.separator))
            .frame(width: 1, height: 10)
            .padding(.leading, 26)
    }

    private func categoryExample(type: String, categories: [String]) -> some View {
        HStack(spacing: 8) {
            Text(type)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(DS.Colors.primary)
                .frame(width: 80, alignment: .trailing)
            Image(systemName: "arrow.right")
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(.quaternary)
            HStack(spacing: 4) {
                ForEach(categories, id: \.self) { cat in
                    Text(cat)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(Color(.tertiarySystemFill), in: .capsule)
                }
            }
        }
    }

    private func miniMetric(value: String, label: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundStyle(color)
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    private func mockField(icon: String, label: String, value: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundStyle(DS.Colors.primary)
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(.tertiary)
                    .tracking(0.5)
                Text(value)
                    .font(.system(size: 14))
                    .foregroundStyle(.primary)
            }
            Spacer()
        }
        .padding(10)
        .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 10))
    }

    private func miniSpotCard(title: String, type: String, icon: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(.white)
                .frame(width: 30, height: 30)
                .background(DS.Colors.primary.opacity(0.8).gradient, in: .rect(cornerRadius: 8))
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.primary)
                Text(type)
                    .font(.system(size: 10))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(DS.Colors.primary.opacity(0.12), lineWidth: 1)
        )
    }

    private func stepCircle(_ n: String) -> some View {
        Text(n)
            .font(.system(size: 12, weight: .bold, design: .rounded))
            .foregroundStyle(.white)
            .frame(width: 22, height: 22)
            .background(DS.Colors.primary.gradient, in: .circle)
    }

    private func numberedStep(n: String, text: String) -> some View {
        HStack(spacing: 10) {
            stepCircle(n)
            Text(text)
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
        }
    }

    private func severityBadge(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.12), in: .capsule)
    }

    private func miniTabItem(icon: String, label: String, active: Bool) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: active ? .semibold : .regular))
            Text(label)
                .font(.system(size: 10, weight: .medium))
        }
        .foregroundStyle(active ? DS.Colors.primary : Color(.systemGray3))
        .frame(maxWidth: .infinity)
    }

    private func tipCallout(icon: String, color: Color, text: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundStyle(color)
            Text(text)
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(color.opacity(0.08), in: .rect(cornerRadius: 10))
    }
}
