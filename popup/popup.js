const toggleTurtloButton = document.getElementById("toggle-turtlo-btn")
const enablePermanentlyButton = document.getElementById("enable-permanently-btn")
const disablePermanentlyButton = document.getElementById("disable-permanently-btn")
const notPossibleWarning = document.getElementById("not-possible")

async function getUrl() {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true})
    const domain = (new URL(tab.url)).hostname
    const parsedDomain = psl.parse(domain).domain
    return {tab, parsedDomain}
}

async function toggleTurtlo() {
    const {tab} = await getUrl()
    chrome.tabs.sendMessage(tab.id, {type: "toggle-turtlo"})
	window.close()
}

async function enablePermanently() {
    const {tab, parsedDomain} = await getUrl()

    const {disabledWebsites} = await chrome.storage.sync.get({"disabledWebsites": []})
    if (!disabledWebsites.includes(parsedDomain)) return
    disabledWebsites.splice(disabledWebsites.indexOf(parsedDomain), 1)
    await chrome.storage.sync.set({"disabledWebsites": disabledWebsites})

    chrome.tabs.reload(tab.id)
    window.close()
}

async function disablePermanently() {
    const {tab, parsedDomain} = await getUrl()

    const {disabledWebsites} = await chrome.storage.sync.get({"disabledWebsites": []})
    if (disabledWebsites.includes(parsedDomain)) return
    disabledWebsites.push(parsedDomain)
    await chrome.storage.sync.set({"disabledWebsites": disabledWebsites})

    chrome.tabs.reload(tab.id)
    window.close()
}

toggleTurtloButton.addEventListener("click", toggleTurtlo)
enablePermanentlyButton.addEventListener("click", enablePermanently)
disablePermanentlyButton.addEventListener("click", disablePermanently)

async function updateButtons() {
    const {parsedDomain} = await getUrl()
    if (!parsedDomain) {
        notPossibleWarning.style.display = "block"
        toggleTurtloButton.style.display = "none"
        enablePermanentlyButton.style.display = "none"
        disablePermanentlyButton.style.display = "none"
        openSettingsButton.style.display = "none"
        return
    }

    const {disabledWebsites} = await chrome.storage.sync.get({"disabledWebsites": []})
    
    if (disabledWebsites.includes(parsedDomain)) {
        disablePermanentlyButton.style.display = "none"
        toggleTurtloButton.style.display = "none"
    } else {
        enablePermanentlyButton.style.display = "none"
    }
}

updateButtons()