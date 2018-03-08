(function () {


    function receiveMessage() {

        if (window.opener) {
            console.log("window.opener - ", window.opener)
            window.opener.postMessage("inithandshake", "*")
        }

        window.addEventListener("message", function (event) {

            console.log("event.data - ", event.data)
            const path = event.data.path
            const origin = "null" !== event.origin ? event.origin : "*"

            if (event.data.action === "reqBtcAddress") {
                onGetBtcAddress(path, event, origin)
            } else if (event.data.action === "reqEthAddress") {
                const _message = "Confirm transaction details on Ledger Wallet"
                displayMessageInPopup(event.data.action, "")
                displayMessageInPopup(event.data.action, _message)
                onGetEthAddress(path, event, origin)
            } else if (event.data.action === "reqSignEthTransaction") {
                onEthSignTransaction(path, event.data.serializedTx, event.data.txParams, event, origin)
            } else if (event.data.action === "reqSignBtcTransaction") {
                onBtcSignTransaction(path, event, event.data.transactions, event.data.inputs, event.data.outputScript)
            }
        })
    }

    window.addEventListener("load", receiveMessage)
})()


function verifyPackage() {

    console.log(Transport.default)
    console.log(AppBtc.default)
    console.log(AppEth.default)
}


verifyPackage()


const getDevice = async (path) => {

    const devices = await Transport.default.list()

    if (devices.length === 0) throw "no device connected"

    return await Transport.default.open(devices[0])
}


const getBtcAddress = async (path) => {

    const transport = await getDevice(path)
    const btc = new AppBtc.default(transport)
    const result = await btc.getWalletPublicKey(path)
    return result.bitcoinAddress
}


function onGetBtcAddress(btcPath, event, origin) {

    if (btcPath === "") throw "no wallet path"

    let response = {
        from: window.name,
        action: event.data.action,
        uniqueId: event.data.uniqueId
    }

    getBtcAddress(btcPath).then(result => {

        // const data = {
        //     metaData: {
        //         type: event.data.action,
        //         address: result
        //     }
        // }
        // displayResult(event.data.action, data)
        response.message = "success"
        response.address = result
        sendMessageToParentWindow(response, event, origin)
        window.close()
    }).catch(error => {

        displayResult(event.data.action, error)
        response.message = "failed"
        response.data = error
        sendMessageToParentWindow(response, event, origin)
    })

}


const getEthAddress = async (path) => {

    const transport = await getDevice(path)
    const eth = new AppEth.default(transport)
    const result = await eth.getAddress(path, true, true)
    return result.address
}


function onGetEthAddress(ethPath, event, origin) {

    if (ethPath === "") throw "no wallet path"

    let response = {
        from: window.name,
        action: event.data.action,
        uniqueId: event.data.uniqueId
    }

    getEthAddress(ethPath)
        .then(result => {

            displayMessageInPopup(event.data.action, result)
            response.message = "success"
            response.address = result
            sendMessageToParentWindow(response, event, origin)
            window.close()
        })
        .catch(error => {

            displayResult(event.data.action, error)
            response.message = "failed"
            response.data = error
            sendMessageToParentWindow(response, event, origin)
        })

}


const signEthTransaction = async (path, serializedTx) => {

    const transport = await getDevice(path)
    const eth = new AppEth.default(transport)
    console.log(serializedTx)

    const result = await eth.signTransaction(path, serializedTx)
    return result
}


function onEthSignTransaction(ethPath, serializedTx, txParams, event, origin) {

    if (ethPath === "") throw "no wallet path"
    // const _txParams = JSON.parse(txParams)

    let response = {
        from: window.name,
        action: event.data.action,
        uniqueId: event.data.uniqueId
    }

    signEthTransaction(ethPath, serializedTx)
        .then(result => {

            displayResult(event.data.action, result)
            const data = {
                tx: txParams,
                result: result
            }

            response.message = "success"
            response.data = data
            response.data.result.success = true
            sendMessageToParentWindow(response, event, origin)
            window.close()
        })
        .catch(error => {

            displayResult(event.data.action, error)
            response.message = "failed"
            response.data = error
            response.data.result.success = false
            sendMessageToParentWindow(response, event, origin)
        })
}


const _createPaymentTransactionNew = async (path, inputs, changePath, outputScript) => {

    const transport = await getDevice(path)
    const btc = new AppBtc.default(transport)

    console.log("inputs - ", inputs)
    console.log("associatedKeysets - ", path)
    console.log("changePath - ", changePath)
    console.log("outputScript - ", outputScript)

    inputs.forEach(input => {
        input.forEach(attr => {
            if (attr.version) {
                attr.version = Buffer.Buffer(attr.version)
            }
        })
    })

    const signedTx = await btc.createPaymentTransactionNew(inputs, [path.split('m/')[1]], changePath, outputScript)
    return signedTx
}


const _signP2SHTransaction = async (path, inputs, associatedKeysets, outputScriptHex) => {

    const transport = await getDevice(path)
    const btc = new AppBtc.default(transport)

    console.log("inputs - ", inputs)
    console.log("associatedKeysets - ", associatedKeysets)
    console.log("outputScriptHex - ", outputScriptHex)
    
    inputs.forEach(input => {
        input.forEach(attr => {
            if (attr.version) {
                attr.version = Buffer.Buffer(attr.version)
            }
        })
    })

    const signedTx = await btc.signP2SHTransaction(inputs, associatedKeysets, outputScript)
    return signedTx
}


function onBtcSignTransaction(path, event, transactions, inputs, outputScript) {

    displayResult(event.data.action, { message: "BTC transaction not available" })

    // _createPaymentTransactionNew(path, inputs, undefined, outputScript).then((result) => {

    //     displayResult(event.data.action, result)
    //     // sendMessageToParentWindow(response, event, origin)
    // }).catch(error => {

    //     displayResult(event.data.action, error)
    // })
}


function toHex(str) {
	var hex = ""
	for(var i = 0; i < str.length; i++) {
		hex += ''+str.charCodeAt(i).toString(16)
	}
	return hex
}


function sendMessageToParentWindow(response, event, origin) {

    console.log(response)
    event.source.postMessage(JSON.parse(JSON.stringify(response)), origin)
}


function displayResult(action, result) {

    // result is an JSON object
    // format error before displaying to user
    // 
    console.log(result)
    // let messageToDisplay = {}
    // const type = result.metaData.type

    // switch (type) {
    //     case "DEVICE_INELIGIBLE":
    //         messageToDisplay = {
    //             request: action,
    //             message: "please select the correct app, as in BTC / Bcash / ETH"
    //         } 
    //         break
    //     default:
    //         messageToDisplay = {
    //             request: action,
    //             message: result
    //         }
    //         break
    // }
    let messageDom = document.getElementById("message")
    messageDom.className = "message show"
    document.getElementById("result").innerHTML = result
    // document.getElementById("result").innerHTML = JSON.stringify(result, undefined, 4)
}


function clearMessageInPopup(action, message) {

    if (action === "reqEthAddress") {

        let messageDom = document.getElementById("message")
        messageDom.className = "message hide"
        
        document.getElementById("result").innerHTML = message
    }
}


function displayMessageInPopup(action, message) {

    if (action === "reqEthAddress") {

        let messageDom = document.getElementById("message")
        messageDom.className = "message show"
        
        document.getElementById("result").innerHTML = message
    }
}