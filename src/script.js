import './style.css'
import * as THREE from 'three'
import * as dat from 'lil-gui'
import * as CANNON from 'cannon-es'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import CannonDebugger from 'cannon-es-debugger'

// vars /-/-/-/-/-/-/-/
let helvetikerFont, loraFont, spaceMonoFont, fontsLoaded
let world, defaultMaterial, defaultContactMaterial, stonePhysMaterial, stoneContactMaterial, cannonDebugger
let minX, maxX, minY, maxY  //Stores the min and max X and Y world postions of the edges of the screen

const fontsToLoad = 3

var cannonDebugEnabled = true
var useOrtho = true
var fontLoadFlag = false

const objectsToUpdate = []
const fonts = []

const sizes = { width: window.innerWidth, height: window.innerHeight}
const aspectRatio = sizes.width / sizes.height


const parameters = {
    toggleCam: () => {
        useOrtho = !useOrtho
        updateCamType()
    },
    earthquake: () => {
        earthquake()
    },
    cannonDebugEnabled: false,
    earthquakeForce: 5
}

const colours = [
    new THREE.Color(0x354544),  // grey green
    new THREE.Color(0x3C680F),  // verdant green
    new THREE.Color(0x245F1F),  // letter green
    new THREE.Color(0x201E5D),  // dark purple
    new THREE.Color(0x5D2548),  // strong purple
    new THREE.Color(0x773F86),  // medium purple
    new THREE.Color(0x484677),  // light purple
    new THREE.Color(0xC34B78),  // strong pink
    new THREE.Color(0x1D5B66),  // teal
    new THREE.Color(0x1F7DB3),  // lighter blue
    new THREE.Color(0x1B273F),  // darkish blue
    new THREE.Color(0x6C462F),  // brown
    new THREE.Color(0xE96D13),  // nba orange
    new THREE.Color(0x6C462F)   //nba purple
]

const bgColours = [
    new THREE.Color(0xBEB3B1),
    new THREE.Color(0xC3BBB0),
    new THREE.Color(0xCAC9C5),
    new THREE.Color(0x1B273F)
]

// render /-/-/-/-/-/-/-/

const canvas = document.querySelector('canvas.webgl')
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// scene and cameras /-/-/-/-/-/-/-/

const scene = new THREE.Scene()
var col = randomBackgroundColour()
scene.background = col

const orthoCamera = new THREE.OrthographicCamera(-1 * aspectRatio, 1 * aspectRatio, 1, -1, 0.1, 2)
scene.add(orthoCamera)
orthoCamera.position.set(0, 0, 1)
//orthoCamera.lookAt(0,0,0)
const orthoHelper = new THREE.CameraHelper(orthoCamera)
//scene.add(orthoHelper)

const perspectiveCamera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
perspectiveCamera.position.set(- 3, 5, 3)
scene.add(perspectiveCamera)

var activeCamera

if(useOrtho) activeCamera = orthoCamera
else activeCamera = perspectiveCamera

const controls = new OrbitControls(perspectiveCamera, canvas)
controls.enableDamping = true

// lights /-/-/-/-/-/-/-/
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
scene.add(ambientLight)

const axesHelper = new THREE.AxesHelper()
axesHelper.position.y = 0.01
//scene.add(axesHelper)
//scene.background = new THREE.Color(0xffffff)

// materialss /-/-/-/-/-/-/-/
const mat = new THREE.MeshPhongMaterial({color: 0xff0000})
const normalMat = new THREE.MeshNormalMaterial()

// loaders /-/-/-/-/-/-/-/
const fontLoader = new FontLoader()
var letters  = []

// init calls /-/-/-/-/-/-/-/
initPhysics()
loadFonts()

// Sounds /////
const hitSound = new Audio('/sounds/hit.mp3')

const playHitSound = (collision) =>
{
    const impactStrength = collision.contact.getImpactVelocityAlongNormal()

    if(impactStrength > 1.5)
    {
        hitSound.volume = Math.random()
        hitSound.currentTime = 0
        hitSound.play()
    }
}

// debug /-/-/-/-/-/-/-/
const gui = new dat.GUI()

gui.add(parameters, 'earthquake')
gui.add(parameters, 'toggleCam')
gui.add(parameters, 'cannonDebugEnabled')
gui.add(parameters, 'earthquakeForce').min(0).max(10).step(1)
//gui.add(parameters, 'reset')

// geometry /-/-/-/-/-/-/-/
const sphereGeometry = new THREE.SphereGeometry(1, 20, 20)
const boxGeometry = new THREE.BoxGeometry(1, 1, 1)


function initPhysics(){
    // Physics /////
    world = new CANNON.World()
    world.broadphase = new CANNON.SAPBroadphase(world)
    world.allowSleep = true
    world.gravity.set(0, - 5, 0)

    defaultMaterial = new CANNON.Material('default')
    defaultContactMaterial = new CANNON.ContactMaterial(
        defaultMaterial,
        defaultMaterial,
        {
            friction: 0.1,
            restitution: 0.7
        }
    )
    world.defaultContactMaterial = defaultContactMaterial

    stonePhysMaterial = new CANNON.Material('stone')
    stoneContactMaterial = new CANNON.ContactMaterial(
        defaultMaterial,
        stonePhysMaterial,
        {
            friction: 1,
            restitution: 0
        }
    )
    world.addContactMaterial(stoneContactMaterial)

    cannonDebugger = new CannonDebugger(scene, world)
}

function onFontsLoaded(){
    //createLetter("P", helvetikerFont, new THREE.Vector3(-0.2, 0, 0))
    //createLetter("h", loraFont, new THREE.Vector3(0, 0, 0))
    //createLetter("o", spaceMonoFont, new THREE.Vector3(0.2, 0, 0))
}

function loadFonts(){   // load and store all fonts, called once
    fontsLoaded = 0
    fontLoadFlag = false
    fontLoader.load("fonts/helvetiker_regular.typeface.json", (font) => {
        console.log('Helvetiker font loaded')
    
        helvetikerFont = font
        fonts.push(helvetikerFont)
        fontsLoaded++
        if(fontsLoaded == fontsToLoad) fontLoadFlag = true
    })

    fontLoader.load("fonts/Lora_Regular.json", (font) => {
        console.log("Lora font loaded")

        loraFont = font
        fonts.push(loraFont)
        fontsLoaded++
        if(fontsLoaded == fontsToLoad) fontLoadFlag = true
    })

    fontLoader.load("fonts/Space Mono_Regular.json", (font) => {
        console.log("Space mono font loaded")

        spaceMonoFont = font
        fonts.push(spaceMonoFont)
        fontsLoaded++
        if(fontsLoaded == fontsToLoad) fontLoadFlag = true
    })
}

function createLetter(textString, font, position){
    const size = 0.35
    const textGeometry = new TextGeometry(
        textString,
        {
            font: font,
            size: size,
            height: 0.05,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 0.001,
            bevelSize: 0.002,
            bevelOffset: 0,
            bevelSegments: 5
        }
    )
    textGeometry.computeBoundingBox()
    textGeometry.center()

    const mat = new THREE.MeshBasicMaterial( { color: randomColour() })
    
    const mesh = new THREE.Mesh(textGeometry, mat)
    mesh.name = textString + "_letter"
    mesh.userData = { letter: textString }
    mesh.position.copy(position)
    letters.push(mesh)
    scene.add(mesh)
    
    const helper = new THREE.Box3Helper(textGeometry.boundingBox)
    //scene.add(helper)
    helper.name = textString + "_helper"

    const body = new CANNON.Body({
        mass: 1,
        angularFactor: new CANNON.Vec3(0,0,1),      //Restricts rotation on x and y axis
        linearFactor: new CANNON.Vec3( 1, 1, 0),     //Restricts movement on z axis 
        angularDamping: 0.7
    })
    body.addShape(
        new CANNON.Box( new CANNON.Vec3(size/3, size/2, size/2)) 
    )

    body.position.copy(position)
    world.addBody(body)
    objectsToUpdate.push({ mesh, body })
}

// function to create each letter, 
// create physics body in function body, switch(font){ add shapes based on font }.
// Most fonts will be similar enough to use the same shapes
// master function createLetter() that calls baby functions

function createP(font){
     
}

function updateLetterFont(){
    
}

calculateScreenEdgePositon()
createStaticBox(new THREE.Vector3(0   , maxY, 0), new THREE.Vector3(maxX*2 , 0.01    , 1), false)  // Top
createStaticBox(new THREE.Vector3(maxX, 0   , 0), new THREE.Vector3(0.01    , maxY*2 , 1), true)   // Right
createStaticBox(new THREE.Vector3(0   , minY, 0), new THREE.Vector3(maxX*2 , 0.01    , 1), false)  // Bottom
createStaticBox(new THREE.Vector3(minX, 0   , 0), new THREE.Vector3(0.01    , maxY*2 , 1), true)   // Left

function calculateScreenEdgePositon(){
    // Create a vector for each corner of the screen
    var topLeft = new THREE.Vector3(-1, 1, 0);
    var topRight = new THREE.Vector3(1, 1, 0);
    var bottomLeft = new THREE.Vector3(-1, -1, 0);
    var bottomRight = new THREE.Vector3(1, -1, 0);

    // Create a raycaster object
    var raycaster = new THREE.Raycaster();

    // Use the raycaster to get the world position of each screen corner
    raycaster.setFromCamera(topLeft, activeCamera);
    var worldTopLeft = new THREE.Vector3();
    raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, -1)), worldTopLeft);
    raycaster.setFromCamera(topRight, activeCamera);
    var worldTopRight = new THREE.Vector3();
    raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, -1)), worldTopRight);
    raycaster.setFromCamera(bottomLeft, activeCamera);
    var worldBottomLeft = new THREE.Vector3();
    raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, -1)), worldBottomLeft);
    raycaster.setFromCamera(bottomRight, activeCamera);
    var worldBottomRight = new THREE.Vector3();
    raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, -1)), worldBottomRight);

    // Get the screen edges by taking the minimum and maximum values of the x and y coordinates
    minX = Math.min(worldTopLeft.x, worldTopRight.x, worldBottomLeft.x, worldBottomRight.x);
    maxX = Math.max(worldTopLeft.x, worldTopRight.x, worldBottomLeft.x, worldBottomRight.x);
    minY = Math.min(worldTopLeft.y, worldTopRight.y, worldBottomLeft.y, worldBottomRight.y);
    maxY = Math.max(worldTopLeft.y, worldTopRight.y, worldBottomLeft.y, worldBottomRight.y);

    // Log the screen edges
    console.log("Min X:", minX);
    console.log("Max X:", maxX);
    console.log("Min Y:", minY);
    console.log("Max Y:", maxY);

}

function createStaticBox(position, size = {x:1, y:1, z:1}, vertical){
    const boxGeo = new THREE.BoxGeometry(size.x, size.y, size.z)
    const boxMesh = new THREE.Mesh(boxGeo, mat)

    boxMesh.position.copy(position)
    //boxMesh.scale.copy(scale)

    scene.add(boxMesh)

    const body = new CANNON.Body({
        mass: 0
    })
    body.addShape(new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)))
    body.position.copy(position)
    world.addBody(body)
    
}

function earthquake(){
    var impulse = new THREE.Vector3()
    objectsToUpdate.forEach(element => {
        impulse = new THREE.Vector3(rand(-parameters.earthquakeForce,parameters.earthquakeForce), rand(5,parameters.earthquakeForce), 0)
        element.body.applyImpulse( impulse, CANNON.Vec3.ZERO )
    });
}

// Update /////
const clock = new THREE.Clock()
let oldElapsedTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - oldElapsedTime
    oldElapsedTime = elapsedTime

    if(fontLoadFlag){
        onFontsLoaded()
        fontLoadFlag = false
    }

    // Update physics
    world.step(1 / 60, deltaTime, 3)
    if(objectsToUpdate.length > 0){
        //console.log(objectsToUpdate)
    }
    for(const object of objectsToUpdate)
    {
        object.mesh.position.set(object.body.position.x, object.body.position.y, 0)
        object.mesh.quaternion.copy(object.body.quaternion)
    }

    // Update controls
    //controls.update()
    if(parameters.cannonDebugEnabled) cannonDebugger.update()

    // Render
    renderer.render(scene, activeCamera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()

function rand(min, max){    // inclusive
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function updateCamType(){

    if(useOrtho){    // true == use orthographic camera
        activeCamera = orthoCamera
    }
    else{               // Use perspective camera with orbit controls
        activeCamera = perspectiveCamera
    }
}

function randomColour(){
    var rand = Math.floor(Math.random() * Object.keys(colours).length)
    var randColour = colours[Object.keys(colours)[rand]]
    return randColour
}

function randomFont(){
    var rand = Math.floor(Math.random() * fonts.length )
    return fonts[rand]
}

function randomBackgroundColour(){
    var rand = Math.floor(Math.random() * Object.keys(bgColours).length)
    var randColour = bgColours[Object.keys(bgColours)[rand]]
    return randColour
}

// Events /////
window.addEventListener('keydown', function(event) {
    console.log(event.key.charCodeAt(0))
    if(event.key.charCodeAt(0) >= 97 && event.key.charCodeAt(0) <= 122){    //If input is a letter a-z
        //createLetter(event.key, randomFont(), new THREE.Vector3(0,0,0))
    }
    else if(event.key.charCodeAt(0) >= 65 && event.key.charCodeAt(0) <= 90){
        //createLetter(event.key, randomFont(), new THREE.Vector3(0,0,0))
    }
    createLetter(event.key, randomFont(), new THREE.Vector3(0,0,0))
})

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    
    // Update camera
    activeCamera.aspect = sizes.width / sizes.height
    activeCamera.updateProjectionMatrix()
    
    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    calculateScreenEdgePositon()
})

// Debug menu /////
parameters.reset = () =>
{
    for(const object of objectsToUpdate)
    {
        // Remove body
        object.body.removeEventListener('collide', playHitSound)
        world.removeBody(object.body)

        // Remove mesh
        scene.remove(object.mesh)
    }
    
    objectsToUpdate.splice(0, objectsToUpdate.length)
}


