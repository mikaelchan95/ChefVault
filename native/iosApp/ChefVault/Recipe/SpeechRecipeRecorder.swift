import AVFoundation
import Foundation
import Speech

enum SpeechRecipeAuthorization: Equatable {
    case authorized
    case denied
    case restricted
    case microphoneDenied
    case unavailable
}

protocol SpeechRecipeRecording: AnyObject {
    var transcript: String { get }
    var level: Double { get }
    func requestAuthorization() async -> SpeechRecipeAuthorization
    func start(onTranscript: @escaping (String) -> Void, onLevel: @escaping (Double) -> Void) throws
    func stop()
}

final class SpeechRecipeRecorder: NSObject, SpeechRecipeRecording {
    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en_US"))
    private let audioEngine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private(set) var transcript = ""
    private(set) var level: Double = 0

    func requestAuthorization() async -> SpeechRecipeAuthorization {
        let speech = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status)
            }
        }
        guard speech == .authorized else {
            switch speech {
            case .denied: return .denied
            case .restricted: return .restricted
            default: return .unavailable
            }
        }

        let micGranted = await withCheckedContinuation { continuation in
            AVAudioApplication.requestRecordPermission { granted in
                continuation.resume(returning: granted)
            }
        }
        guard micGranted else { return .microphoneDenied }
        guard recognizer?.isAvailable == true else { return .unavailable }
        return .authorized
    }

    func start(onTranscript: @escaping (String) -> Void, onLevel: @escaping (Double) -> Void) throws {
        stop()
        transcript = ""
        level = 0

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        self.request = request

        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.record, mode: .measurement, options: .duckOthers)
        try session.setActive(true, options: .notifyOthersOnDeactivation)

        let input = audioEngine.inputNode
        let format = input.outputFormat(forBus: 0)
        input.removeTap(onBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            request.append(buffer)
            let power = Self.averagePower(buffer: buffer)
            Task { @MainActor in
                self?.level = power
                onLevel(power)
            }
        }

        audioEngine.prepare()
        try audioEngine.start()

        task = recognizer?.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }
            if let result {
                let text = result.bestTranscription.formattedString
                Task { @MainActor in
                    self.transcript = text
                    onTranscript(text)
                }
            }
            if error != nil || result?.isFinal == true {
                self.stop()
            }
        }
    }

    func stop() {
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
        request?.endAudio()
        request = nil
        task?.cancel()
        task = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    private static func averagePower(buffer: AVAudioPCMBuffer) -> Double {
        guard let data = buffer.floatChannelData?[0] else { return 0 }
        let count = Int(buffer.frameLength)
        guard count > 0 else { return 0 }
        var sum: Float = 0
        for index in 0..<count {
            sum += abs(data[index])
        }
        return min(1, Double(sum / Float(count)) * 18)
    }
}
