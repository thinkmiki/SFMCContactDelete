Platform.Load("Core", "1.1.1")

var initiate = new InitiateDeleteProcess()

function InitiateDeleteProcess() {
	try {
		/* ---------- Intialize Configuration Data Extension ----------- */
		var configDE = DataExtension.Init('dev_deleteconfig')

		/* ---------------- TO BE USED IN FUTURE FUNCTIONS ----------------- */
		/*	var logDE = DataExtension.Init('dev_deletelog')              */
		/*   	var queueDE = DataExtension.Init('dev_deletequeue')          */
		/*  	var operationDE = DataExtension.Init('dev_deleteoperations') */
		/* ----------------------------------------------------------------- */
		

		/* -------- Retrieve ConfigDE Values -------- */
		var configSettings = configDE.Rows.Retrieve()[0]
		// var batchSize = parseInt(configSettings.batchSize)
		// var maxActive = parseInt(configSettings.maxActive)

		/* -------- Check to see if ConfigDE contains at least one row. -------- */
		/* -------- If true, then call the getToken() function. -------- */
		if (configSettings.length > 0) {
			getToken(configDE, configSettings)
		} else {
			console.log("No Configuration Settings Found!")
		}

	} catch (error) {
		return error
	}
}

function getToken(configDE, configSettings) {
	try {
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

		configDE.Rows.Update({
				"authToken": accessToken,
				"authRefreshDate": Now(),
				"restEndpoint": restBase
			},
			["client"], [configSettings.client])

	} catch (error) {
		return error
	}
}
