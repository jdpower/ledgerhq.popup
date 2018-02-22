(function() {


    function receiveMessage() {

        if (window.opener) {
            console.log("window.opener - ", window.opener)
            window.opener.postMessage("handshake", "*")
        }

        window.addEventListener("message", function(event) {
            console.log("event.data - ", event.data)
            if (event.data.action === "requestBtcAddress") {
                const response = {
                    type: "sender",
                    action: event.data.action,
                    message: "success",
                    uniqueId: event.data.uniqueId
                }
                const origin = "null" !== event.origin ? event.origin : "*"
                event.source.postMessage(response, origin)
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


function onGetBtcAddress(btcPath) {

    if (btcPath === "") throw "no wallet path"

    getBtcAddress(btcPath)
        .then(result => {

            console.log(result)
            displayResult(result)
            sendMessageParentWindow("sendtBtcAddress", { detail: result })
        })
        .catch(error => {

            console.error(error)
            displayResult(error)
            sendMessageParentWindow("errortBtcAddress", { detail: error })
        })

}


const getEthAddress = async (path) => {

    const transport = await getDevice(path)
    const eth = new AppEth.default(transport)
    const result = await eth.getAddress(path, true, true)
    return result.address
}


function onGetEthAddress(ethPath) {

    if (ethPath === "") throw "no wallet path"

    getEthAddress(ethPath)
        .then(result => {

            console.log(result)
            displayResult(result)
            sendMessageParentWindow("sendEthAddress", { detail: result })
        })
        .catch(error => {

            console.error(error)
            displayResult(error)
            sendMessageParentWindow("errorEthAddress", { detail: error })
        })

}


function sendMessageParentWindow(action, message) {

    console.log(action, message)
}


function displayResult(result) {

    document.getElementById("result").innerHTML = JSON.stringify(result, undefined, 4)
}