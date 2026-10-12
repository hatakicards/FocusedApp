import Foundation
import Capacitor
import Speech
import AVFoundation
import UIKit

// Dettatura per Focusy: trascrive la voce mentre la chat e' aperta e l'utente ha
// premuto il microfono. Non ascolta mai in modo continuo: si ferma da sola alla
// fine della frase, se l'utente preme di nuovo il microfono o se l'app va in
// secondo piano. Il riconoscimento e' quello di sistema (SFSpeechRecognizer);
// WKWebView non espone l'API Web Speech, per questo serve un plugin nativo.
@objc(FocusedSpeechPlugin)
public class FocusedSpeechPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FocusedSpeechPlugin"
    public let jsName = "FocusedSpeech"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "askPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]

    private let audioEngine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    // Va tenuto vivo per tutta la durata dell'ascolto: se viene rilasciato il
    // riconoscimento degrada o si interrompe.
    private var recognizer: SFSpeechRecognizer?

    public override func load() {
        NotificationCenter.default.addObserver(
            forName: UIApplication.didEnterBackgroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.finishListening(cancel: true)
            self?.notifyListeners("ended", data: [:])
        }
    }

    @objc func available(_ call: CAPPluginCall) {
        call.resolve(["available": SFSpeechRecognizer()?.isAvailable ?? false])
    }

    @objc func askPermissions(_ call: CAPPluginCall) {
        SFSpeechRecognizer.requestAuthorization { status in
            guard status == .authorized else {
                call.resolve(["granted": false])
                return
            }
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                call.resolve(["granted": granted])
            }
        }
    }

    @objc func start(_ call: CAPPluginCall) {
        finishListening(cancel: true)
        // "it-IT" -> "it_IT": e' il formato che Locale/SFSpeechRecognizer riconoscono meglio.
        let language = (call.getString("language") ?? Locale.current.identifier).replacingOccurrences(of: "-", with: "_")
        let rec = SFSpeechRecognizer(locale: Locale(identifier: language)) ?? SFSpeechRecognizer()
        guard let recognizer = rec, recognizer.isAvailable else {
            call.reject("unavailable")
            return
        }
        self.recognizer = recognizer
        do {
            // Niente modo .measurement: disattiva controllo del guadagno e riduzione del
            // rumore e il parlato risulta molto piu' debole e mal riconosciuto.
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .default, options: [.duckOthers, .allowBluetooth])
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            let req = SFSpeechAudioBufferRecognitionRequest()
            req.shouldReportPartialResults = true
            req.taskHint = .dictation
            if #available(iOS 16.0, *) { req.addsPunctuation = true }
            var hints = ["Focusy", "Focused", "Body Fuel"]
            hints.append(contentsOf: call.getArray("contextualStrings", String.self) ?? [])
            req.contextualStrings = hints
            request = req

            let input = audioEngine.inputNode
            input.removeTap(onBus: 0)
            input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0)) { buffer, _ in
                req.append(buffer)
            }
            audioEngine.prepare()
            try audioEngine.start()

            task = recognizer.recognitionTask(with: req) { [weak self] result, error in
                guard let self = self else { return }
                if let result = result {
                    self.notifyListeners("partialResults", data: [
                        "text": result.bestTranscription.formattedString,
                        "isFinal": result.isFinal,
                    ])
                }
                if error != nil || (result?.isFinal ?? false) {
                    self.finishListening(cancel: false)
                    self.notifyListeners("ended", data: [:])
                }
            }
            call.resolve()
        } catch {
            finishListening(cancel: true)
            call.reject("start_failed", nil, error)
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        // Chiude l'audio e lascia arrivare il risultato finale, poi "ended".
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
        request?.endAudio()
        call.resolve()
    }

    private func finishListening(cancel: Bool) {
        if audioEngine.isRunning {
            audioEngine.stop()
        }
        audioEngine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        if cancel { task?.cancel() }
        request = nil
        task = nil
        recognizer = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}
