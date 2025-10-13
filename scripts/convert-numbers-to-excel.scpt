set inputPath to "/Users/sayuri/caddonworks/templates/documents/order_acceptance_template_new.numbers"
set outputPath to "/Users/sayuri/caddonworks/templates/documents/order_acceptance_template_new.xlsx"

tell application "Numbers"
	try
		log "Opening Numbers file..."
		set theDoc to open POSIX file inputPath
		delay 3

		log "Exporting to Excel..."
		export theDoc to POSIX file outputPath as Microsoft Excel
		delay 2

		log "Closing document..."
		close theDoc saving no

		log "Export completed successfully"
		return "Success"
	on error errMsg number errNum
		log "Error: " & errMsg & " (Error number: " & errNum & ")"
		return "Error: " & errMsg
	end try

	quit
end tell
