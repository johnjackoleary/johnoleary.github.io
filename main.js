var container, stats;

var interactiveView, scene, renderer;

var containerWidth, containerHeight;

var gui = new dat.GUI();

var testOrbit;

var cameraRig;
var views = {
  "FirstPerson": {
          left: 0,
          bottom: 0,
          width: 1.0,
          height: 1.0,
          background: new THREE.Color().setRGB( 1, 1, 1 ),
          eye: [ 0, 0, 50 ],
          up: [ 0, 0, 1 ],
          fov: 60,
          near: 1.5,
          controls: null,
          updateCamera: function ( camera, scene, mouseX, mouseY ) {
            // camera.position.x += mouseX * 0.05;
            // camera.position.x = Math.max( Math.min( camera.position.x, 2000 ), -2000 );
            if (CURRENT_POSE && params.FirstPerson) {
              // camera.position = CURRENT_POSE.position;
              // var tempVec = new THREE.Vector3(0,0,0);
              // CURRENT_POSE.parent.localToWorld(tempVec);
              camera.position.set(CURRENT_POSE.position.x, CURRENT_POSE.position.y, CURRENT_POSE.position.z)
              var camera_array_index = CURRENT_POSE.poseIndex * 16;
              // camera.quaternion.set(camera_poses[camera_array_index], camera_poses[camera_array_index + 1], 
              //                        camera_poses[camera_array_index + 2], camera_poses[camera_array_index + 3]);
              camera.quaternion.set(CURRENT_POSE.quaternion.x, CURRENT_POSE.quaternion.y, 
                                     CURRENT_POSE.quaternion.z, CURRENT_POSE.quaternion.w);
              camera.rotateOnAxis(new THREE.Vector3(1,0,0), Math.PI);
            }
          }
        },
  "ThirdPerson": { 
          left: .02,
          bottom: 0.02,
          width: 0.2,
          height: 0.2,
          background: new THREE.Color().setRGB( .99, .99, .99 ),
          eye: [ 0, 0, 50 ],
          up: [ 0, 0, 1 ],
          fov: 60,
          near: 4,
          controls: null,
          updateCamera: function ( camera, scene, mouseX, mouseY ) {
            // camera.position.x -= mouseX * 0.05;
            // camera.position.x = Math.max( Math.min( camera.position.x, 2000 ), -2000 );
            // camera.lookAt(CURRENT_POSE.position);
          }
        } 
      };

var params = {
  FirstPerson: false,
  Play: false,

}
var SHOWHELPTEXT = false;

var keyboard = new THREEx.KeyboardState();

var cameraPoses = [];
var mouse = { x: -Infinity, y: -Infinity }, INTERSECTED;
var CURRENT_POSE = null;
var CURRENT_POSE_OBJECT;
var CURRENT_IMAGE_TEXTURE = null;

NumberOfTrajectories = 1;
camera_poses = [walter_1_traj];
var trajectory_drawing = [];
var shadow = [];
var sceneTranslationVector;
var sceneBoundingBox;

var point_cloud_json, pointCloud;
var point_cloud_geo = new THREE.Geometry();

var radiusAroundObject = 1.5;

var DATA_DIR         = "data/"
var IMAGE_DIRECTORY  = [DATA_DIR + "Walter-1/", DATA_DIR + "Walter-2/", DATA_DIR + "Walter-3/", DATA_DIR + "Walter-4/"];
var startingImageId = [10, 10, 10, 100];     // Image cooresponding to first xkk pose
var intervalBetweenPoses = 5; // Number of images between xkk printouts
var CHEVRON_TEXTURE     = [DATA_DIR + "Chevron_blue.png", DATA_DIR + "Chevron_green.png", DATA_DIR + "Chevron_red.png", DATA_DIR + "Chevron_indigo.png"];
var TRAIN_TEXTURE       = DATA_DIR + "train.png";
var TRACK_TEXTURE       = DATA_DIR + "track.png";
var CONTEXT_BOX_TEXTURE = DATA_DIR + "grid.png";

init();
animate();

function init() {
  container = document.getElementById( 'container' );
  containerWidth = window.innerWidth;
  containerHeight = window.innerHeight;
  // console.log(containerWidth);

  // // Help text
  // var helpText = document.createElement( 'div' );
  // helpText.id = 'helpText'
  // helpText.style.position = 'absolute';
  // helpText.style.top = '10px';
  // helpText.style.width = '100%';
  // helpText.style.fontSize = '12px';
  // container.appendChild( helpText );
  // ToggleHelpText();

  // Create image viewer
  var image_viewer = document.createElement( 'div' );
  image_viewer.style.position = 'absolute';
  image_viewer.style.top = '10px';
  image_viewer.style.left = '10px';
  image_viewer.style.visibility = 'hidden';
  image_viewer.innerHTML += '<img src="" alt="" id="currentImage" height="240" width="320">';
  container.appendChild( image_viewer );


  scene = new THREE.Scene();
  // scene.autoUpdate = false;

  // world
  var geometry = new THREE.CylinderGeometry( 0, 10, 30, 4, 1 );
  var material = new THREE.MeshLambertMaterial( { color:0xffffff, shading: THREE.FlatShading } );

  // Add point cloud
  // CREATE THIS FIRST TO SET sceneTranslationVector
  createPointCloud();

  // add trajectory
  createTrajectory();

  // add camera poses
  createPoses();

  // center the scene, then add a box
  createBoundingBox();

  // lights
  light = new THREE.DirectionalLight( 0x808080 );
  light.position.set( 0, 0, 10 );
  scene.add( light );

  light = new THREE.DirectionalLight( 0x002288 );
  light.position.set( -1, -1, -1 );
  scene.add( light );
  
  light = new THREE.DirectionalLight( 0x808080);
  light.position.set( 1, 1, 1 );
  scene.add( light );

  light = new THREE.AmbientLight( 0x222222 );
  scene.add( light );

  // Camera setup
  ResetView();

  // renderer
  renderer = new THREE.WebGLRenderer( { antialias: true} );
  renderer.setClearColor( 0x000000, 1 );
  renderer.setSize( containerWidth, containerHeight );
  // renderer.enableScissorTest ( true );

  container.appendChild( renderer.domElement );

  window.addEventListener( 'resize', onWindowResize, false );

  // when the mouse moves, call the given function
  document.addEventListener( 'mousemove', onDocumentMouseMove, false );

  // when the mouse is CURRENT_POSE, call other function
  document.addEventListener( 'mousedown', onDocumentMouseClick, false );

  UpdateForNewPose(cameraPoses[0]);
}

function updateMouse(event) {
    mouse.x = ( event.clientX / containerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / containerHeight ) * 2 + 1;

    if (params.FirstPerson) {
      // mouse.x *=
    }
}

function onDocumentMouseClick( event ) {
  // update the mouse variable
  updateMouse(event);

  // display nearby images
  // create a Ray with origin at the mouse position
  // and direction into the scene (views["FirstPerson"].camera direction)
  var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
  var ray = new THREE.Raycaster( interactiveView.camera.position, vector.unproject(interactiveView.camera).sub( views["FirstPerson"].camera.position ).normalize() );

  // create an array containing all objects in the scene with which the ray intersects
  var intersects = ray.intersectObjects( cameraPoses );

  // if there is one (or more) intersections
  if ( intersects.length > 0 )
  {
    UpdateForNewPose(intersects[ 0 ].object);
  } 
}

function onDocumentMouseMove( event ) 
{
  // the following line would stop any other event handler from firing
  // (such as the mouse's TrackballControls)
  // event.preventDefault();
  
  // update the mouse variable
  updateMouse(event);
}

function onWindowResize() {
  containerWidth = window.innerWidth;
  containerHeight = window.innerHeight;
  console.log(containerWidth);

  views["FirstPerson"].camera.aspect = containerWidth / containerHeight;
  views["FirstPerson"].camera.updateProjectionMatrix();

  views["ThirdPerson"].camera.aspect = containerWidth / containerHeight;
  views["ThirdPerson"].camera.updateProjectionMatrix();

  renderer.setSize( containerWidth, containerHeight );

}

function animate() {
  requestAnimationFrame( animate );

  if (params.Play) {
    var current_idx = CURRENT_POSE.poseIndex;
    current_idx++;
    if (current_idx >= cameraPoses.length) current_idx = 0;
    UpdateForNewPose(cameraPoses[current_idx]);
  }

  // interactiveView.controls.update();
  update();
  render();
}

function update() {
    // create a Ray with origin at the mouse position
  //   and direction into the scene (views["FirstPerson"].camera direction)
  var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
  // projector.unprojectVector( vector, views["FirstPerson"].camera );
  var ray = new THREE.Raycaster( interactiveView.camera.position, vector.unproject(interactiveView.camera).sub( interactiveView.camera.position ).normalize() );

  // create an array containing all objects in the scene with which the ray intersects
  var intersects = ray.intersectObjects( cameraPoses );

  for (var i = 0; i < cameraPoses.length; i++)
    cameraPoses[i].visible = false;
  if (!params.FirstPerson) {
    if (intersects.length > 0) {
      var rangeOfPoses = 20;
      var mid = intersects[ 0 ].object.poseIndex;
      start = Math.max(mid - rangeOfPoses, 0);
      end = Math.min(mid + rangeOfPoses, cameraPoses.length-1);
      for (var i = start; i < end; i++) {
        var opacity = 1 - (Math.abs(i-mid)/rangeOfPoses) * (Math.abs(i-mid)/rangeOfPoses);
        cameraPoses[i].visible = true;
        cameraPoses[i].material.opacity = opacity;
      }
    } else {
      for (var i = 0; i < cameraPoses.length; i++) {
        if (CURRENT_POSE == cameraPoses[i]) continue;
        var distance = ray.ray.distanceToPoint(cameraPoses[i].position);
        if (distance < radiusAroundObject && !params.FirstPerson ) {
          var opacity = 1 - (distance/radiusAroundObject)*(distance/radiusAroundObject);
          cameraPoses[i].visible = true;
          cameraPoses[i].material.opacity = opacity;
        }
      }
    }
  }

  // INTERSECTED = the object in the scene currently closest to the interactiveView.camera 
  //    and intersected by the Ray projected from the mouse position  
  
  // if there is one (or more) intersections
  if ( intersects.length > 0 )
  {
    // if the closest object intersected is not the currently stored intersection object
    if ( intersects[ 0 ].object != INTERSECTED ) 
    {
        // restore previous intersection object (if it exists) to its original color
        // and make it invisible
      if ( INTERSECTED ) {
        RestorePose(INTERSECTED);
      }
      // store reference to closest object as current intersection object
      INTERSECTED = intersects[ 0 ].object;
      // // store color of closest object (for later restoration)
      INTERSECTED.material.color.setHex(0xffff00);
    }
  } 
  else // there are no intersections
  {
    // restore previous intersection object (if it exists) to its original color
    if ( INTERSECTED ) {
      RestorePose(INTERSECTED);
    }
    // remove previous intersection object reference
    //     by setting current intersection object to "nothing"
    INTERSECTED = null;
  }

  checkKeyboard();
  AnimateVisiblePoses();


  // Basically, find the furthest possible point from the camera, and set that to be black.
  // Then find the closest possible point, and set that to be white
  if (pointCloud.visible) {
    var cameraDistance = camera.position.distanceTo(point_cloud_geo.boundingSphere.center);
    var pointCloudRadius = point_cloud_geo.boundingSphere.radius;
    var farthestDistance;
    if (cameraDistance > pointCloudRadius) {
      farthestDistance = 2 * pointCloudRadius;
      for( var i = 0; i < point_cloud_geo.vertices.length; i++ ) {
          var distance = camera.position.distanceTo(pointCloud.geometry.vertices[i]) - cameraDistance + pointCloudRadius;
          distance = 1.1 - (distance/farthestDistance);
          pointCloud.geometry.colors[i].setRGB(distance, distance, distance);
          // pointCloud.geometry.colors[i].setHSL(0, 1.0, distance);
      }
    } else {
      farthestDistance = pointCloudRadius + cameraDistance;
      for( var i = 0; i < point_cloud_geo.vertices.length; i++ ) {
          var distance = camera.position.distanceTo(pointCloud.geometry.vertices[i]);
          distance = 1.1 - (distance/farthestDistance);
          pointCloud.geometry.colors[i].setRGB(distance, distance, distance);
          // pointCloud.geometry.colors[i].setHSL(0, 1.0, distance);
      }
    }
    // console.log(point_cloud_geo.boundingSphere);
    pointCloud.geometry.colorsNeedUpdate = true;
  }
}

function checkKeyboard() {
  // if (! keyboard.pressed()) {
  //   return;
  // }

  if ( keyboard.pressed("r") )
    ResetView();

  if (keyboard.pressed("up")) {
    console.log("Entering FirstPerson mode.");
    // views["FirstPerson"].camera.aspect = containerWidth / containerHeight;
    // views["FirstPerson"].camera.updateProjectionMatrix();

    // views["ThirdPerson"].camera.aspect = containerWidth / containerHeight;
    // views["ThirdPerson"].camera.updateProjectionMatrix();
    params.FirstPerson = true;

    // views["FirstPerson"].controls.enabled = false;
    // interactiveView = views["ThirdPerson"];
    // interactiveView.controls.enabled = true;
    ResetView();  
    view = views["FirstPerson"];
    camera = view.camera;
    view.updateCamera( camera, scene, mouse.x, mouse.y );
    camera.updateProjectionMatrix();
  }

  if (keyboard.pressed("down")) {
    // views["FirstPerson"].camera.aspect = containerWidth / containerHeight;
    // views["FirstPerson"].camera.updateProjectionMatrix();

    params.FirstPerson = false;

    // views["ThirdPerson"].controls.enabled = false;
    // interactiveView = views["FirstPerson"];
    // interactiveView.controls.enabled = true;
  }

  if (CURRENT_POSE) {
    if (keyboard.pressed("left")) {
      var current_idx = CURRENT_POSE.poseIndex;

      current_idx--;
      if (current_idx < 0) current_idx = cameraPoses.length - 1;
      UpdateForNewPose(cameraPoses[current_idx]);
    }

    if (keyboard.pressed("right")) {
      var current_idx = CURRENT_POSE.poseIndex;
      current_idx++;
      if (current_idx >= cameraPoses.length) current_idx = 0;
      UpdateForNewPose(cameraPoses[current_idx]);
    }
  }

  // Hacky solution, but this makes it only read one key press at a time
  keyboard = new THREEx.KeyboardState();
}

function AnimateVisiblePoses() {
  // for (var i = 0; i < cameraPoses.length; i++) {
  //   poseObject = cameraPoses[i].parent;
  // }
}

function render() {
  renderer.clear();
  // if (params.FirstPerson) { 
  //   for (var key in views) {
  //     view = views[key];
  //     camera = view.camera;

  //     view.updateCamera( camera, scene, mouse.x, mouse.y );

  //     var left   = Math.floor( containerWidth  * view.left );
  //     var bottom = Math.floor( containerHeight * view.bottom );
  //     var width  = Math.floor( containerWidth  * view.width );
  //     var height = Math.floor( containerHeight * view.height );
  //     renderer.setViewport( left, bottom, width, height );
  //     renderer.setScissor( left, bottom, width, height );

  //     camera.aspect = width / height;
  //     camera.updateProjectionMatrix();
  //   }
  // } else {
  //   var left   = Math.floor( containerWidth  * view.left );
  //   var bottom = Math.floor( containerHeight * view.bottom );
  //   var width  = Math.floor( containerWidth  * view.width );
  //   var height = Math.floor( containerHeight * view.height );
  //   renderer.setViewport( left, bottom, width, height );
  //   renderer.setScissor( left, bottom, width, height );

  //   camera.aspect = width / height;
  // }
  renderer.render( scene, camera );
}

function createBoundingBox() {
  // Make it as large as the point cloud
  point_cloud_geo.computeBoundingBox();
  point_cloud_geo.computeBoundingSphere();
  var pointCoudBox = point_cloud_geo.boundingBox;

  var geometry = new THREE.BoxGeometry( pointCoudBox.max.x - pointCoudBox.min.x, 
                                        pointCoudBox.max.y - pointCoudBox.min.y,
                                        pointCoudBox.max.z - pointCoudBox.min.z );
  var geometry = new THREE.PlaneGeometry(pointCoudBox.max.x - pointCoudBox.min.x, pointCoudBox.max.y - pointCoudBox.min.y);

  var texture = THREE.ImageUtils.loadTexture( CONTEXT_BOX_TEXTURE );
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);

  var material = new THREE.MeshLambertMaterial( {side: THREE.FrontSide, map: texture} );
  sceneBoundingBox = new THREE.Mesh( geometry, material );
  sceneBoundingBox.translateZ(pointCoudBox.min.z);
  sceneBoundingBox.updateMatrix();

  sceneBoundingBox.matrixAutoUpdate = false;
  sceneBoundingBox.updateMatrix = false;
  sceneBoundingBox.rotationAutoUpdate = false;

  scene.add( sceneBoundingBox );
}

function createTrajectory() {
  for (var trajNum = 0; trajNum < camera_poses.length; trajNum++) {
    var traj_geo = new THREE.Geometry();
    var width = 0.4;
    var trajPoint1 = new THREE.Vector3(0, -width/2, 0);
    var trajPoint2 = new THREE.Vector3(0,  width/2, 0);
    var lastSurfaceNormal = new THREE.Vector3(0, 0, 0);
    var texturePosition = 0.0;
    
    traj_geo.faceVertexUvs[0] = [];
    
    // Set up camera_poses geometry
    for ( var i = 0; i < camera_poses[trajNum].length; i+=16) {
      var currentIndex = 2 * (i/16);
      var currentPoint = new THREE.Vector3(camera_poses[trajNum][i + 13], camera_poses[trajNum][i + 14], camera_poses[trajNum][i + 15]);
      var currentQuat = new THREE.Quaternion(camera_poses[trajNum][i], camera_poses[trajNum][i+1], camera_poses[trajNum][i+2], camera_poses[trajNum][i+3]);
      var previousPoint = new THREE.Vector3(camera_poses[trajNum][i + 13 - 16], camera_poses[trajNum][i + 14 - 16], camera_poses[trajNum][i + 15 - 16]);
      var previousQuat = new THREE.Quaternion(camera_poses[trajNum][i - 16], camera_poses[trajNum][i+1 - 16], camera_poses[trajNum][i+2 - 16], camera_poses[trajNum][i+3 - 16]);
      
      var point1 = currentPoint.clone();
      var point2 = currentPoint.clone();
      
      var distance = currentPoint.distanceTo(previousPoint);
      
      if (i == 0) {
        // Just create and add the initial points
        var rotatedTrajPoint1 = trajPoint1.clone();
        var rotatedTrajPoint2 = trajPoint2.clone();
        
        rotatedTrajPoint1.applyQuaternion(currentQuat);
        rotatedTrajPoint2.applyQuaternion(currentQuat);
        
        point1.add(rotatedTrajPoint1);
        point2.add(rotatedTrajPoint2);
        
        traj_geo.vertices.push(point1, point2);
        continue;
      }
      
      var currentIteration = 1.0;
      var remainingDistance = distance;
      while (currentIteration - texturePosition < distance) {
        var newPoint = previousPoint.lerp(currentPoint, (currentIteration - texturePosition)/distance);
        var newQuat = previousQuat.slerp(currentQuat, (currentIteration - texturePosition)/distance);
        
        var newPoint1 = newPoint.clone();
        var newPoint2 = newPoint.clone();
        var rotatedTrajPoint1 = trajPoint1.clone();
        var rotatedTrajPoint2 = trajPoint2.clone();
        
        rotatedTrajPoint1.applyQuaternion(newQuat);
        rotatedTrajPoint2.applyQuaternion(newQuat);
        newPoint1.add(rotatedTrajPoint1);
        newPoint2.add(rotatedTrajPoint2);
        
        traj_geo.vertices.push(newPoint1, newPoint2);
        
        var pointCount = traj_geo.vertices.length - 1;
          
        var normal = new THREE.Vector3();
        normal.subVectors(traj_geo.vertices[pointCount], traj_geo.vertices[pointCount - 3]);
        normal.cross(new THREE.Vector3().subVectors(traj_geo.vertices[pointCount - 1], traj_geo.vertices[pointCount - 2]));
        normal.normalize();
        
        var face1 = new THREE.Face3(pointCount - 2, pointCount, pointCount - 3, normal);
        var face2 = new THREE.Face3(pointCount - 3, pointCount, pointCount - 1, normal);
        traj_geo.faces.push(face1, face2);
        
        var currentTexturePosition = 1.0;
        var previousTexturePosition = texturePosition;
        var uv1 = new THREE.Vector2(0, previousTexturePosition);
        var uv2 = new THREE.Vector2(1, previousTexturePosition);
        var uv3 = new THREE.Vector2(0, currentTexturePosition);
        var uv4 = new THREE.Vector2(1, currentTexturePosition);
        
        traj_geo.faceVertexUvs[0].push([uv2, uv4, uv1]);
        traj_geo.faceVertexUvs[0].push([uv1, uv4, uv3]);
        
        remainingDistance -= (1.0 - texturePosition);
        currentIteration++;
        texturePosition = 0.0;
        previousPoint = newPoint.clone();
        previousQuat = newQuat.clone();
      }
      
      var newPoint1 = currentPoint.clone();
      var newPoint2 = currentPoint.clone();
      var rotatedTrajPoint1 = trajPoint1.clone();
      var rotatedTrajPoint2 = trajPoint2.clone();
      
      rotatedTrajPoint1.applyQuaternion(currentQuat);
      rotatedTrajPoint2.applyQuaternion(currentQuat);
      newPoint1.add(rotatedTrajPoint1);
      newPoint2.add(rotatedTrajPoint2);
      
      traj_geo.vertices.push(newPoint1, newPoint2);
      
      var pointCount = traj_geo.vertices.length - 1;
      
      var normal = new THREE.Vector3();
      normal.subVectors(traj_geo.vertices[pointCount], traj_geo.vertices[pointCount - 3]);
      normal.cross(new THREE.Vector3().subVectors(traj_geo.vertices[pointCount - 1], traj_geo.vertices[pointCount - 2]));
      normal.normalize();
      
      var face1 = new THREE.Face3(pointCount - 2, pointCount, pointCount - 3, normal);
      var face2 = new THREE.Face3(pointCount - 3, pointCount, pointCount - 1, normal);
      traj_geo.faces.push(face1, face2);
      
      var oldTexturePosition = texturePosition;
      texturePosition += remainingDistance;
      
      var currentTexturePosition = texturePosition;
      var previousTexturePosition = oldTexturePosition;
      var uv1 = new THREE.Vector2(0, previousTexturePosition);
      var uv2 = new THREE.Vector2(1, previousTexturePosition);
      var uv3 = new THREE.Vector2(0, currentTexturePosition);
      var uv4 = new THREE.Vector2(1, currentTexturePosition);
      
      traj_geo.faceVertexUvs[0].push([uv2, uv4, uv1]);
      traj_geo.faceVertexUvs[0].push([uv1, uv4, uv3]);
    }
    // sceneTranslationVector = traj_geo.center();

    // material
    var texture = THREE.ImageUtils.loadTexture(CHEVRON_TEXTURE[trajNum]);
    var material = new THREE.MeshLambertMaterial({map: texture});
    material.side = THREE.DoubleSide;

    // camera_poses
    traj_geo.computeVertexNormals();
    var geometry = new THREE.BufferGeometry();
    geometry.fromGeometry(traj_geo);
    trajectory_drawing[trajNum] = new THREE.Mesh(geometry, material);
    
    trajectory_drawing[trajNum].translateX(sceneTranslationVector.x);
    trajectory_drawing[trajNum].translateY(sceneTranslationVector.y);
    trajectory_drawing[trajNum].translateZ(sceneTranslationVector.z);
    trajectory_drawing[trajNum].updateMatrix();
    
    trajectory_drawing[trajNum].matrixAutoUpdate = false;
    trajectory_drawing[trajNum].updateMatrix = false;
    trajectory_drawing[trajNum].rotationAutoUpdate = false;

    scene.add(trajectory_drawing[trajNum]);
    
    // Create the shadow
    var shadowMaterial = new THREE.MeshBasicMaterial({color: 0x555555});
    shadow[trajNum] = new THREE.Mesh(geometry, shadowMaterial);
    
    var scaleMatrix = new THREE.Matrix4();
    scaleMatrix.makeScale(1, 1, 0.001);
    shadow[trajNum].applyMatrix(scaleMatrix);
    
    point_cloud_geo.computeBoundingBox();
    point_cloud_geo.computeBoundingSphere();
    var pointCoudBox = point_cloud_geo.boundingBox;
    
    shadow[trajNum].translateX(sceneTranslationVector.x);
    shadow[trajNum].translateY(sceneTranslationVector.y);
    shadow[trajNum].translateZ(0.001 + pointCoudBox.min.z);
    shadow[trajNum].updateMatrix();
    
    shadow[trajNum].matrixAutoUpdate = false;
    shadow[trajNum].updateMatrix = false;
    shadow[trajNum].rotationAutoUpdate = false;
    
    scene.add(shadow[trajNum]);
  }
}

function createPoses () {
  for (var trajNum = 0; trajNum < camera_poses.length; trajNum++) {
    var totalPoses = camera_poses[trajNum].length/16;
    var scene_coord_rotation = new THREE.Quaternion();
    scene_coord_rotation.setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), Math.PI /2 );
    for ( var i = 0; i < totalPoses; i++) {
      // Add the core of the object
      var camera_array_index = i * 16;
      var image_num = i * intervalBetweenPoses + startingImageId[trajNum];
      var sphereGeometry = new THREE.SphereGeometry( 0.1 );
      var material = new THREE.MeshLambertMaterial( { color: 0x000000, transparent: true } );
      var centerPose = new THREE.Mesh( sphereGeometry, material );
      centerPose.poseIndex = cameraPoses.length; 
      centerPose.imagefile = IMAGE_DIRECTORY[trajNum] + GetImageFile(image_num.toString());
      centerPose.imageTexture = null;
      // centerPose.poseError = fake_pose_error[centerPose.poseIndex]; // just for testing purposes
      centerPose.poseError = [0.8, 0.5, 1.4, 0.7, 0.2, 1.3];
      // centerPose.imageTexture = THREE.ImageUtils.loadTexture( centerPose.imagefile );
      centerPose.position.set(camera_poses[trajNum][camera_array_index + 13] + sceneTranslationVector.x, 
                              camera_poses[trajNum][camera_array_index + 14] + sceneTranslationVector.y, 
                              camera_poses[trajNum][camera_array_index + 15] + sceneTranslationVector.z);
      centerPose.quaternion.set(camera_poses[trajNum][camera_array_index], 
                                camera_poses[trajNum][camera_array_index + 1], 
                                camera_poses[trajNum][camera_array_index + 2], 
                                camera_poses[trajNum][camera_array_index + 3] )
      centerPose.quaternion.multiply(scene_coord_rotation);
      cameraPoses.push(centerPose);
      scene.add(centerPose);
    }
  }

  CURRENT_POSE_OBJECT = new THREE.Object3D();
  var radius = 1.0;

  var rollEllipse = new THREE.EllipseCurve( 0,  0, radius, radius, 0,  2 * Math.PI, false);
  var pitchEllipse = new THREE.EllipseCurve( 0,  0, radius, radius, 0,  2 * Math.PI, false);
  var yawEllipse = new THREE.EllipseCurve( 0,  0, radius, radius, 0,  2 * Math.PI, false);

  var verticesInEllipse = 100;
  var path = new THREE.Path( rollEllipse.getPoints(verticesInEllipse) );
  var geometry = path.createPointsGeometry( verticesInEllipse );
  var material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
  var roll_orbital = new THREE.Line( geometry, material );
  CURRENT_POSE_OBJECT.add(roll_orbital);
  var path = new THREE.Path( pitchEllipse.getPoints(verticesInEllipse) );
  var geometry = path.createPointsGeometry( verticesInEllipse );
  var material = new THREE.LineBasicMaterial( { color: 0xff0000 } );
  var pitch_orbital = new THREE.Line( geometry, material );
  pitch_orbital.rotation.x = Math.PI / 2.0;
  CURRENT_POSE_OBJECT.add(pitch_orbital);
  var path = new THREE.Path( yawEllipse.getPoints(verticesInEllipse) );
  var geometry = path.createPointsGeometry( verticesInEllipse );
  var material = new THREE.LineBasicMaterial( { color: 0x00ff00 } );
  var yaw_orbital = new THREE.Line( geometry, material );
  yaw_orbital.rotation.y = Math.PI / 2.0;
  CURRENT_POSE_OBJECT.add(yaw_orbital);  

  // Add axis to pose
  // x-axis
  material = new THREE.LineBasicMaterial({
    color: 0x00ff00,
    linewidth: 1.6
  });
  geometry = new THREE.Geometry();
  geometry.vertices.push(
    new THREE.Vector3( 0, 0, 0 ),
    new THREE.Vector3( radius, 0, 0 )
  );
  line = new THREE.Line( geometry, material );
  CURRENT_POSE_OBJECT.add( line );
  // y-axis
  material = new THREE.LineBasicMaterial({
    color: 0xff0000,
    linewidth: 1.6
  });
  geometry = new THREE.Geometry();
  geometry.vertices.push(
    new THREE.Vector3( 0, 0, 0 ),
    new THREE.Vector3( 0, radius, 0 )
  );
  line = new THREE.Line( geometry, material );
  CURRENT_POSE_OBJECT.add( line );
  // z-axis
  var material = new THREE.LineBasicMaterial({
    color: 0x0000ff,
    linewidth: 1.6
  });
  var geometry = new THREE.Geometry();
  geometry.vertices.push(
    new THREE.Vector3( 0, 0, 0 ),
    new THREE.Vector3( 0, 0, radius )
  );
  var line = new THREE.Line( geometry, material );
  CURRENT_POSE_OBJECT.add( line );

  material = new THREE.MeshLambertMaterial( { color: 0x000088, opacity: 0.25, trasparent: true, wireframe: true } );
  geometry = new THREE.SphereGeometry( radius );
  var shell = new THREE.Mesh( geometry, material );
  CURRENT_POSE_OBJECT.add(shell);
  CURRENT_POSE_OBJECT.visible = false;

  scene.add(CURRENT_POSE_OBJECT);
}

function createPointCloud() {
  // Make geometry
  // Set up camera_poses geometry
  for ( var i = 0; i < point_cloud.length; i++) {
    point_cloud_geo.vertices.push(new THREE.Vector3(point_cloud[i][0], 
                                                    point_cloud[i][1], 
                                                    point_cloud[i][2]));
  }
  sceneTranslationVector = point_cloud_geo.center();
  point_cloud_geo.dynamic = true;

  // vertex colors
  var colors = [];
  for( var i = 0; i < point_cloud_geo.vertices.length; i++ ) {
      colors[i] = new THREE.Color();
      colors[i].setRGB(point_cloud[i][3]/255.0, point_cloud[i][4]/255.0, point_cloud[i][5]/255.0);
  }
  point_cloud_geo.colors = colors;

  // material
  var material = new THREE.PointCloudMaterial( {
      size: 0.1,
      transparent: true,
      opacity: 0.4,
      vertexColors: THREE.VertexColors
  } );

  // point cloud
  pointCloud = new THREE.PointCloud( point_cloud_geo, material );
  pointCloud.autoUpdate = true;
  pointCloud.visible = false;
  pointCloud.matrixAutoUpdate = false;
  pointCloud.updateMatrix = false;
  pointCloud.rotationAutoUpdate = false;

  scene.add( pointCloud );

}

function RestorePose(centerOfPose) {
  if (CURRENT_POSE != centerOfPose) // don't change the current pose
    centerOfPose.material.color.setHex(0x000000);
}

function UpdateForNewPose (centerOfPose) {
  // Restore current pose 
  oldPose = CURRENT_POSE;
  CURRENT_POSE = centerOfPose;
  if (oldPose)
    RestorePose(oldPose);

  CURRENT_POSE.visible = true;
  CURRENT_POSE.material.color.setHex(0xffff00);

  CURRENT_POSE_OBJECT.visible = !params.FirstPerson;
  // if (oldPose)
  //   CURRENT_POSE_OBJECT.applyMatrix( new THREE.Matrix4().makeScale( CURRENT_POSE.poseError[0]/oldPose.poseError[0], 
  //                                                                 CURRENT_POSE.poseError[1]/oldPose.poseError[1], 
  //                                                                 CURRENT_POSE.poseError[2]/oldPose.poseError[2] ));
  // else 
    // CURRENT_POSE_OBJECT.applyMatrix( new THREE.Matrix4().makeScale( CURRENT_POSE.poseError[0], 
    //                                                               CURRENT_POSE.poseError[1], 
    //                                                               CURRENT_POSE.poseError[2] ));

  CURRENT_POSE_OBJECT.scale.set(CURRENT_POSE.poseError[0], CURRENT_POSE.poseError[1], CURRENT_POSE.poseError[2]);

  CURRENT_POSE_OBJECT.position.set(CURRENT_POSE.position.x, CURRENT_POSE.position.y, CURRENT_POSE.position.z);
  CURRENT_POSE_OBJECT.quaternion.set(CURRENT_POSE.quaternion.x, CURRENT_POSE.quaternion.y, 
                                     CURRENT_POSE.quaternion.z, CURRENT_POSE.quaternion.w);

  view = views["FirstPerson"];
  camera = view.camera;
  view.updateCamera( camera, scene, mouse.x, mouse.y );
  camera.updateProjectionMatrix();

  document.getElementById("currentImage").style.visibility = 'visible';
  document.getElementById("currentImage").src = CURRENT_POSE.imagefile;
  console.log(CURRENT_POSE.imagefile);

  // This doesn't really work :(
  var endIndex = Math.min(cameraPoses.length-1, CURRENT_POSE.poseIndex + 15);
  for (var i = CURRENT_POSE.poseIndex; i < endIndex; i++) { // load the next ten textures
    if (!cameraPoses[i].imageTexture)
      cameraPoses[i].imageTexture = THREE.ImageUtils.loadTexture( cameraPoses[i].imagefile );
  }

  // CURRENT_IMAGE_TEXTURE = CURRENT_POSE.imageTexture;
  // sceneBoundingBox.material.map = CURRENT_IMAGE_TEXTURE;
}

function ResetView() {
    // Camera setup
  for (var key in views) {
    var view = views[key];
    if (!view.camera) {
      camera = new THREE.PerspectiveCamera( view.fov, containerWidth / containerHeight, view.near, 1000 );
      camera.up.x = view.up[ 0 ];
      camera.up.y = view.up[ 1 ];
      camera.up.z = view.up[ 2 ];
      // camera.useQuaternion = true;
      view.camera = camera;
      view.controls = new THREE.OrbitControls( view.camera ); // Add orbital controls to FirstPerson camera
      view.controls.noKeys = true;  // So that arrow keys don't cause object to pan
      view.controls.addEventListener( 'change', render );
    } else {
      view.controls.update();
    }
    camera.position.x = view.eye[ 0 ];
    camera.position.y = view.eye[ 1 ];
    camera.position.z = view.eye[ 2 ];
    // camera.useQuaternion
    camera.lookAt(sceneBoundingBox.position);
    camera.updateProjectionMatrix();
  }
  // params.FirstPerson = false;
  // views["ThirdPerson"].controls.enabled = false;
  interactiveView = views["FirstPerson"];
  // interactiveView.controls.enabled = true;
}

// function ToggleHelpText () {
  // SHOWHELPTEXT = !SHOWHELPTEXT;
  // var helpText = document.getElementById( 'helpText' );
  // if (SHOWHELPTEXT) {
  //   helpText.style.textAlign = 'center';
  //   helpText.innerHTML = 'MOUSE to move/rotate figure | CLICK on a pose for details'
  //   helpText.innerHTML += '<br>\'c\' to toggle point cloud | SPACEBAR to Play'
  //   helpText.innerHTML += '<br>LEFT/RIGHT change the current pose | UP/DOWN to enter/exit ThirdPerson view';
  //   helpText.innerHTML += '<br>\'r\' to reset view | \'h\' to close help text';
  // } else {
  //   helpText.style.textAlign = 'center';
  //   helpText.innerHTML = 'Press \'h\' for usage details.';
  // }
  //   // helpText.innerHTML += '<br>Visualization created by Joshua Ford, Devin Lange, and John O\'Leary';
// }

function GetImageFile(id) {
  var name = id.length >= 8 ? id : new Array(8 - id.length + 1).join('0') + id;
  return name + ".jpg";
}

// Set up gui
window.onload = function() {
  var resetObj = { 'Reset View': function(){ ResetView() }};

  gui.add(resetObj,'Reset View');
  gui.add(params, 'Play');
  gui.add(params, 'FirstPerson')
  // gui.add(interactiveView.camera, 'near', 0.01, 10);

  var cloudGui = gui.addFolder("Point Cloud");
  cloudGui.add(pointCloud, 'visible').listen();
  cloudGui.add(pointCloud.material, 'size', 0, 0.3).listen();
  cloudGui.add(pointCloud.material, 'opacity', 0, 1.0).listen();
  cloudGui.open();

  var trajectoriesGui = gui.addFolder("Trajectories");
  for (var i = 0; i < NumberOfTrajectories; i++)
    trajectoriesGui.add(trajectory_drawing[i].material, 'visible');
  trajectoriesGui.open();

  var contextGUI = gui.addFolder("Plane and Shadow");
  var toggleVis = { 'Toggle Visibility': function(){ sceneBoundingBox.material.visible = !sceneBoundingBox.material.visible;
                                                      for (var i in shadow) {shadow[i].material.visible = !shadow[i].material.visible;}}};
  contextGUI.add(toggleVis, 'Toggle Visibility');

  contextGUI.open();
  // trajectoriesGui.add(trajectory_drawing[1].material, 'visible');
  // trajectoriesGui.add(trajectory_drawing[2].material, 'visible');
  // trajectoriesGui.add(trajectory_drawing[3].material, 'visible');
  // gui.close();
};
