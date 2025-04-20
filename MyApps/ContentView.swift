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
            switch message.name {
            case "Words":
                fallthrough
            case "V9Lib":
                fallthrough
            case "MotoGP":
                if let messageBody = message.body as? [String: Any], let sql = messageBody["sql"] as? String {
                    let js = databaseQuery(database: message.name, sql: sql)
                    parent.webView.evaluateJavaScript(js, completionHandler: nil)
                }
            default:
                return
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
        webView.configuration.userContentController.add(context.coordinator, name: "Words")
        webView.configuration.userContentController.add(context.coordinator, name: "MotoGP")
        webView.configuration.userContentController.add(context.coordinator, name: "V9Lib")
        if let filePath = Bundle.main.path(forResource: "Home", ofType: "html") {
            let fileURL = URL(fileURLWithPath: filePath)
            webView.loadFileURL(fileURL, allowingReadAccessTo: fileURL.deletingLastPathComponent())
        }
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
    }
}

func databaseQuery (database: String, sql: String) -> String {
    var db: OpaquePointer?
    let dbPath = Bundle.main.path(forResource: database, ofType: "sqlite")
    
    if sqlite3_open(dbPath, &db) != SQLITE_OK {
        print("Error opening database")
    }
    var rowArray: [String] = []
    var statement: OpaquePointer?
    let result = sqlite3_prepare_v2(db, sql, -1, &statement, nil)
    var rowCount: Int32 = 0
    
    if result == SQLITE_OK {
        while sqlite3_step(statement) == SQLITE_ROW {
            rowCount += 1
            if rowCount <= 1000 {
                var colCount: Int32 = 0
                var colArray: [String] = []
                while colCount < sqlite3_column_count(statement) {
                    let colType: Int32 = sqlite3_column_type(statement, colCount)
                    let colName = String(cString: sqlite3_column_name(statement, colCount))
                    switch colType {
                    case SQLITE_TEXT:
                        let colValue = String(cString: sqlite3_column_text(statement, colCount))
                        colArray.append("\"\(colName)\": \"\(colValue)\"")
                    case SQLITE_INTEGER:
                        let colValue = Int(sqlite3_column_int(statement, colCount))
                        colArray.append("\"\(colName)\": \(colValue)")
                    case SQLITE_NULL:
                        let colValue = ""
                        colArray.append("\"\(colName)\": \"\(colValue)\"")
                    case SQLITE_FLOAT:
                        let colValue = Double(sqlite3_column_double(statement, colCount))
                        colArray.append("\"\(colName)\": \(colValue)")
                    case SQLITE_BLOB:
                        colArray.append("\"\(colName)\": \"type = blob\"")
                    default:
                        colArray.append("\"\(colName)\": \"type = \(colType)\"")
                    }
                    colCount += 1
                }
                rowArray.append("{ \(colArray.joined(separator: ", ")) }")
            }
        }
    } else {
        print("Query preparation failed \(result)")
    }
    sqlite3_finalize(statement)
    let rows = rowArray.joined(separator: ", ")
    let parm = "{ \"rows\" : [ \(rows) ], \"rowsFound\" : \(rowCount), \"rowsReturned\" : \(rowArray.count) }"
    return "receiveFromNative(`\(parm)`)"
}
