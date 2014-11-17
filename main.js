var container, stats;

var interactiveView, scene, renderer;

var testOrbit;

var cameraRig;
var views = {
  "fullscreen": {
          left: 0,
          bottom: 0,
          width: 1.0,
          height: 1.0,
          background: new THREE.Color().setRGB( 1, 1, 1 ),
          eye: [ 0, 0, 50 ],
          up: [ 0, 0, 1 ],
          fov: 60,
          near: 1,
          controls: null,
          updateCamera: function ( camera, scene, mouseX, mouseY ) {
            // camera.position.x += mouseX * 0.05;
            // camera.position.x = Math.max( Math.min( camera.position.x, 2000 ), -2000 );
            if (CURRENT_POSE && DETAILMODE) {
              // camera.position = CURRENT_POSE.position;
              // var tempVec = new THREE.Vector3(0,0,0);
              // CURRENT_POSE.parent.localToWorld(tempVec);
              camera.position.set(CURRENT_POSE.position.x, CURRENT_POSE.position.y, CURRENT_POSE.position.z)
              var camera_array_index = CURRENT_POSE.poseIndex * 16;
              // camera.quaternion.set(camera_poses[camera_array_index], camera_poses[camera_array_index + 1], 
              //                        camera_poses[camera_array_index + 2], camera_poses[camera_array_index + 3]);
              camera.quaternion.set(CURRENT_POSE.quaternion.x, CURRENT_POSE.quaternion.y, 
                                     CURRENT_POSE.quaternion.z, CURRENT_POSE.quaternion.w);
              camera.rotateOnAxis(new THREE.Vector3(1,0,0), Math.PI)
            }
          }
        },
  "detail": { 
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

var DETAILMODE = false;
var PLAY = false;
var SHOWHELPTEXT = true;

var keyboard = new THREEx.KeyboardState();

var cameraPoses = [];
var poseObjects = [];
var mouse = { x: -Infinity, y: -Infinity }, INTERSECTED;
var CURRENT_POSE = null;
var CURRENT_POSE_OBJECT;
var CURRENT_IMAGE_TEXTURE = null;

var trajectory_drawing;
var sceneTranslationVector;
var sceneBoundingBox;

var point_cloud_json, pointCloud;
var point_cloud_geo = new THREE.Geometry();

var radiusAroundObject = 1;

var DATA_DIR         = "data/"
var POSE_DATA_FILE   = DATA_DIR + "Walter_1/state_BA.txt";
var IMAGE_DIRECTORY  = DATA_DIR + "Walter_1/tracked_images/";
var POINT_CLOUD_FILE = DATA_DIR + "Walter_1/point_cloud.txt";
var startingImageId = 10;     // Image cooresponding to first xkk pose
var intervalBetweenPoses = 5; // Number of images between xkk printouts
var CHEVRON_TEXTURE     = DATA_DIR + "Chevron.png";
var TRAIN_TEXTURE       = DATA_DIR + "train.png";
var TRACK_TEXTURE       = DATA_DIR + "track.png";
var CONTEXT_BOX_TEXTURE = DATA_DIR + "grid.png";

init();
animate();

function init() {
  container = document.getElementById( 'container' );

  // Help text
  var helpText = document.createElement( 'div' );
  helpText.id = 'helpText'
  helpText.style.position = 'absolute';
  helpText.style.top = '10px';
  helpText.style.width = '100%';
  helpText.style.fontSize = '12px';
  container.appendChild( helpText );
  ToggleHelpText();

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
  renderer.setClearColor( 0xffffff, 1 );
  renderer.setSize( window.innerWidth, window.innerHeight );
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
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    if (DETAILMODE) {
      // mouse.x *=
    }
}

function onDocumentMouseClick( event ) {
  // update the mouse variable
  updateMouse(event);

  // display nearby images
  // create a Ray with origin at the mouse position
  // and direction into the scene (views["fullscreen"].camera direction)
  var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
  var ray = new THREE.Raycaster( interactiveView.camera.position, vector.unproject(interactiveView.camera).sub( views["fullscreen"].camera.position ).normalize() );

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
  views["fullscreen"].camera.aspect = window.innerWidth / window.innerHeight;
  views["fullscreen"].camera.updateProjectionMatrix();

  views["detail"].camera.aspect = window.innerWidth / window.innerHeight;
  views["detail"].camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {
  requestAnimationFrame( animate );

  if (PLAY) {
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
  //   and direction into the scene (views["fullscreen"].camera direction)
  var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
  // projector.unprojectVector( vector, views["fullscreen"].camera );
  var ray = new THREE.Raycaster( interactiveView.camera.position, vector.unproject(interactiveView.camera).sub( interactiveView.camera.position ).normalize() );

  for (var i = 0; i < cameraPoses.length; i++) {
    if (CURRENT_POSE == cameraPoses[i]) continue;
    var distance = ray.ray.distanceToPoint(cameraPoses[i].position);
    if (distance < radiusAroundObject && !DETAILMODE ) {
      // var opacity = (1 - distance/radiusAroundObject)*(1 - distance/radiusAroundObject);
      cameraPoses[i].visible = true;
    } else {
      cameraPoses[i].visible = false;
    }
  }

  // create an array containing all objects in the scene with which the ray intersects
  var intersects = ray.intersectObjects( cameraPoses );

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
          distance = 1-(distance/farthestDistance);
          pointCloud.geometry.colors[i].setRGB(distance, distance, distance);
      }
    } else {
      farthestDistance = pointCloudRadius + cameraDistance;
      for( var i = 0; i < point_cloud_geo.vertices.length; i++ ) {
          var distance = camera.position.distanceTo(pointCloud.geometry.vertices[i]);
          distance = 1-(distance/farthestDistance);
          pointCloud.geometry.colors[i].setRGB(distance, distance, distance);
      }
    }
    // console.log(point_cloud_geo.boundingSphere);
    pointCloud.geometry.colorsNeedUpdate = true;
  }
}

function checkKeyboard() {
  if( keyboard.pressed("c") ) 
    pointCloud.visible = !pointCloud.visible;

  if ( keyboard.pressed("r") )
    ResetView();

  if (keyboard.pressed("h") )
    ToggleHelpText();

  if (keyboard.pressed("up")) {
    console.log("Entering detail mode.");
    // views["fullscreen"].camera.aspect = window.innerWidth / window.innerHeight;
    // views["fullscreen"].camera.updateProjectionMatrix();

    // views["detail"].camera.aspect = window.innerWidth / window.innerHeight;
    // views["detail"].camera.updateProjectionMatrix();
    DETAILMODE = true;
    pointCloud.material.size = 0.05
    pointCloud.material.opacity = 0.6;
    // views["fullscreen"].controls.enabled = false;
    // interactiveView = views["detail"];
    // interactiveView.controls.enabled = true;
    ResetView();  
    view = views["fullscreen"];
    camera = view.camera;
    view.updateCamera( camera, scene, mouse.x, mouse.y );
    camera.updateProjectionMatrix();
  }

  if (keyboard.pressed("down")) {
    // views["fullscreen"].camera.aspect = window.innerWidth / window.innerHeight;
    // views["fullscreen"].camera.updateProjectionMatrix();

    DETAILMODE = false;
    pointCloud.material.size = 0.2
    pointCloud.material.opacity = 0.6;

    // views["detail"].controls.enabled = false;
    // interactiveView = views["fullscreen"];
    // interactiveView.controls.enabled = true;
  }

  if (CURRENT_POSE) {
    if (keyboard.pressed("space"))
      PLAY = !PLAY

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
  // if (DETAILMODE) { 
  //   for (var key in views) {
  //     view = views[key];
  //     camera = view.camera;

  //     view.updateCamera( camera, scene, mouse.x, mouse.y );

  //     var left   = Math.floor( window.innerWidth  * view.left );
  //     var bottom = Math.floor( window.innerHeight * view.bottom );
  //     var width  = Math.floor( window.innerWidth  * view.width );
  //     var height = Math.floor( window.innerHeight * view.height );
  //     renderer.setViewport( left, bottom, width, height );
  //     renderer.setScissor( left, bottom, width, height );

  //     camera.aspect = width / height;
  //     camera.updateProjectionMatrix();
  //   }
  // } else {
  //   var left   = Math.floor( window.innerWidth  * view.left );
  //   var bottom = Math.floor( window.innerHeight * view.bottom );
  //   var width  = Math.floor( window.innerWidth  * view.width );
  //   var height = Math.floor( window.innerHeight * view.height );
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

  var texture = THREE.ImageUtils.loadTexture( CONTEXT_BOX_TEXTURE );
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);

  var material = new THREE.MeshLambertMaterial( {side: THREE.BackSide, map: texture} );
  sceneBoundingBox = new THREE.Mesh( geometry, material );
  sceneBoundingBox.matrixAutoUpdate = false;
  sceneBoundingBox.updateMatrix = false;
  sceneBoundingBox.rotationAutoUpdate = false;

  scene.add( sceneBoundingBox );
}

function createTrajectory() {
  var traj_geo = new THREE.Geometry();
  var width = 0.4;
  var trajPoint1 = new THREE.Vector3(0, -width/2, 0);
  var trajPoint2 = new THREE.Vector3(0,  width/2, 0);
  var lastSurfaceNormal = new THREE.Vector3(0, 0, 0);
  var texturePosition = 0.0;
  
  traj_geo.faceVertexUvs[0] = [];
  
  // Set up camera_poses geometry
  for ( var i = 0; i < camera_poses.length; i+=16) {
    var currentIndex = 2 * (i/16);
    var currentPoint = new THREE.Vector3(camera_poses[i + 13], camera_poses[i + 14], camera_poses[i + 15]);
    var currentQuat = new THREE.Quaternion(camera_poses[i], camera_poses[i+1], camera_poses[i+2], camera_poses[i+3]);
    var previousPoint = new THREE.Vector3(camera_poses[i + 13 - 16], camera_poses[i + 14 - 16], camera_poses[i + 15 - 16]);
    var previousQuat = new THREE.Quaternion(camera_poses[i - 16], camera_poses[i+1 - 16], camera_poses[i+2 - 16], camera_poses[i+3 - 16]);
    
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
      
      var face1 = new THREE.Face3(pointCount - 2, pointCount, pointCount - 3, new THREE.Vector3(0, 0, 1));
      var face2 = new THREE.Face3(pointCount - 3, pointCount, pointCount - 1, new THREE.Vector3(0, 0, 1));
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
    
    var face1 = new THREE.Face3(pointCount - 2, pointCount, pointCount - 3, new THREE.Vector3(0, 0, 1));
    var face2 = new THREE.Face3(pointCount - 3, pointCount, pointCount - 1, new THREE.Vector3(0, 0, 1));
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
  var texture = THREE.ImageUtils.loadTexture(CHEVRON_TEXTURE);
  var material = new THREE.MeshLambertMaterial({map: texture});
  material.side = THREE.DoubleSide;

  // camera_poses
  var geometry = new THREE.BufferGeometry();
  geometry.fromGeometry(traj_geo);
  trajectory_drawing = new THREE.Mesh(geometry, material);
  
  trajectory_drawing.translateX(sceneTranslationVector.x);
  trajectory_drawing.translateY(sceneTranslationVector.y);
  trajectory_drawing.translateZ(sceneTranslationVector.z);
  trajectory_drawing.updateMatrix();
  
  trajectory_drawing.matrixAutoUpdate = false;
  trajectory_drawing.updateMatrix = false;
  trajectory_drawing.rotationAutoUpdate = false;

  scene.add(trajectory_drawing);
  
  // Create the shadow
  var shadowMaterial = new THREE.MeshBasicMaterial({color: 0x555555});
  var shadow = new THREE.Mesh(geometry, shadowMaterial);
  
  var scaleMatrix = new THREE.Matrix4();
  scaleMatrix.makeScale(1, 1, 0.001);
  shadow.applyMatrix(scaleMatrix);
  
  point_cloud_geo.computeBoundingBox();
  point_cloud_geo.computeBoundingSphere();
  var pointCoudBox = point_cloud_geo.boundingBox;
  
  shadow.translateX(sceneTranslationVector.x);
  shadow.translateY(sceneTranslationVector.y);
  shadow.translateZ(0.001 + pointCoudBox.min.z);
  shadow.updateMatrix();
  
  shadow.matrixAutoUpdate = false;
  shadow.updateMatrix = false;
  shadow.rotationAutoUpdate = false;
  
  scene.add(shadow);
}

function createPoses () {
  var totalPoses = camera_poses.length/16;
  var scene_coord_rotation = new THREE.Quaternion();
  scene_coord_rotation.setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), Math.PI /2 );
  for ( var i = 0; i < totalPoses; i++) {
    // Add the core of the object
    var camera_array_index = i * 16;
    var image_num = i * intervalBetweenPoses + startingImageId;
    var sphereGeometry = new THREE.SphereGeometry( 0.1 );
    var material = new THREE.MeshLambertMaterial( { color: 0x000000, transparent: false } );
    var centerPose = new THREE.Mesh( sphereGeometry, material );
    centerPose.poseIndex = i; 
    centerPose.imagefile = IMAGE_DIRECTORY + GetImageFile(image_num.toString());
    centerPose.imageTexture = null;
    // centerPose.imageTexture = THREE.ImageUtils.loadTexture( centerPose.imagefile );
    centerPose.position.set(camera_poses[camera_array_index + 13] + sceneTranslationVector.x, 
                            camera_poses[camera_array_index + 14] + sceneTranslationVector.y, 
                            camera_poses[camera_array_index + 15] + sceneTranslationVector.z);
    centerPose.quaternion.set(camera_poses[camera_array_index], 
                              camera_poses[camera_array_index + 1], 
                              camera_poses[camera_array_index + 2], 
                              camera_poses[camera_array_index + 3] )
    centerPose.quaternion.multiply(scene_coord_rotation);
    cameraPoses.push(centerPose);
    scene.add(centerPose);
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
  // CURRENT_POSE_OBJECT.add(roll_orbital);
  var path = new THREE.Path( pitchEllipse.getPoints(verticesInEllipse) );
  var geometry = path.createPointsGeometry( verticesInEllipse );
  var material = new THREE.LineBasicMaterial( { color: 0xff0000 } );
  var pitch_orbital = new THREE.Line( geometry, material );
  pitch_orbital.rotation.x = Math.PI / 2.0;
  // CURRENT_POSE_OBJECT.add(pitch_orbital);
  var path = new THREE.Path( yawEllipse.getPoints(verticesInEllipse) );
  var geometry = path.createPointsGeometry( verticesInEllipse );
  var material = new THREE.LineBasicMaterial( { color: 0x00ff00 } );
  var yaw_orbital = new THREE.Line( geometry, material );
  yaw_orbital.rotation.y = Math.PI / 2.0;
  // CURRENT_POSE_OBJECT.add(yaw_orbital);  

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

  material = new THREE.MeshLambertMaterial( { color: 0x000088, opacity: 0.5, trasparent: true, wireframe: true } );
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
      size: 0.2,
      transparent: true,
      opacity: 0.6,
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
  pose = CURRENT_POSE;
  CURRENT_POSE = centerOfPose;
  if (pose)
    RestorePose(pose);

  CURRENT_POSE.visible = true;
  CURRENT_POSE.material.color.setHex(0xffff00);

  CURRENT_POSE_OBJECT.visible = true;
  CURRENT_POSE_OBJECT.position.set(CURRENT_POSE.position.x, CURRENT_POSE.position.y, CURRENT_POSE.position.z);
  CURRENT_POSE_OBJECT.quaternion.set(CURRENT_POSE.quaternion.x, CURRENT_POSE.quaternion.y, 
                                     CURRENT_POSE.quaternion.z, CURRENT_POSE.quaternion.w)


  view = views["fullscreen"];
  camera = view.camera;
  view.updateCamera( camera, scene, mouse.x, mouse.y );
  camera.updateProjectionMatrix();

  document.getElementById("currentImage").style.visibility = 'visible';
  document.getElementById("currentImage").src = CURRENT_POSE.imagefile;
  console.log(CURRENT_POSE.imagefile);

  // This doesn't really work :(
  // if (!CURRENT_POSE.imageTexture)
  //   CURRENT_POSE.imageTexture = THREE.ImageUtils.loadTexture( CURRENT_POSE.imagefile );

  // CURRENT_IMAGE_TEXTURE = CURRENT_POSE.imageTexture;
  // sceneBoundingBox.material.map = CURRENT_IMAGE_TEXTURE;
}

function ResetView() {
    // Camera setup
  for (var key in views) {
    var view = views[key];
    if (!view.camera) {
      camera = new THREE.PerspectiveCamera( view.fov, window.innerWidth / window.innerHeight, view.near, 1000 );
      camera.up.x = view.up[ 0 ];
      camera.up.y = view.up[ 1 ];
      camera.up.z = view.up[ 2 ];
      // camera.useQuaternion = true;
      view.camera = camera;
      view.controls = new THREE.OrbitControls( view.camera ); // Add orbital controls to fullscreen camera
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
  // DETAILMODE = false;
  // views["detail"].controls.enabled = false;
  interactiveView = views["fullscreen"];
  // interactiveView.controls.enabled = true;
}

function ToggleHelpText () {
  SHOWHELPTEXT = !SHOWHELPTEXT;
  var helpText = document.getElementById( 'helpText' );
  if (SHOWHELPTEXT) {
    helpText.style.textAlign = 'center';
    helpText.innerHTML = 'MOUSE to move/rotate figure | CLICK on a pose for details'
    helpText.innerHTML += '<br>\'c\' to toggle point cloud | SPACEBAR to play'
    helpText.innerHTML += '<br>LEFT/RIGHT change the current pose | UP/DOWN to enter/exit detail view';
    helpText.innerHTML += '<br>\'r\' to reset view | \'h\' to toggle help text';
  } else {
    helpText.style.textAlign = 'center';
    helpText.innerHTML = 'Press \'h\' for more info.';
  }
}

function GetImageFile(id) {
  var name = id.length >= 8 ? id : new Array(8 - id.length + 1).join('0') + id;
  return name + ".jpg";
}
function PoseObject(poseIndex) {
  // // if (!sceneTranslationVector) {
  // //   console.error("Please make sure that sceneTranslationVector is set.");
  // // }

  // var camera_index = poseIndex * 16;
  // this.position = null;
  // // new THREE.Vector3(camera_poses[camera_index + 13] + sceneTranslationVector.x, 
  // //                                   camera_poses[camera_index + 14] + sceneTranslationVector.y, 
  // //                                   camera_poses[camera_index + 15] + sceneTranslationVector.z);
  // // this.quaternion = new THREE.Quaternion(camera_poses[camera_index], camera_poses[camera_index+1], camera_poses[camera_index+2], camera_poses[camera_index+3]);
  // this.Object3D = new THREE.Object3D();
  // // this.poseError = pose_error[poseIndex];
  // // this.rollEllipse = new THREE.EllipseCurve( 0,  0, this.poseError[0]/2.0, this.poseError[1]/2.0, 0,  2 * Math.PI, false);
  // // this.pitchEllipse = new THREE.EllipseCurve( 0,  0, this.poseError[0]/2.0, this.poseError[2]/2.0, 0,  2 * Math.PI, false);
  // // this.yawEllipse = new THREE.EllipseCurve( 0,  0, this.poseError[2]/2.0, this.poseError[1]/2.0, 0,  2 * Math.PI, false);
  // // this.Object3D.name = poseIndex.toString();

  // // Add the core of the object
  // var sphereGeometry = new THREE.SphereGeometry( 0.1 );
  // var material = new THREE.MeshLambertMaterial( { color: 0xffff00 } );
  // var centerPose = new THREE.Mesh( sphereGeometry, material );
  // centerPose.visible = false;
  // centerPose.poseIndex = poseIndex; 
  // // centerPose.instance = this; // so centerPose has an index to this object
  // // this.Object3D.add(centerPose);

  // var verticesInEllipse = 100;
  // var path = new THREE.Path( this.rollEllipse.getPoints(verticesInEllipse) );
  // var geometry = path.createPointsGeometry( verticesInEllipse );
  // var material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
  // var roll_orbital = new THREE.Line( geometry, material );
  // this.Object3D.add(roll_orbital);
  // var path = new THREE.Path( this.pitchEllipse.getPoints(verticesInEllipse) );
  // var geometry = path.createPointsGeometry( verticesInEllipse );
  // var material = new THREE.LineBasicMaterial( { color: 0xff0000 } );
  // var pitch_orbital = new THREE.Line( geometry, material );
  // pitch_orbital.rotation.x = Math.PI / 2.0;
  // this.Object3D.add(pitch_orbital);
  // var path = new THREE.Path( this.yawEllipse.getPoints(verticesInEllipse) );
  // var geometry = path.createPointsGeometry( verticesInEllipse );
  // var material = new THREE.LineBasicMaterial( { color: 0x00ff00 } );
  // var yaw_orbital = new THREE.Line( geometry, material );
  // yaw_orbital.rotation.y = Math.PI / 2.0;
  // this.Object3D.add(yaw_orbital);  

  // // Add axis to pose
  // // x-axis
  // material = new THREE.LineBasicMaterial({
  //   color: 0x00ff00,
  //   linewidth: 1.6
  // });
  // geometry = new THREE.Geometry();
  // geometry.vertices.push(
  //   new THREE.Vector3( 0, 0, 0 ),
  //   new THREE.Vector3( this.poseError[0], 0, 0 )
  // );
  // line = new THREE.Line( geometry, material );
  // this.Object3D.add( line );
  // // y-axis
  // material = new THREE.LineBasicMaterial({
  //   color: 0xff0000,
  //   linewidth: 1.6
  // });
  // geometry = new THREE.Geometry();
  // geometry.vertices.push(
  //   new THREE.Vector3( 0, 0, 0 ),
  //   new THREE.Vector3( 0, this.poseError[1], 0 )
  // );
  // line = new THREE.Line( geometry, material );
  // this.Object3D.add( line );
  // // z-axis
  // var material = new THREE.LineBasicMaterial({
  //   color: 0x0000ff,
  //   linewidth: 1.6
  // });
  // var geometry = new THREE.Geometry();
  // geometry.vertices.push(
  //   new THREE.Vector3( 0, 0, 0 ),
  //   new THREE.Vector3( 0, 0, this.poseError[2] )
  // );
  // var line = new THREE.Line( geometry, material );
  // this.Object3D.add( line );

  // var radius = 0.5;
  // material = new THREE.MeshLambertMaterial( { color: 0x000088, opacity: 0.5, wireframe: true } );
  // geometry = new THREE.SphereGeometry( radius );
  // geometry.applyMatrix( new THREE.Matrix4().makeScale( this.poseError[0], this.poseError[1], this.poseError[2] ));
  // var shell = new THREE.Mesh( geometry, material );
  // shell.visible = false;
  // this.Object3D.add(shell);


  // this.Object3D.position.set(camera_poses[camera_index + 13] + sceneTranslationVector.x, 
  //                         camera_poses[camera_index + 14] + sceneTranslationVector.y, 
  //                         camera_poses[camera_index + 15] + sceneTranslationVector.z);
  // this.Object3D.position += sceneTranslationVector;
  // this.Object3D.quaternion.set( camera_poses[camera_index], camera_poses[camera_index+1], camera_poses[camera_index+2], camera_poses[camera_index+3] )
  // var scene_coord_rotation = new THREE.Quaternion();
  // scene_coord_rotation.setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), Math.PI /2 );
  // this.Object3D.quaternion.multiply(scene_coord_rotation);

  // scene.add(this.Object3D);
  // cameraPoses.push(centerPose);

  // this.AnimateOrbitals = function(time) {
    
  // }

  // this.GetTexture = function() {
  //   if (this.texture)
  //     return texture;
    
  //   this.texture = THREE.ImageUtils.loadTexture( this.imagefile );
  //   texture.wrapS = THREE.RepeatWrapping;
  //   texture.wrapT = THREE.RepeatWrapping;
  // }

}