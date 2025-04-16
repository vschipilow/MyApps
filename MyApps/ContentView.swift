//
//  ContentView.swift
//  MyApps
//
//  Created by Victor Schipilow on 10/4/2025.
//

import WebKit
import SwiftUI
import SQLite3

struct ContentView: UIViewRepresentable {
    class Coordinator: NSObject, WKScriptMessageHandler {
        var parent: ContentView
        
        init(_ parent: ContentView) {
            self.parent = parent
        }
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "Dictionary", let messageBody = message.body as? [String: Any], let sql = messageBody["sql"] as? String, let columns = messageBody["columns"] as? [[String: Any]] {
                var db: OpaquePointer?
                let dbPath = Bundle.main.path(forResource: "V9Lib", ofType: "sqlite")
                
                if sqlite3_open(dbPath, &db) != SQLITE_OK {
                    print("Error opening database")
                }
                var rowArray: [String] = []
                var statement: OpaquePointer?
                let result = sqlite3_prepare_v2(db, sql, -1, &statement, nil)
                if result == SQLITE_OK {
                    while sqlite3_step(statement) == SQLITE_ROW {
                        var colArray: [String] = []
                        for column in columns {
                            if let sub = column["subscript"] as? Int32, let colName = column["name"] as? String {
                                let value = String(cString: sqlite3_column_text(statement, sub))
                                colArray.append("\"\(colName)\": \"\(value)\"")
                            }
                        }
                        rowArray.append("{ \(colArray.joined(separator: ", ")) }")
                    }
                } else {
                    print("Query preparation failed \(result)")
                }
                sqlite3_finalize(statement)
                let rows = rowArray.joined(separator: ", ")
                let parm = "{ \"rows\" : [ \(rows) ] }"
                let js = "receiveFromNative('\(parm)')"
                parent.webView.evaluateJavaScript(js, completionHandler: nil)
            }
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    private let webView = WKWebView(frame: .zero, configuration: {
        let config = WKWebViewConfiguration()
        let userContent = WKUserContentController()
        config.userContentController = userContent
        return config
    }())
    
    func makeUIView(context: Context) -> WKWebView {
        webView.configuration.userContentController.add(context.coordinator, name: "Dictionary")
        if let filePath = Bundle.main.path(forResource: "Dictionary", ofType: "html") {
            let fileURL = URL(fileURLWithPath: filePath)
            webView.loadFileURL(fileURL, allowingReadAccessTo: fileURL.deletingLastPathComponent())
        }
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
    }
}

