(function() {


    function receiveMessage() {

        if (window.opener) {
            console.log("window.opener - ", window.opener)
            window.opener.postMessage("inithandshake", "*")
        }

        window.addEventListener("message", function(event) {

            console.log("event.data - ", event.data)
            const path = event.data.path
            const origin = "null" !== event.origin ? event.origin : "*"

            if (event.data.action === "reqBtcAddress") {    
                // event.source.postMessage(response, origin)
                onGetBtcAddress(path, event, origin)
            } else if (event.data.action === "reqEthAddress") {
                // event.source.postMessage(response, origin)
                onGetEthAddress(path, event, origin)
            } else if (event.data.action === "reqSignEthTransaction") {
                // event.source.postMessage(response, origin)
                onGetEthAddress(path, event, origin)
            }
        })
    }

    window.addEventListener("load", receiveMessage)

    // window.addEventListener("load", function(){
        
    //     if (window.opener) {
    //         console.log("window.opener - ", window.opener)
    //         window.opener.postMessage("handshake", "*")
    //     }

    //     window.addEventListener("message", function(event) {

    //         console.log("event.data - ", event.data)

    //         const origin = "null" !== event.origin ? event.origin : "*"
    //         if (event.data.key === "value") {
    //             event.source.postMessage({done:1}, origin)
    //         }
    //     })
    // })
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

        displayResult(result)
        response.message = "success"
        response.data = result
        sendMessageToParentWindow(response, event, origin)
    }).catch(error => {

        displayResult(error)
        response.message = "failed"
        response.data = error
        sendMessageToParentWindow(response, event, origin)
    })

    // if (btcPath === "") throw "no wallet path"

    // getBtcAddress(btcPath)
    //     .then(result => {

    //         console.log(result)
    //         displayResult(result)
    //         sendMessageParentWindow("sendtBtcAddress", { detail: result })
    //     })
    //     .catch(error => {

    //         console.error(error)
    //         displayResult(error)
    //         sendMessageParentWindow("errortBtcAddress", { detail: error })
    //     })

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

            displayResult(result)
            response.message = "success"
            response.data = result
            sendMessageToParentWindow(response, event, origin)
        })
        .catch(error => {

            displayResult(error)
            response.message = "failed"
            response.data = error
            sendMessageToParentWindow(response, event, origin)
        })

}


const signEthTransaction = async (path, txParams) => {

    const transport = await getDevice(path)
    const eth = new AppEth.default(transport)
    const serializedTx = serializeTx(txParams)
    console.log(serializedTx)
    
    const result = await eth.signTransaction(path, serializedTx)
    return result
}


function onEthSignTransaction(ethPath, txParams) {

    if (ethPath === "") throw "no wallet path"
    const _txParams = JSON.parse(txParams)

    let response = {
        from: window.name,
        action: event.data.action,
        uniqueId: event.data.uniqueId
    }

    signEthTransaction(ethPath, _txParams)
        .then(result => {
            
            displayResult(result)
            const data = {
                tx: _txParams,
                result: result
            }

            response.message = "success"
            response.data = data
            sendMessageToParentWindow(response, event, origin)
        })
        .catch(error => {

            displayResult(error)
            response.message = "failed"
            response.data = error
            sendMessageToParentWindow(response, event, origin)
        })
}


function sendMessageToParentWindow(response, event, origin) {

    console.log(response)
    event.source.postMessage(response, origin)
}


function displayResult(result) {

    document.getElementById("result").innerHTML = JSON.stringify(result, undefined, 4)
}