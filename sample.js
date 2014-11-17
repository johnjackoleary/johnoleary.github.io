  // Create scene and camera
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

  // Set the renderer
  var renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );

  // Set new cam position
  camera.position.z = 5;

  // create a point light
  var pointLight = new THREE.PointLight( 0xFFFFFF );

  // set its position
  pointLight.position.x = 10;
  pointLight.position.y = 50;
  pointLight.position.z = 130;

  // add to the scene
  scene.add(pointLight);

  // start listening for keybaord input
  // controls = new THREE.OrbitControls( camera );
  // controls.addEventListener( 'change', render );

  // Make cube
  var geometry = new THREE.BoxGeometry( 1, 1, 1 );
  var material = new THREE.MeshLambertMaterial({ color: 0xCC0000 });
  var cube = new THREE.Mesh( geometry, material );
  scene.add( cube );

  // Render the scene
  render();

  function render() {
    requestAnimationFrame( render );
    // controls.update();
    renderer.render( scene, camera );

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
  }