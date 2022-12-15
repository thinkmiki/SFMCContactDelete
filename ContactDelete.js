/* ===============================  WARNING!!! ================================== */
//	
//	This script is still under development. Use of this script assumes that
//	the user is aware of the potential risks involved - known and unknown. 
//	This may include script errors, stuck deletion processes, possible
//	API timeouts, etc.
//
/* ============================================================================== */

/* ========================  CONTACT DELETE SCRIPT v3.0  ======================== */
//
//	DECRIPTION:
//	This script was developed to batch large amounts of Marketing Cloud Contacts
//	segmented for deletion.
//
//	Contacts should be imported in the Data Extension 'deletequeue' that are
//	intended for this script to process.
//
/* ============================================================================== */
Platform.Load("Core", "1.1.1")

var configs = ConfigSettings()
var token = getToken(configs)
var validToken = checkToken(token)

function ConfigSettings() {
	try {
		/* ---------- Intialize Configuration Data Extension ----------- */
		var configDE = DataExtension.Init('dev_deleteconfig')
		var configRow = configDE.Rows.Retrieve()[0]

		/* ---------------- TO BE USED IN FUTURE FUNCTIONS ----------------- */
		/*	var logDE = DataExtension.Init('dev_deletelog')              */
		/*   	var queueDE = DataExtension.Init('dev_deletequeue')          */
		/*  	var operationDE = DataExtension.Init('dev_deleteoperations') */
		/* ----------------------------------------------------------------- */

		// var batchSize = parseInt(configSettings.batchSize)
		// var maxActive = parseInt(configSettings.maxActive)

		/* -------- Check to see if ConfigDE contains at least one row. -------- */
		/* -------- If true, then call the getToken() function. -------- */
		if (configRow.length > 0) {
			return configRow
		} else {
			console.log("No Configuration Settings Found!")
		}

	} catch (error) {
		return error
	}
}

function getToken(configs) {
	try {
		var configSettings = configs

		/* -------- Set Auth Headers and Payload -------- */
		var contentType = 'application/json'
		var payload = Stringify({
			"grant_type": "client_credentials",
			"client_id": configSettings.client,
			"client_secret": configSettings.secret
		})

		/* -------- POST Headers and Payload to generate token -------- */
		var accessTokenResult = HTTP.Post(configSettings.authEndpoint + "/v2/token", contentType, payload)

		/* -------- Retrieve Access Token and REST URL from response -------- */
		var accessToken = Platform.Function.ParseJSON(accessTokenResult.Response[0]).access_token
		var restBase = Platform.Function.ParseJSON(accessTokenResult.Response[0]).rest_instance_url
		var expiresIn = Platform.Function.ParseJSON(accessTokenResult.Response[0]).expires_In

		configDE.Rows.Update({
				"authToken": accessToken,
				"authRefreshDate": Now(),
				"restEndpoint": restBase,
				"expiresIn": expiresIn
			},
			["client"], [configSettings.client])

		return configSettings

	} catch (error) {
		return error
	}
}

function checkToken(token) {
	var refreshDate = new Date(token.authRefreshDate)
	var currentDate = new Date(Now())

	var dateDiff = (currentDate - refreshDate)
	var dateDiff = Math.round((dateDiff / 1000))

	while (dateDiff < token.expiresIn) {
		if (dateDiff == token.expiresIn) {
			break
		}
		
		return true
	}

	return false
}

function getSyncOperations(validToken) {
	var rows = operationDE.Rows.Lookup(["status"], ["processing"]);
	if (!rows) {
		var count = 0
	} else {
		var count = rows.length
	}
	var availableOperations = MAXACTIVE - count

	for (i = 0; i < rows.length; i++) {
		var status = [0];
		var res = Platform.Function.HTTPGet(restBase + 'contacts/v1/contacts/actions/delete/status?operationID=' + rows[i].operationid, false, 0, ['Authorization', 'ContentType'], ['Bearer ' + accessToken, 'application/json'], status);
		if (status[0] == 0) {
			if (Platform.Function.ParseJSON(res).operation.status == 'Completed' && Platform.Function.ParseJSON(res).backgroundOperationsSummary[0].backgroundOperationStatusID == 'Completed') {
				operationDE.Rows.Update({
					"status": "Complete"
				}, ["operationid"], [rows[i].operationid]);
				availableOperations = availableOperations + 1
			}
		} else {
			logDE.Rows.Add({
				message: "Error Checking known operation status: " + Stringify(res)
			})
		}
	}
}
