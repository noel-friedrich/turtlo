class Vector2d {

    constructor(x, y) {
        this.x = x
        this.y = y
    }

    copy() {
        return new Vector2d(this.x, this.y)
    }

    add(v) {
        return new Vector2d(this.x + v.x, this.y + v.y)
    }

    iadd(v) {
        this.x += v.x
        this.y += v.y
    }

    sub(v) {
        return new Vector2d(this.x - v.x, this.y - v.y)
    }

    get length() {
        return Math.sqrt(this.x * this.x + this.y * this.y)
    }
    
    scale(x) {
        return new Vector2d(this.x * x, this.y * x)
    }

    static fromAngle(angle) {
        return new Vector2d(Math.cos(angle), Math.sin(angle))
    }

    get angle() {
        return Math.atan2(this.y, this.x)
    }

    angleTo(v) {
        return Math.atan2(v.y - this.y, v.x - this.x)
    }

    equals(v) {
        return this.x == v.x && this.y == v.y
    }

}

class TurtloImageUrl {

    static imageBasePath = "https://www.noel-friedrich.de/terminal/res/img/turtlo/"
    
    static _getImagePath(fileName) {
        return this.imageBasePath + fileName
    }

    static get WALKING_0() { return this._getImagePath("walking-0.png") }
    static get WALKING_1() { return this._getImagePath("walking-1.png") }
    static get WALKING_2() { return this._getImagePath("walking-2.png") }

    static get HIDDEN() { return this._getImagePath("hidden.png") }
    static get TOUNGE() { return this._getImagePath("tounge.png") }

    static get WALKING_IMAGES() {
        return [this.WALKING_0, this.WALKING_1, this.WALKING_2, this.WALKING_1]
    }

}

const TurtloContainerCSS = {
    "position": "fixed",
    "z-index": 2147483647, // max z-index (2^31-1, max 32-bit signed integer)
    "pointer-events": "none",
    "user-select": "none",
    "top": "0px",
    "left": "0px",
    "width": "100%",
    "height": "100%",
    "overflow": "hidden",
    "transition": "opacity 1s",
}

const TurtloElementCSS = {
    "position": "absolute",
    "image-rendering": "pixelated", // no anti-aliasing
    "filter": "none", // some websites use filters to make images look blurry
}

const TurtloState = {
    STILL: "still",
    MOVING: "moving",
}

class TurtloAction {

    constructor({
        name = "unnamed action",
        probability = 1,
        initiate = () => {},
        update = () => {},
        durationMs = () => 3000,
    }) {
        this.name = name
        this.probability = probability
        this.initiate = initiate
        this.update = update
        this.durationMs = durationMs
    }

}

class Turtlo {

    actions = [
        new TurtloAction({
            name: "Move to middle",
            probability: 0,
            update: (turtlo, mousePosition, timeStamp) => {
                turtlo.desiredPosition = new Vector2d(window.innerWidth / 2, window.innerHeight / 2)
                turtlo._updateDesiredRotation(turtlo.desiredPosition)
                turtlo._updatePosition()
                turtlo._updateRotation()
                turtlo._updateCurrentState()
                turtlo._updateImageUrl(timeStamp)
            },
            durationMs: () => 3000,
        }),
            
        new TurtloAction({
            name: "Stick out tounge",
            probability: 6,
            update: (turtlo, mousePosition, timeStamp) => {
                turtlo._updateDesiredRotation(mousePosition)
                turtlo._updateRotation()
                turtlo.currentImageUrl = TurtloImageUrl.TOUNGE
            },
            durationMs: () => Math.random() * 2000 + 2000,
        }),

        new TurtloAction({
            name: "Hide in shell",
            probability: 2,
            update: (turtlo, mousePosition, timeStamp) => {
                turtlo.currentImageUrl = TurtloImageUrl.HIDDEN
            },
            durationMs: () => Math.random() * 6000 + 4000,
        }),

        new TurtloAction({
            name: "Spin",
            probability: 4,
            initiate: turtlo => {
                turtlo.a.startSpinTime = Date.now()
                turtlo.a.numSpins = Math.floor(Math.random() * 2) + 1
                turtlo.a.startRotation = turtlo.rotation
            },
            update: (turtlo, mousePosition, timeStamp) => {
                let timeElapsed = timeStamp - turtlo.a.startSpinTime
                let spinProgress = timeElapsed / turtlo.currActionDuration * turtlo.a.numSpins
                turtlo.desiredRotation = spinProgress * 360 + turtlo.a.startRotation
                turtlo._updateRotation()
            },
            durationMs: () => 1000
        }),

        new TurtloAction({
            name: "Walk around Mouse",
            probability: 4,
            initiate: turtlo => {
                turtlo.a.startWalkTime = Date.now()
                turtlo.a.rotationLengthMs = Math.random() * 2000 + 1000
                turtlo.a.rotationRadius = (Math.random() * 0.5 + 0.1) * turtlo._sizeFactor
            },
            update: (turtlo, mousePosition, timeStamp) => {
                let timeElapsed = timeStamp - turtlo.a.startWalkTime
                let rotationProgress = timeElapsed / turtlo.a.rotationLengthMs
                let offset = Vector2d.fromAngle(rotationProgress * 2 * Math.PI)
                    .scale(turtlo.a.rotationRadius)
                turtlo.desiredPosition = mousePosition.add(offset)

                turtlo._updateDesiredRotation(turtlo.desiredPosition)
                turtlo._updatePosition()
                turtlo._updateRotation()
                turtlo._updateCurrentState()
                turtlo._updateImageUrl(timeStamp)
            },
            durationMs: () => Math.random() * 8000 + 2000,
        }),

        new TurtloAction({
            name: "Walk to random position",
            probability: 4,
            initiate: turtlo => {
                turtlo.a.randomPosition = new Vector2d(
                    Math.random() * window.innerWidth,
                    Math.random() * window.innerHeight
                )
            },
            update: (turtlo, mousePosition, timeStamp) => {
                turtlo.desiredPosition = turtlo.a.randomPosition
                currMousePosition = turtlo.a.randomPosition

                turtlo._updateDesiredRotation(turtlo.desiredPosition)
                turtlo._updatePosition()
                turtlo._updateRotation()
                turtlo._updateCurrentState()
                turtlo._updateImageUrl(timeStamp)
            }
        }),

        new TurtloAction({
            name: "Walk out of screen",
            probability: 2,
            initiate: turtlo => {
                turtlo.a.originalMousePosition = currMousePosition.copy()
                turtlo.a.startWalkTime = Date.now()
                turtlo.a.originalPos = turtlo.position.copy()
                turtlo.a.switchedSides = false
            },
            update: (turtlo, mousePosition, timeStamp) => {
                if (!mousePosition.equals(turtlo.a.originalMousePosition)) {
                    turtlo._endCurrentAction()
                    return
                }

                let timeElapsed = timeStamp - turtlo.a.startWalkTime
                if (timeElapsed < turtlo.currActionDuration / 2) {
                    turtlo.desiredPosition = new Vector2d(
                        -turtlo.element.clientHeight * 3,
                        turtlo.a.originalPos.y
                    )
                } else {
                    if (!turtlo.a.switchedSides && turtlo.position.x < 0) {
                        turtlo.position = new Vector2d(
                            window.innerWidth + turtlo.element.clientHeight * 3,
                            turtlo.a.originalPos.y
                        )
                        turtlo.a.switchedSides = true
                    }

                    turtlo.desiredPosition = turtlo.a.originalPos.copy()
                }

                turtlo._updateDesiredRotation(turtlo.desiredPosition)
                turtlo._updatePosition()
                turtlo._updateRotation()
                turtlo._updateCurrentState()
                turtlo._updateImageUrl(timeStamp)
            },
            durationMs: () => 5000,
        }),
    ]

    _applyCSS(element, css) {
        for (let key in css) {
            element.style[key] = css[key]
        }
    }

    _angleDifference(a, b) {
        let difference = b - a
        if (difference > 180) {
            difference -= 360
        } else if (difference < -180) {
            difference += 360
        }
        return difference
    }

    get _sizeFactor() {
        return Math.min(
            window.innerWidth,
            window.innerHeight
        )
    }

    _sizeToPx(size) {
        return size * this._sizeFactor / 13
    }

    makeTurtloContainerElement() {
        let element = document.createElement("div")
        this._applyCSS(element, TurtloContainerCSS)
        return element
    }

    makeTurtloElement() {
        let element = document.createElement("img")
        this._applyCSS(element, TurtloElementCSS)
        return element
    }

    get sizePx() {
        return this._sizeToPx(this.size)
    }

    constructor() {
        this.hidden = false
        this.alive = true

        this.position = new Vector2d(-100, -100)
        this.desiredPosition = new Vector2d(0, 0)
        this.size = 1
        this.rotation = 0
        this.desiredRotation = 0
        this.currentImageUrl = TurtloImageUrl.WALKING_0
        this.state = TurtloState.STILL
        this.generalActionProbability = 0.01
        this.currAction = null
        this.currActionStartTime = null
        this.currActionDuration = null
        
        this.moveSpeed = 0.05
        this.rotationSpeed = 0.3
        
        this.containerElement = this.makeTurtloContainerElement()
        this.element = this.makeTurtloElement()
        this.containerElement.appendChild(this.element)
        document.body.appendChild(this.containerElement)



        // actions may store state in this.a
        this.a = {}
    }

    _startActionByName(actionName) {
        let action = this.actions.find(a => a.name === actionName)
        if (action) {
            this._startAction(action, Date.now())
        }
    }

    toggle() {
        this.hidden = !this.hidden

        if (this.hidden) {
            this._startActionByName("Move to middle")
            setTimeout(() => {
                this.containerElement.style.opacity = this.hidden ? 0 : 1
            }, 1000)
            setTimeout(() => {
                this.alive = false
            }, 2500)
        } else {
            this.containerElement.style.opacity = this.hidden ? 0 : 1
            this.alive = true
        }
    }

    _updateDesiredPosition(mousePosition) {
        this.desiredPosition = mousePosition.add(new Vector2d(
            0, -this.element.clientHeight
        ))
    }

    _updateDesiredRotation(relativePosition) {
        this.desiredRotation = this.position.angleTo(relativePosition) / Math.PI * 180
    }

    _updateCurrentState() {
        const differenceVector = this.desiredPosition.sub(this.position)
        if (differenceVector.length < 15) { // threshold for moving vs. still
            this.state = TurtloState.STILL
        } else {
            this.state = TurtloState.MOVING
        }
    }

    _updatePosition() {
        const differenceVector = this.desiredPosition.sub(this.position)
        this.position.iadd(differenceVector.scale(this.moveSpeed))
    }

    _updateRotation() {
        this.rotation += this._angleDifference(this.rotation, this.desiredRotation) * this.rotationSpeed

        this.rotation %= 360
        while (this.rotation < 0) {
            this.rotation += 360
        }
    }

    _updateImageUrl(timeStamp) {
        if (this.state == TurtloState.STILL) {
            this.currentImageUrl = TurtloImageUrl.WALKING_0
        } else if (this.state == TurtloState.MOVING) {
            const msModulo = 24000 / updateFPS
            const imageIndex = Math.floor((timeStamp % msModulo) / msModulo
                * TurtloImageUrl.WALKING_IMAGES.length)
            this.currentImageUrl = TurtloImageUrl.WALKING_IMAGES[imageIndex]
        }
    }

    _endCurrentAction() {
        this.currAction = null
        this.currActionStartTime = null
        this.currActionDuration = null
    }

    _getRandomAction() {
        let probabilitySum = this.actions.reduce((sum, action) => sum + action.probability, 0)
        let random = Math.random() * probabilitySum
        let currSum = 0
        for (let action of this.actions) {
            currSum += action.probability
            if (random <= currSum) {
                return action
            }
        }
    }

    _startAction(action, timeStamp) {
        this.currAction = action
        this.currActionStartTime = timeStamp
        this.currActionDuration = this.currAction.durationMs()
        this.currAction.initiate(this)
    }

    _startRandomAction(timeStamp) {
        this._startAction(this._getRandomAction(), timeStamp)
    }

    _updateCurrentAction(timeStamp) {
        if (this.currAction) {
            let elapsedTime = timeStamp - this.currActionStartTime
            if (elapsedTime > this.currActionDuration) {
                this._endCurrentAction()
            } 
        } else if (this.state == TurtloState.STILL) {
            if (Math.random() < this.generalActionProbability) {
                this._startRandomAction(timeStamp)
            }
        }
    }

    updateState(mousePosition, timeStamp) {
        this._updateCurrentAction(timeStamp)

        if (this.currAction) {
            this.currAction.update(this, mousePosition, timeStamp)
        } else {
            this._updateDesiredPosition(mousePosition)
            this._updateDesiredRotation(this.desiredPosition)
            this._updateCurrentState()
            this._updatePosition()
            this._updateRotation()
            this._updateImageUrl(timeStamp)
        }
    }

    updateElement() {
        this.element.src = this.currentImageUrl
        this.element.style.left = `${this.position.x - this.element.clientWidth / 2}px`
        this.element.style.top = `${this.position.y - this.element.clientHeight / 2}px`
        this.element.style.width = `${this.sizePx}px`
        this.element.style.transform = `rotate(${this.rotation + 90}deg)`
    }

}

let turtloInstance = null
let currMousePosition = new Vector2d(
    window.innerWidth / 2,
    window.innerHeight / 2
)
const updateFPS = 24

async function update() {
    if (!turtloInstance) return
    if (!turtloInstance.alive) return

    turtloInstance.updateState(currMousePosition, Date.now())
    turtloInstance.updateElement()
}

async function isSiteEnabled() {
    const {disabledWebsites} = await chrome.storage.sync.get({"disabledWebsites": []})
    const currentUrl = window.location.href
    const hostname = new URL(currentUrl).hostname
    return !disabledWebsites.some(
        disabledWebsite => hostname.endsWith(disabledWebsite)
    )
}

async function main() {
    let enabled = await isSiteEnabled()
    if (!enabled) return

    turtloInstance = new Turtlo()
    
    setInterval(update, 1000 / updateFPS)
    window.addEventListener("mousemove", (event) => {
        currMousePosition.x = event.clientX
        currMousePosition.y = event.clientY
    })
}

main()

chrome.runtime.onMessage.addListener(request => {
    if (!turtloInstance) return
	if (request.type == "toggle-turtlo") {
		turtloInstance.toggle()
	}
})