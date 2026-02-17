import SwiftUI
import PhotosUI

// MARK: - Job Detail View

struct JobDetailView: View {
    let job: Job
    var store: JobStore
    var configStore: ConfigStore
    var networkMonitor: NetworkMonitor
    var syncQueue: PhotoSyncQueue

    @State private var editedStage: JobStage
    @State private var rebateText: String
    @State private var showRebateAlert = false
    @State private var showNewSpotSheet = false
    @State private var newSpotTitle = ""
    @State private var newSpotJobType = "Insulation"
    @State private var selectedSpotForIssue: Spot?
    @State private var selectedHousePhoto: PhotosPickerItem?
    @State private var isUploadingHouseImage = false
    @State private var notesExpanded = false

    /// Live version from the store's listener, falls back to the passed-in snapshot
    private var liveJob: Job {
        store.jobs.first { $0.id == job.id } ?? job
    }

    init(job: Job, store: JobStore, configStore: ConfigStore, networkMonitor: NetworkMonitor, syncQueue: PhotoSyncQueue) {
        self.job = job
        self.store = store
        self.configStore = configStore
        self.networkMonitor = networkMonitor
        self.syncQueue = syncQueue
        self._editedStage = State(initialValue: job.currentStage)
        self._rebateText = State(initialValue: job.rebateAmount > 0 ? String(format: "%.0f", job.rebateAmount) : "")
    }

    private var audit: InspectionForm? {
        store.forms.first { $0.formType == .audit }
    }

    private var inspections: [InspectionForm] {
        store.forms.filter { $0.formType == .inspection }
    }

    var body: some View {
        VStack(spacing: 0) {
            SyncBanner(networkMonitor: networkMonitor, syncQueue: syncQueue, jobStore: store)

            ScrollView {
                VStack(spacing: 0) {
                    VStack(spacing: DS.Spacing.s) {
                        contactRow
                        metricsCard
                    }
                    .padding(.horizontal, DS.Spacing.m)
                    .padding(.top, DS.Spacing.s)
                    .padding(.bottom, DS.Spacing.m)

                    heroBanner

                    VStack(spacing: DS.Spacing.s) {
                        spotsSection
                        auditSection
                        inspectionsSection
                    }
                    .padding(.horizontal, DS.Spacing.m)
                    .padding(.top, DS.Spacing.m)
                    .padding(.bottom, DS.Spacing.xl)
                }
            }
        }
        .background(DS.Colors.background)
        .navigationTitle(liveJob.streetAddress.isEmpty ? (liveJob.address.isEmpty ? "Job" : liveJob.address) : liveJob.streetAddress)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                ShareLink(item: shareText) {
                    Image(systemName: "square.and.arrow.up")
                }
            }
        }
        .onAppear { store.startListeningToForms(for: liveJob.id) }
        .refreshable { await store.refreshForms(for: liveJob.id) }
        .sheet(isPresented: $showNewSpotSheet) { newSpotSheet }
        .sheet(item: $selectedSpotForIssue) { spot in
            NavigationStack {
                AddIssueView(job: liveJob, spot: spot, store: store, configStore: configStore)
            }
        }
        .alert("Rebate Amount", isPresented: $showRebateAlert) {
            TextField("Amount", text: $rebateText)
                .keyboardType(.decimalPad)
            Button("Save") {
                var updated = liveJob
                updated.rebateOutcome = .approved
                updated.rebateAmount = Double(rebateText) ?? 0
                store.updateJob(updated)
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("Enter the approved rebate amount.")
        }
    }

    // MARK: - Hero Helpers

    private var heroDisplayStreet: String {
        if !liveJob.streetAddress.isEmpty { return liveJob.streetAddress }
        if !liveJob.address.isEmpty { return liveJob.address }
        return "Untitled Job"
    }

    private var heroDisplayLocality: String? {
        let parts = [liveJob.city, liveJob.state].filter { !$0.isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    // MARK: - Hero Banner

    private var heroBanner: some View {
        PhotosPicker(selection: $selectedHousePhoto, matching: .images) {
            // Text content is the primary layer — always renders on top
            VStack {
                // Top-left: date
                HStack {
                    Text(liveJob.createdAt.formatted(date: .abbreviated, time: .omitted))
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(.ultraThinMaterial, in: .capsule)
                    Spacer()
                }

                Spacer()

                // Bottom-left: address + locality
                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(heroDisplayStreet)
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(.white)
                            .lineLimit(2)
                            .shadow(color: .black.opacity(0.3), radius: 4, y: 2)

                        if let locality = heroDisplayLocality {
                            HStack(spacing: 5) {
                                Image(systemName: "mappin")
                                    .font(.system(size: 11, weight: .semibold))
                                Text(locality)
                                    .font(.system(size: 14, weight: .medium))
                            }
                            .foregroundStyle(.white.opacity(0.85))
                            .shadow(color: .black.opacity(0.3), radius: 4, y: 2)
                        }
                    }
                    Spacer()
                }
            }
            .padding(16)
            .frame(height: 260)
            .frame(maxWidth: .infinity)
            .background {
                ZStack(alignment: .bottom) {
                    // Image or placeholder
                    if let urlString = liveJob.houseImageURL, let url = URL(string: urlString) {
                        AsyncImage(url: url) { phase in
                            if let image = phase.image {
                                image
                                    .resizable()
                                    .scaledToFill()
                            } else if phase.error != nil {
                                placeholderBackground
                            } else {
                                ZStack {
                                    DS.Colors.primary.opacity(0.3)
                                    ProgressView().tint(.white)
                                }
                            }
                        }
                    } else {
                        placeholderBackground
                    }

                    // Dark gradient scrim
                    LinearGradient(
                        colors: [.clear, .black.opacity(0.6)],
                        startPoint: .center,
                        endPoint: .bottom
                    )
                }
            }
            .clipped()
        }
        .buttonStyle(.plain)
        .disabled(isUploadingHouseImage)
        .overlay(alignment: .topTrailing) {
            stageDropdown
                .padding(16)
        }
        .overlay(alignment: .bottomTrailing) {
            if liveJob.rebateOutcome != .pending {
                rebateMenu
                    .padding(16)
            }
        }
        .overlay {
            if isUploadingHouseImage {
                ZStack {
                    Color.black.opacity(0.4)
                    ProgressView().tint(.white)
                }
            }
        }
        .clipShape(UnevenRoundedRectangle(bottomLeadingRadius: 24, bottomTrailingRadius: 24))
        .onChange(of: selectedHousePhoto) { _, newItem in
            guard let newItem else { return }
            isUploadingHouseImage = true
            Task {
                defer { isUploadingHouseImage = false; selectedHousePhoto = nil }
                guard let data = try? await newItem.loadTransferable(type: Data.self) else { return }
                guard let urlString = try? await store.uploadHouseImage(imageData: data, jobId: liveJob.id) else { return }
                var updated = liveJob
                updated.houseImageURL = urlString
                store.updateJob(updated)
            }
        }
    }

    private var placeholderBackground: some View {
        ZStack {
            LinearGradient(
                stops: [
                    .init(color: DS.Colors.primaryDark, location: 0),
                    .init(color: DS.Colors.primary, location: 0.45),
                    .init(color: DS.Colors.primaryDark.opacity(0.95), location: 1),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(spacing: 8) {
                Image(systemName: "camera.fill")
                    .font(.system(size: 32, weight: .light))
                Text("Tap to add photo")
                    .font(.system(size: 14, weight: .medium))
            }
            .foregroundStyle(.white.opacity(0.5))
        }
    }

    private var stageDropdown: some View {
        Menu {
            ForEach(JobStage.allCases) { stage in
                Button {
                    editedStage = stage
                    var updated = liveJob
                    updated.currentStage = stage
                    store.updateJob(updated)
                } label: {
                    Label(stage.rawValue, systemImage: stage.icon)
                }
            }
        } label: {
            HStack(spacing: 5) {
                Image(systemName: liveJob.currentStage.icon)
                    .font(.system(size: 9, weight: .bold))
                Text(liveJob.currentStage.rawValue)
                    .font(.system(size: 11, weight: .bold))
                    .tracking(0.3)
                Image(systemName: "chevron.up.chevron.down")
                    .font(.system(size: 7, weight: .bold))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(.ultraThinMaterial, in: .capsule)
        }
    }

    // MARK: - Contact Row

    private var contactRow: some View {
        Group {
            if !liveJob.contactName.isEmpty || !liveJob.contactPhone.isEmpty || !liveJob.contactEmail.isEmpty || !liveJob.notes.isEmpty {
                VStack(alignment: .leading, spacing: 0) {
                    // Contact info
                    if !liveJob.contactName.isEmpty || !liveJob.contactPhone.isEmpty || !liveJob.contactEmail.isEmpty {
                        HStack(spacing: 10) {
                            Image(systemName: "person.fill")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(.white)
                                .frame(width: 28, height: 28)
                                .background(DS.Colors.primary.gradient, in: .circle)

                            if !liveJob.contactName.isEmpty {
                                Text(liveJob.contactName)
                                    .font(.system(size: 15, weight: .semibold))
                            }

                            Spacer()

                            if !liveJob.contactPhone.isEmpty,
                               let url = URL(string: "tel:\(liveJob.contactPhone.filter { $0.isNumber })") {
                                Link(destination: url) {
                                    Image(systemName: "phone.fill")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(DS.Colors.info)
                                        .frame(width: 36, height: 36)
                                        .background(DS.Colors.info.opacity(0.1), in: .circle)
                                }
                            }

                            if !liveJob.contactEmail.isEmpty,
                               let url = URL(string: "mailto:\(liveJob.contactEmail)") {
                                Link(destination: url) {
                                    Image(systemName: "envelope.fill")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(DS.Colors.info)
                                        .frame(width: 36, height: 36)
                                        .background(DS.Colors.info.opacity(0.1), in: .circle)
                                }
                            }
                        }
                        .padding(DS.Spacing.m)
                    }

                    // Notes expandable
                    if !liveJob.notes.isEmpty {
                        if !liveJob.contactName.isEmpty || !liveJob.contactPhone.isEmpty || !liveJob.contactEmail.isEmpty {
                            Divider().padding(.horizontal, DS.Spacing.m)
                        }

                        Button {
                            withAnimation(.easeInOut(duration: 0.25)) {
                                notesExpanded.toggle()
                            }
                        } label: {
                            HStack {
                                Text("Notes")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(.primary)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(.tertiary)
                                    .rotationEffect(.degrees(notesExpanded ? 90 : 0))
                            }
                            .padding(.horizontal, DS.Spacing.m)
                            .padding(.vertical, DS.Spacing.s)
                        }
                        .buttonStyle(.plain)

                        if notesExpanded {
                            Text(liveJob.notes)
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, DS.Spacing.m)
                                .padding(.bottom, DS.Spacing.m)
                                .transition(.opacity.combined(with: .move(edge: .top)))
                        }
                    }
                }
                .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
                .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
            }
        }
    }

    // MARK: - Metrics Card

    private var metricsCard: some View {
        VStack(spacing: 0) {
            // Rainbow gradient accent bar
            LinearGradient(
                colors: [DS.Colors.primary, DS.Colors.info, DS.Colors.error, DS.Colors.success],
                startPoint: .leading,
                endPoint: .trailing
            )
            .frame(height: 3)

            // Metrics columns
            HStack(spacing: 0) {
                MetricColumn(value: liveJob.spots.count, label: "Spots", color: DS.Colors.primary)

                Divider().frame(height: 40)

                MetricColumn(value: liveJob.photoCount, label: "Photos", color: DS.Colors.info)

                Divider().frame(height: 40)

                MetricColumn(value: liveJob.issueCount, label: "Issues", color: DS.Colors.error)

                Divider().frame(height: 40)

                MetricColumn(value: liveJob.fixCount, label: "Fixes", color: DS.Colors.success)
            }
            .padding(.vertical, 16)
        }
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .clipShape(.rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    // MARK: - Rebate Menu

    private var rebateMenu: some View {
        Menu {
            ForEach(RebateOutcome.allCases) { outcome in
                Button {
                    if outcome == .approved {
                        showRebateAlert = true
                    } else {
                        var updated = liveJob
                        updated.rebateOutcome = outcome
                        updated.rebateAmount = 0
                        rebateText = ""
                        if outcome == .declined {
                            updated.currentStage = .cancelled
                            editedStage = .cancelled
                        }
                        store.updateJob(updated)
                    }
                } label: {
                    if outcome == liveJob.rebateOutcome {
                        Label(outcome.rawValue, systemImage: "checkmark")
                    } else {
                        Text(outcome.rawValue)
                    }
                }
            }
        } label: {
            HStack(spacing: 4) {
                if liveJob.rebateOutcome == .approved && liveJob.rebateAmount > 0 {
                    Text("$\(Int(liveJob.rebateAmount))")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                } else {
                    Text(liveJob.rebateOutcome.rawValue)
                        .font(.system(size: 11, weight: .bold))
                }
                Image(systemName: "chevron.up.chevron.down")
                    .font(.system(size: 8, weight: .bold))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(.ultraThinMaterial, in: .capsule)
            .overlay(
                Capsule().strokeBorder(
                    liveJob.rebateOutcome == .approved ? DS.Colors.success : DS.Colors.error,
                    lineWidth: 1.5
                )
            )
        }
    }

    // MARK: - Stage Pipeline

    // MARK: - Spots Section

    private var spotsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "mappin.and.ellipse")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 30, height: 30)
                        .background(DS.Colors.primary.gradient, in: .rect(cornerRadius: 8))

                    Text("Spots")
                        .font(.system(size: 16, weight: .bold))
                }

                Spacer()

                Button {
                    showNewSpotSheet = true
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "plus")
                            .font(.system(size: 11, weight: .bold))
                        Text("Add")
                            .font(.system(size: 13, weight: .semibold))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 7)
                    .background(DS.Colors.primary.gradient, in: .capsule)
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 18)
            .padding(.bottom, 14)

            // Content
            if liveJob.spots.isEmpty {
                HStack(spacing: 10) {
                    Image(systemName: "mappin.slash")
                        .font(.system(size: 14))
                        .foregroundStyle(.tertiary)
                    Text("No spots yet — add one to get started")
                        .font(.system(size: 14))
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 18)
                .padding(.bottom, 18)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(liveJob.spots) { spot in
                            Button {
                                selectedSpotForIssue = spot
                            } label: {
                                HStack(spacing: 10) {
                                    Image(systemName: JobType.icon(for: spot.jobType))
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundStyle(.white)
                                        .frame(width: 36, height: 36)
                                        .background(DS.Colors.primary.opacity(0.8).gradient, in: .rect(cornerRadius: 10))

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(spot.title.isEmpty ? "Untitled" : spot.title)
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(.primary)
                                            .lineLimit(1)
                                        Text(spot.jobType)
                                            .font(.system(size: 11))
                                            .foregroundStyle(.secondary)
                                            .lineLimit(1)
                                    }
                                }
                                .padding(10)
                                .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 14))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .strokeBorder(DS.Colors.primary.opacity(0.1), lineWidth: 1)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 18)
                }
                .padding(.bottom, 16)
            }
        }
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.card)
                .strokeBorder(DS.Colors.primary.opacity(0.08), lineWidth: 1)
        )
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    // MARK: - Audit Section

    private var auditSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "clipboard.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 30, height: 30)
                        .background(DS.Colors.info.gradient, in: .rect(cornerRadius: 8))

                    Text("Audit")
                        .font(.system(size: 16, weight: .bold))
                }

                Spacer()

                if let audit, audit.issuePhotos.count > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 9))
                        Text("\(audit.issuePhotos.count) issue\(audit.issuePhotos.count == 1 ? "" : "s")")
                            .font(.system(size: 12, weight: .bold))
                    }
                    .foregroundStyle(DS.Colors.error)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(DS.Colors.error.opacity(0.1), in: .capsule)
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 18)
            .padding(.bottom, 14)

            // Content
            if let audit {
                NavigationLink(destination: FormDetailView(form: audit, job: liveJob, store: store, configStore: configStore, syncQueue: syncQueue)) {
                    HStack(spacing: 12) {
                        Image(systemName: "person.fill")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(.white)
                            .frame(width: 40, height: 40)
                            .background(DS.Colors.info.opacity(0.8).gradient, in: .circle)

                        VStack(alignment: .leading, spacing: 4) {
                            Text(audit.inspectorName.isEmpty ? "Unknown Inspector" : audit.inspectorName)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(.primary)

                            HStack(spacing: 12) {
                                HStack(spacing: 4) {
                                    Image(systemName: "calendar")
                                        .font(.system(size: 10))
                                    Text(audit.date.formatted(date: .abbreviated, time: .omitted))
                                }
                                if audit.photoCount > 0 {
                                    HStack(spacing: 4) {
                                        Image(systemName: "camera.fill")
                                            .font(.system(size: 10))
                                        Text("\(audit.photoCount)")
                                    }
                                }
                            }
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(.quaternary)
                    }
                    .padding(.horizontal, 18)
                    .padding(.bottom, 16)
                }
                .buttonStyle(.plain)
            } else {
                HStack(spacing: 10) {
                    Image(systemName: "plus.circle")
                        .font(.system(size: 14))
                        .foregroundStyle(.tertiary)
                    Text("Tap a spot to add an issue")
                        .font(.system(size: 14))
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 18)
                .padding(.bottom, 18)
            }
        }
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.card)
                .strokeBorder(DS.Colors.info.opacity(0.08), lineWidth: 1)
        )
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    // MARK: - Inspections Section

    private var inspectionsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.shield.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 30, height: 30)
                        .background(DS.Colors.success.gradient, in: .rect(cornerRadius: 8))

                    Text("Inspections")
                        .font(.system(size: 16, weight: .bold))
                }

                Spacer()

                if inspections.flatMap(\.fixPhotos).count > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "wrench.and.screwdriver.fill")
                            .font(.system(size: 9))
                        Text("\(inspections.flatMap(\.fixPhotos).count) fix\(inspections.flatMap(\.fixPhotos).count == 1 ? "" : "es")")
                            .font(.system(size: 12, weight: .bold))
                    }
                    .foregroundStyle(DS.Colors.success)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(DS.Colors.success.opacity(0.1), in: .capsule)
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 18)
            .padding(.bottom, 14)

            // Content
            if inspections.isEmpty {
                HStack(spacing: 10) {
                    Image(systemName: "checkmark.shield")
                        .font(.system(size: 14))
                        .foregroundStyle(.tertiary)
                    Text("No inspections yet")
                        .font(.system(size: 14))
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 18)
                .padding(.bottom, 18)
            } else {
                VStack(spacing: 8) {
                    ForEach(inspections) { inspection in
                        NavigationLink(destination: FormDetailView(form: inspection, job: liveJob, store: store, configStore: configStore, syncQueue: syncQueue)) {
                            HStack(spacing: 12) {
                                Image(systemName: "person.fill")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundStyle(.white)
                                    .frame(width: 40, height: 40)
                                    .background(DS.Colors.success.opacity(0.8).gradient, in: .circle)

                                VStack(alignment: .leading, spacing: 4) {
                                    Text(inspection.inspectorName.isEmpty ? "Unknown Inspector" : inspection.inspectorName)
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundStyle(.primary)

                                    HStack(spacing: 12) {
                                        HStack(spacing: 4) {
                                            Image(systemName: "calendar")
                                                .font(.system(size: 10))
                                            Text(inspection.date.formatted(date: .abbreviated, time: .omitted))
                                        }
                                        if inspection.photoCount > 0 {
                                            HStack(spacing: 4) {
                                                Image(systemName: "camera.fill")
                                                    .font(.system(size: 10))
                                                Text("\(inspection.photoCount)")
                                            }
                                        }
                                    }
                                    .font(.system(size: 12))
                                    .foregroundStyle(.secondary)
                                }

                                Spacer()

                                Image(systemName: "chevron.right")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(.quaternary)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 16)
            }
        }
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.card)
                .strokeBorder(DS.Colors.success.opacity(0.08), lineWidth: 1)
        )
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }



    // MARK: - New Spot Sheet

    private var newSpotSheet: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: DS.Spacing.l) {
                TextField("Spot title (e.g. Kitchen Window)", text: $newSpotTitle)
                    .font(.headline)

                VStack(alignment: .leading, spacing: DS.Spacing.xs) {
                    Text("JOB TYPE")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: DS.Spacing.xs) {
                            ForEach(configStore.jobTypes, id: \.self) { type in
                                Button {
                                    newSpotJobType = type
                                } label: {
                                    HStack(spacing: DS.Spacing.micro) {
                                        Image(systemName: JobType.icon(for: type))
                                            .font(.caption2)
                                        Text(type)
                                            .font(.caption.weight(.medium))
                                    }
                                    .padding(.horizontal, DS.Spacing.s)
                                    .frame(height: 34)
                                    .foregroundStyle(newSpotJobType == type ? .white : .primary)
                                    .background(
                                        newSpotJobType == type
                                            ? AnyShapeStyle(DS.Colors.primary)
                                            : AnyShapeStyle(.clear),
                                        in: .capsule
                                    )
                                    .overlay(
                                        Capsule()
                                            .strokeBorder(
                                                newSpotJobType == type ? .clear : Color(.systemGray3),
                                                lineWidth: 1
                                            )
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer()
            }
            .padding()
            .navigationTitle("New Spot")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showNewSpotSheet = false
                        newSpotTitle = ""
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let spot = Spot(title: newSpotTitle, jobType: newSpotJobType)
                        store.addSpot(spot, to: liveJob)
                        showNewSpotSheet = false
                        newSpotTitle = ""
                    }
                    .disabled(newSpotTitle.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
        .presentationDetents([.height(280)])
    }

    // MARK: - Helpers

    private var rebateOutcomeColor: Color {
        switch liveJob.rebateOutcome {
        case .pending: DS.Colors.primary
        case .approved: DS.Colors.success
        case .declined: DS.Colors.error
        }
    }


    // MARK: - Share

    private var shareText: String {
        var text = """
        Job Report
        ========================
        Address: \(liveJob.address)
        Contact: \(liveJob.contactName)
        Phone: \(liveJob.contactPhone)
        Email: \(liveJob.contactEmail)
        Stage: \(liveJob.currentStage.rawValue)
        Rebate: $\(String(format: "%.0f", liveJob.rebateAmount)) (\(liveJob.rebateOutcome.rawValue))
        Created: \(liveJob.createdAt.formatted(date: .long, time: .shortened))
        """

        if !liveJob.notes.isEmpty {
            text += "\nNotes: \(liveJob.notes)"
        }

        if !liveJob.spots.isEmpty {
            text += "\n\n--- SPOTS ---"
            for spot in liveJob.spots {
                text += "\n  - \(spot.title) (\(spot.jobType))"
            }
        }

        if !store.allMaterials.isEmpty {
            text += "\n\n--- ALL MATERIALS ---"
            for mat in store.allMaterials {
                let costStr = mat.cost.map { " — $\(String(format: "%.2f", $0))" } ?? ""
                text += "\n  - \(mat.name) (\(mat.type)) — \(mat.quantity)\(costStr)"
            }
        }

        if let audit {
            text += "\n\n--- AUDIT ---"
            text += formShareText(audit)
        }

        for (i, inspection) in inspections.enumerated() {
            text += "\n\n--- INSPECTION \(i + 1) ---"
            text += formShareText(inspection)
        }

        return text
    }

    private func formShareText(_ form: InspectionForm) -> String {
        var text = "\nInspector: \(form.inspectorName)"
        text += "\nDate: \(form.date.formatted(date: .long, time: .shortened))"

        if !form.notes.isEmpty {
            text += "\nNotes: \(form.notes)"
        }

        if !form.allMaterials.isEmpty {
            text += "\nMaterials:"
            for mat in form.allMaterials {
                let costStr = mat.cost.map { " — $\(String(format: "%.2f", $0))" } ?? ""
                text += "\n  - \(mat.name) (\(mat.type)) — \(mat.quantity)\(costStr)"
            }
        }

        if form.formType == .audit {
            for spot in form.spots where !spot.issuePhotos.isEmpty {
                text += "\n\n  Spot: \(spot.title.isEmpty ? "Unknown" : spot.title) (\(spot.jobType))"
                for photo in spot.issuePhotos {
                    text += "\n    Issue: \(photo.category) (\(photo.severity.rawValue))"
                    if !photo.notes.isEmpty {
                        text += "\n    Notes: \(photo.notes)"
                    }
                }
            }
        } else {
            for spot in form.spots where !spot.fixPhotos.isEmpty {
                text += "\n\n  Spot: \(spot.title.isEmpty ? "Unknown" : spot.title) (\(spot.jobType))"
                for photo in spot.fixPhotos {
                    if let linkedId = photo.linkedAuditIssueId,
                       let issue = store.auditIssuePhotos.first(where: { $0.id == linkedId }) {
                        text += "\n    Fixes: \(issue.category) (\(issue.severity.rawValue))"
                    }
                    if !photo.resolutionNotes.isEmpty {
                        text += "\n    Resolution: \(photo.resolutionNotes)"
                    }
                }
            }
        }

        return text
    }
}

// MARK: - Metric Column

private struct MetricColumn: View {
    let value: Int
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(.system(size: 26, weight: .bold, design: .rounded))
                .foregroundStyle(value > 0 ? color : Color(.quaternaryLabel))
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}
