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
                onGetEthAddress(path, event, origin)
            } else if (event.data.action === "reqSignEthTransaction") {
                onEthSignTransaction(path, event.data.serializedTx, event.data.txParams, event, origin)
            } else if (event.data.action === "reqSignBtcTransaction") {
                onBtcSignTransaction(path, event.data.utxo, event.data.tx, event.data.transactions, event.data.inputs, event.data.outputScript)
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

            // displayResult(result)
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

            displayResult(error)
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

    // inputs[0][0].version = BtcApp.Buffer(inputs[0][0].version)

    inputs.forEach(input => {
        input.forEach(attr => {
            if (attr.version) {
                attr.version = Buffer.Buffer(attr.version)
            }
        })
    })

    const signedTx = await btc.createPaymentTransactionNew(inputs, [path.split('m/')[1]], changePath, outputScript)
    return signedTx
    // .then(result => {

    //     console.log(result)
    //     return result
    // }).catch(error => {
    //     console.error(error)
    //     return error
    // })
}

const splitBtcTransaction = async (btc, transactionHex) => {

    const tx = await btc.splitTransaction(transactionHex, false, false)
    console.log("splitBtcTransaction tx - ", tx)
    return tx
}

const _serializeTransaction = async (path, transaction) => {

    const transport = await getDevice(path)
    const btc = new AppBtc.default(transport)
    
    console.log("transaction - ", transaction)

    transaction.version = Buffer.Buffer("0")

    const tx = await btc.serializeTransaction(transaction)
    console.log("_serializeTransaction - ", tx)
}

const signBtcTrasaction = async (path, UTXOs) => {

    const transport = await getDevice(path)
    const btc = new AppBtc.default(transport)
    
    console.log("UTXOs - ", UTXOs)

    const tx = await splitBtcTransaction(btc, toHex(JSON.stringify(UTXOs[0])))
    console.log("returned tx - ", tx)
}


function onBtcSignTransaction(path, UTXOs, tx, transactions, inputs, outputScript) {

    // console.log("UTXOs - ", UTXOs)
    // console.log("tx - ", tx)
    // console.log("transactions - ", transactions)
    // console.log("inputs - ", inputs)
    // console.log("outputScript - ", outputScript)

    
    _createPaymentTransactionNew(path, inputs, undefined, outputScript).then((result) => {

        displayResult(event.data.action, result)
        console.log(result)
        // sendMessageToParentWindow(response, event, origin)
    }).catch(error => {

        displayResult(error)
        console.error(error)
    })


    // _serializeTransaction(path, tx).then(result => {
    //     console.log("serializeTransaction result - ", result)
    // }).catch(error => {
    //     console.error("serializeTransaction error - ", error)
    // })


    // signBtcTrasaction(path, UTXOs).then(result => {
    //     console.log("signBtcTrasaction result - ", result)
    // }).catch(error => {
    //     console.error("signBtcTrasaction error - ", error)
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
    document.getElementById("result").innerHTML = JSON.stringify(result, undefined, 4)
}